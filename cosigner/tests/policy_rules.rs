//! The spending policy's rules, judged on reports from frost-zec's own checks.
//!
//! frost-zec's `check::Report` can only be read outside its crate, never
//! built, so every report here comes from `check::analyze` on a real test
//! transaction: the group pays `PAYMENT` to the stranger's address 0 and pays
//! the ZIP 317 fee for two actions. Each rule is tested by setting the policy's
//! limit just above or just below those real amounts.

mod common;

use std::fs;

use common::*;
use ironclad_cosigner::check::{self, Report};
use ironclad_cosigner::policy::{self, Ledger, Policy, Recipient};
use orchard::keys::{FullViewingKey, Scope, SpendingKey};
use zcash_address::unified::{self, Encoding};
use zcash_protocol::consensus::NetworkType;
use zcash_protocol::memo::MemoBytes;

fn group() -> FullViewingKey {
    FullViewingKey::from(&SpendingKey::from_bytes([7; 32]).unwrap())
}

/// The fee the test transaction pays: one spend and two outputs make two
/// Ironwood actions.
fn fee_paid() -> u64 {
    fee(2)
}

/// The report the co-signer gets for the test transaction on `network`.
fn report(network: NetworkType) -> Report {
    check::analyze(
        &build(&group(), honest(&group(), MemoBytes::empty())),
        &group(),
        network,
    )
    .unwrap()
}

/// The stranger's address `index`, as a unified address with its one
/// Ironwood receiver.
fn stranger_at(index: u32, network: NetworkType) -> String {
    let raw = stranger()
        .address_at(index, Scope::External)
        .to_raw_address_bytes();
    unified::Address::try_from_items(
        unified::Revision::R0,
        vec![unified::Uitem::Data(unified::Receiver::Orchard(raw))],
    )
    .unwrap()
    .encode(&network)
}

/// A testnet policy that allows the test payment with room to spare.
fn policy() -> Policy {
    Policy {
        version: 1,
        name: "test".into(),
        network: "test".into(),
        per_payment_cap_zat: 2 * PAYMENT,
        daily_budget_zat: 10 * PAYMENT,
        allowed_recipients: vec![Recipient {
            label: "counter".into(),
            address: stranger_at(0, NetworkType::Test),
        }],
        max_fee_zat: 3 * fee_paid(),
        expires: "2099-01-01T00:00:00Z".into(),
    }
}

fn empty_ledger() -> Ledger {
    Ledger::open("/nonexistent/ironclad-test-ledger.jsonl").unwrap()
}

fn temp(name: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!("ironclad-{name}-{}", std::process::id()))
}

#[test]
fn the_test_transaction_pays_what_the_tests_assume() {
    let report = report(NetworkType::Test);
    let paid: Vec<(&str, u64)> = report
        .payments
        .iter()
        .map(|p| (p.address.as_str(), p.zat))
        .collect();
    assert_eq!(paid.len(), 1);
    assert!(policy::same_recipient(
        &stranger_at(0, NetworkType::Test),
        paid[0].0
    ));
    assert_eq!(paid[0].1, PAYMENT);
    assert_eq!(report.fee_zat, fee_paid());
}

#[test]
fn allows_a_payment_inside_the_policy() {
    assert!(policy::evaluate(&policy(), &empty_ledger(), &report(NetworkType::Test)).is_ok());
}

#[test]
fn refuses_an_unknown_recipient() {
    let mut p = policy();
    p.allowed_recipients = vec![Recipient {
        label: "counter".into(),
        address: stranger_at(5, NetworkType::Test),
    }];
    let err = policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test)).unwrap_err();
    assert!(err.contains("allow-list"), "{err}");
}

#[test]
fn refuses_over_the_per_payment_cap() {
    let mut p = policy();
    p.per_payment_cap_zat = PAYMENT;
    assert!(policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test)).is_ok());
    p.per_payment_cap_zat = PAYMENT - 1;
    let err = policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test)).unwrap_err();
    assert!(err.contains("per-payment cap"), "{err}");
}

#[test]
fn refuses_when_the_daily_budget_runs_out() {
    let path = temp("ledger");
    let _ = fs::remove_file(&path);
    let mut ledger = Ledger::open(path.to_str().unwrap()).unwrap();
    let mut p = policy();
    let paid = report(NetworkType::Test);
    ledger.append(&p, &paid, "allow", None).unwrap();
    ledger.append(&p, &paid, "allow", None).unwrap();
    // Two payments already allowed today; a third fits a budget of three.
    p.daily_budget_zat = 3 * PAYMENT;
    assert!(policy::evaluate(&p, &ledger, &paid).is_ok());
    p.daily_budget_zat = 3 * PAYMENT - 1;
    let err = policy::evaluate(&p, &ledger, &paid).unwrap_err();
    assert!(err.contains("daily budget"), "{err}");
    assert!(
        Ledger::open(path.to_str().unwrap())
            .unwrap()
            .verify()
            .is_ok()
    );
    let _ = fs::remove_file(path);
}

#[test]
fn refuses_an_expired_policy_and_a_high_fee() {
    let mut p = policy();
    p.expires = "2000-01-01T00:00:00Z".into();
    assert!(
        policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test))
            .unwrap_err()
            .contains("expired")
    );
    let mut p = policy();
    p.max_fee_zat = fee_paid() - 1;
    assert!(
        policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test))
            .unwrap_err()
            .contains("fee")
    );
}

/// The co-signer reads the clock once per request: the policy judges
/// expiry and the day's budget at that instant, and the ledger line
/// records it, whatever the wall clock says.
#[test]
fn decide_at_judges_and_records_the_given_instant() {
    let dir = temp("clock");
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    let (policy_path, ledger_path) = (dir.join("policy.json"), dir.join("ledger.jsonl"));
    let mut p = policy();
    p.expires = "2026-12-04T00:00:00Z".into();
    fs::write(&policy_path, serde_json::to_vec(&p).unwrap()).unwrap();
    let (policy_path, ledger_path) = (policy_path.to_str().unwrap(), ledger_path.to_str().unwrap());
    let paid = report(NetworkType::Test);
    // 2026-12-03T23:59:59Z, then 2026-12-04T00:00:01Z.
    assert_eq!(
        policy::decide_at(policy_path, ledger_path, &paid, 1_796_342_399),
        Ok(())
    );
    let late = policy::decide_at(policy_path, ledger_path, &paid, 1_796_342_401).unwrap_err();
    assert!(late.contains("expired"), "{late}");
    let lines = fs::read_to_string(ledger_path).unwrap();
    let at: Vec<String> = lines
        .lines()
        .map(|l| {
            serde_json::from_str::<serde_json::Value>(l).unwrap()["at"]
                .as_str()
                .unwrap()
                .to_string()
        })
        .collect();
    assert_eq!(at, ["2026-12-03T23:59:59Z", "2026-12-04T00:00:01Z"]);
    assert!(Ledger::open(ledger_path).unwrap().verify().is_ok());
    let _ = fs::remove_dir_all(dir);
}

/// A policy is the owner's instruction for one network: its caps are in
/// that network's coins, so it applies to nothing on another.
#[test]
fn a_testnet_policy_refuses_a_mainnet_payment_to_the_same_receiver() {
    let p = policy();
    assert_eq!(
        policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test)),
        Ok(())
    );
    let mainnet = report(NetworkType::Main);
    assert!(
        policy::same_recipient(
            &stranger_at(0, NetworkType::Test),
            &mainnet.payments[0].address
        ),
        "the same receiver bytes"
    );
    let err = policy::evaluate(&p, &empty_ledger(), &mainnet).unwrap_err();
    assert!(err.contains("network"), "{err}");
}

#[test]
fn an_allow_list_entry_for_another_network_matches_nothing() {
    let mut p = policy();
    p.allowed_recipients = vec![Recipient {
        label: "counter".into(),
        address: stranger_at(0, NetworkType::Main),
    }];
    let err = policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test)).unwrap_err();
    assert!(err.contains("allow-list"), "{err}");
}

#[test]
fn a_policy_for_an_unknown_network_refuses_everything() {
    for network in ["mainnet", "", "TEST", "regtest"] {
        let mut p = policy();
        p.network = network.into();
        let err = policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test)).unwrap_err();
        assert!(err.contains("network"), "{network:?}: {err}");
    }
}

#[test]
fn a_tampered_ledger_is_detected() {
    let path = temp("tamper");
    let _ = fs::remove_file(&path);
    let mut ledger = Ledger::open(path.to_str().unwrap()).unwrap();
    let (p, paid) = (policy(), report(NetworkType::Test));
    ledger.append(&p, &paid, "allow", None).unwrap();
    ledger.append(&p, &paid, "allow", None).unwrap();
    let text = fs::read_to_string(&path)
        .unwrap()
        .replace("\"decision\":\"allow\"", "\"decision\":\"refuse\"");
    fs::write(&path, text).unwrap();
    assert_eq!(
        Ledger::open(path.to_str().unwrap()).unwrap().verify(),
        Err(0)
    );
    let _ = fs::remove_file(path);
}

/// An expiry the co-signer cannot read must not mean "never expires".
#[test]
fn an_expiry_that_is_not_a_utc_timestamp_refuses() {
    for bad in ["never", "2099-01-01", "2099-01-01T00:00:00+05:30", ""] {
        let mut p = policy();
        p.expires = bad.into();
        let err = policy::evaluate(&p, &empty_ledger(), &report(NetworkType::Test)).unwrap_err();
        assert!(err.contains("expires"), "{bad}: {err}");
    }
}
