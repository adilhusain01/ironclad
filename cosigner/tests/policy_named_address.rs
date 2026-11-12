//! The allow-list must judge the receiver that is paid, never the address the
//! transaction names for display.
//!
//! frost-zec shows the `user_address` a PCZT names once it has checked that
//! the address holds the paid Ironwood receiver. Its other receivers are not
//! checked against anything. The policy matches addresses that share a
//! receiver, so if it read the named address, a coordinator could pair its
//! own Ironwood receiver with a trusted recipient's Sapling receiver and pass
//! the allow-list while the money goes to itself.

mod common;

use common::*;
use ironclad_cosigner::check;
use ironclad_cosigner::policy::{self, Ledger, Policy, Recipient};
use orchard::keys::{FullViewingKey, Scope, SpendingKey};
use pczt::Pczt;
use pczt::roles::updater::Updater;
use zcash_address::unified::{self, Encoding};
use zcash_protocol::consensus::NetworkType;
use zcash_protocol::memo::MemoBytes;

fn group() -> FullViewingKey {
    FullViewingKey::from(&SpendingKey::from_bytes([7; 32]).unwrap())
}

/// The Sapling receiver of the trusted recipient's real address.
const TRUSTED_SAPLING: [u8; 43] = [9; 43];

fn ua(orchard: &orchard::Address, sapling: Option<[u8; 43]>) -> String {
    let mut items = vec![unified::Uitem::Data(unified::Receiver::Orchard(orchard.to_raw_address_bytes()))];
    if let Some(sapling) = sapling {
        items.push(unified::Uitem::Data(unified::Receiver::Sapling(sapling)));
    }
    unified::Address::try_from_items(unified::Revision::R0, items).unwrap().encode(&NetworkType::Main)
}

fn policy_allowing(address: String) -> Policy {
    Policy {
        version: 1,
        name: "test".into(),
        network: "main".into(),
        per_payment_cap_zat: 100_000_000,
        daily_budget_zat: 100_000_000,
        allowed_recipients: vec![Recipient { label: "trusted".into(), address }],
        max_fee_zat: 100_000,
        expires: "2099-01-01T00:00:00Z".into(),
    }
}

fn empty_ledger() -> Ledger {
    Ledger::open("/nonexistent/ironclad-test-ledger.jsonl").unwrap()
}

/// Writes `address` as the `user_address` of every output.
fn named(pczt: Pczt, address: &str) -> Pczt {
    let mut count = 0;
    pczt::roles::low_level_signer::Signer::new(pczt.clone())
        .sign_ironwood_with(|_, bundle, _| -> Result<(), ironclad_cosigner::pczt_io::TxError> {
            count = bundle.actions().len();
            Ok(())
        })
        .unwrap();
    let mut labelled = pczt;
    for index in 0..count {
        labelled = Updater::new(labelled)
            .update_ironwood_with(|mut bundle| {
                bundle.update_action_with(index, |mut action| {
                    action.set_output_user_address(address.into());
                    Ok(())
                })
            })
            .unwrap()
            .finish();
    }
    labelled
}

#[test]
fn a_named_address_borrowing_a_trusted_receiver_does_not_pass_the_allow_list() {
    // The honest test transaction pays the stranger's address 0. The trusted
    // recipient is someone else: the stranger's address 5, with a Sapling
    // receiver as most wallet addresses have.
    let trusted = ua(&stranger().address_at(5u32, Scope::External), Some(TRUSTED_SAPLING));
    let policy = policy_allowing(trusted);

    let paid = stranger().address_at(0u32, Scope::External);
    let disguised = ua(&paid, Some(TRUSTED_SAPLING));
    let pczt = named(build(&group(), honest(&group(), MemoBytes::empty())), &disguised);

    let report = check::analyze(&pczt, &group(), NetworkType::Main).unwrap();
    let verdict = policy::evaluate(&policy, &empty_ledger(), &report);
    assert!(
        verdict.as_ref().is_err_and(|r| r.contains("not on the allow-list")),
        "a payment to an untrusted Ironwood receiver passed the policy: {verdict:?}"
    );
}

#[test]
fn a_payment_to_a_trusted_recipient_named_by_its_full_address_is_allowed() {
    let paid = stranger().address_at(0u32, Scope::External);
    let full = ua(&paid, Some(TRUSTED_SAPLING));
    let policy = policy_allowing(full.clone());
    let pczt = named(build(&group(), honest(&group(), MemoBytes::empty())), &full);

    let report = check::analyze(&pczt, &group(), NetworkType::Main).unwrap();
    assert_eq!(policy::evaluate(&policy, &empty_ledger(), &report), Ok(()));
}
