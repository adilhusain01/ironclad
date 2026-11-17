//! frost-zec's shared tamper cases (`tests/fixtures/tamper/`, copied from
//! frost-zec, see SOURCE there), run through Ironclad's whole decision: the
//! PCZT checks at the case's clock, then the policy at the same clock.
//!
//! A refused PCZT must be refused by one or the other before anything is
//! signed: Ironclad's daemon has no user to compare the payment shown with the
//! one approved. (Both `payment` cases are refused by the checks themselves,
//! since frost-zec compares the address a transaction names with the one it
//! pays.) The policy here allows exactly the approved payments: their
//! recipients, a cap of the largest approved amount, and a fee ceiling high
//! enough that fee cases are judged by the checks.

use std::fs;
use std::path::{Path, PathBuf};

use ironclad_cosigner::policy::{self, Ledger, Policy, Recipient};
use ironclad_cosigner::{check, keys, pczt_io};
use serde_json::Value;

const DIR: &str = "tests/fixtures/tamper";

struct Case {
    id: String,
    value: Value,
    dir: PathBuf,
}

fn cases() -> Vec<Case> {
    let mut dirs: Vec<PathBuf> = fs::read_dir(DIR)
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.is_dir())
        .collect();
    dirs.sort();
    assert!(dirs.len() >= 17, "{} cases", dirs.len());
    dirs.into_iter()
        .map(|dir| {
            let value: Value = serde_json::from_slice(&fs::read(dir.join("case.json")).unwrap()).unwrap();
            Case { id: value["id"].as_str().unwrap().to_string(), value, dir }
        })
        .collect()
}

impl Case {
    fn policy(&self) -> Policy {
        let payments = self.value["approved"]["payments"].as_array().unwrap();
        let amounts: Vec<u64> = payments.iter().map(|p| p["amount"].as_u64().unwrap()).collect();
        Policy {
            version: 1,
            name: format!("tamper case {}", self.id),
            network: self.value["network"].as_str().unwrap().to_string(),
            per_payment_cap_zat: *amounts.iter().max().unwrap(),
            daily_budget_zat: amounts.iter().sum(),
            allowed_recipients: payments
                .iter()
                .enumerate()
                .map(|(i, p)| Recipient { label: format!("approved {i}"), address: p["address"].as_str().unwrap().to_string() })
                .collect(),
            max_fee_zat: 100_000_000,
            expires: "2099-01-01T00:00:00Z".into(),
        }
    }

    fn clock(&self) -> u64 {
        self.value["clock"].as_u64().unwrap()
    }

    /// The checks, then the policy, both at the case's clock. A refusal says
    /// which of the two refused.
    fn decide(&self, file: &str) -> Result<(), String> {
        let (_, fvk) = keys::parse_ufvk(self.value["group"]["ufvk"].as_str().unwrap()).unwrap();
        let network = match self.value["network"].as_str().unwrap() {
            "main" => zcash_protocol::consensus::NetworkType::Main,
            "test" => zcash_protocol::consensus::NetworkType::Test,
            other => panic!("{}: network {other}", self.id),
        };
        let bytes = fs::read(self.dir.join(file)).unwrap();
        let report = match pczt_io::parse(&bytes).map_err(|e| e.to_string()).and_then(|pczt| {
            check::analyze_at(&pczt, &fvk, network, self.clock()).map_err(|e| e.to_string())
        }) {
            Ok(report) => report,
            Err(e) => return Err(format!("check: {e}")),
        };
        let ledger = Ledger::open(Path::new(DIR).join("no-ledger.jsonl").to_str().unwrap()).unwrap();
        policy::evaluate_at(&self.policy(), &ledger, &report, self.clock()).map_err(|e| format!("policy: {e}"))
    }
}

#[test]
fn every_accepted_pczt_is_allowed_under_a_policy_for_its_payments() {
    for case in cases() {
        let decision = case.decide("accepted.pczt");
        assert_eq!(decision, Ok(()), "{}: the accepted PCZT is not allowed", case.id);
    }
}

#[test]
fn every_refused_pczt_is_refused() {
    for case in cases().into_iter().filter(|c| c.value.get("refused").is_some()) {
        let decision = case.decide("refused.pczt");
        assert!(decision.is_err(), "{}: the refused PCZT is allowed", case.id);
    }
}
