//! Ironclad: the spending policy the co-signer enforces, and the hash-chained
//! ledger of every decision it makes.
//!
//! The policy is the human's standing instruction to their key share. The
//! co-signer refuses to contribute its signature share to any transaction
//! outside it, so an agent holding the other share cannot overspend, pay an
//! unknown address, or sign after the policy expires, whatever it is told.

use std::error::Error;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::check::Report;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Recipient {
    pub label: String,
    pub address: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Policy {
    pub version: u32,
    pub name: String,
    pub network: String,
    /// Largest single payment the co-signer will sign, in zatoshis.
    pub per_payment_cap_zat: u64,
    /// Largest total of payments signed in one UTC day, in zatoshis.
    pub daily_budget_zat: u64,
    pub allowed_recipients: Vec<Recipient>,
    /// Refuse fees above this (a lying coordinator could burn funds as fee).
    pub max_fee_zat: u64,
    /// ISO 8601 instant after which nothing is signed.
    pub expires: String,
}

impl Policy {
    pub fn load(path: &str) -> Result<Policy, Box<dyn Error>> {
        Ok(serde_json::from_str(&fs::read_to_string(path)?)?)
    }

    pub fn hash(&self) -> String {
        let bytes = serde_json::to_vec(self).unwrap_or_default();
        hex::encode(blake3::hash(&bytes).as_bytes())
    }
}

/// One line of the ledger: what was asked, what was decided, chained to the
/// previous line by its hash so a deleted or edited entry breaks the chain.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Entry {
    pub at: String,
    pub policy_hash: String,
    pub payments: Vec<(String, u64)>,
    pub fee_zat: u64,
    pub decision: String,
    pub reason: Option<String>,
    pub prev: String,
    pub hash: String,
}

pub struct Ledger {
    path: String,
    entries: Vec<Entry>,
}

impl Ledger {
    pub fn open(path: &str) -> Result<Ledger, Box<dyn Error>> {
        let mut entries = Vec::new();
        if Path::new(path).exists() {
            for line in fs::read_to_string(path)?.lines().filter(|l| !l.trim().is_empty()) {
                entries.push(serde_json::from_str::<Entry>(line)?);
            }
        }
        Ok(Ledger { path: path.to_string(), entries })
    }

    /// Verifies the chain; returns the index of the first broken entry.
    pub fn verify(&self) -> Result<(), usize> {
        let mut prev = String::from("genesis");
        for (i, e) in self.entries.iter().enumerate() {
            if e.prev != prev || e.hash != entry_hash(e) {
                return Err(i);
            }
            prev = e.hash.clone();
        }
        Ok(())
    }

    /// Zatoshis already allowed today (UTC), payments only, fees excluded.
    pub fn allowed_today_zat(&self, today: &str) -> u64 {
        self.entries
            .iter()
            .filter(|e| e.decision == "allow" && e.at.starts_with(today))
            .map(|e| e.payments.iter().map(|(_, z)| z).sum::<u64>())
            .sum()
    }

    pub fn append(&mut self, policy: &Policy, report: &Report, decision: &str, reason: Option<String>) -> Result<Entry, Box<dyn Error>> {
        let prev = self.entries.last().map(|e| e.hash.clone()).unwrap_or_else(|| "genesis".into());
        let mut entry = Entry {
            at: now_iso(),
            policy_hash: policy.hash(),
            payments: report.payments.iter().map(|p| (p.address.clone(), p.zat)).collect(),
            fee_zat: report.fee_zat,
            decision: decision.into(),
            reason,
            prev,
            hash: String::new(),
        };
        entry.hash = entry_hash(&entry);
        let mut file = OpenOptions::new().create(true).append(true).open(&self.path)?;
        writeln!(file, "{}", serde_json::to_string(&entry)?)?;
        self.entries.push(entry.clone());
        Ok(entry)
    }
}

fn entry_hash(e: &Entry) -> String {
    let body = serde_json::json!({
        "at": e.at, "policy_hash": e.policy_hash, "payments": e.payments, "fee_zat": e.fee_zat,
        "decision": e.decision, "reason": e.reason, "prev": e.prev,
    });
    hex::encode(blake3::hash(body.to_string().as_bytes()).as_bytes())
}

pub fn now_iso() -> String {
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    iso_from_unix(secs)
}

/// A small UTC formatter so the crate needs no time dependency.
pub fn iso_from_unix(secs: u64) -> String {
    let days = secs / 86400;
    let rem = secs % 86400;
    let (h, m, s) = (rem / 3600, (rem % 3600) / 60, rem % 60);
    // civil from days (Howard Hinnant's algorithm)
    let z = days as i64 + 719468;
    let era = z.div_euclid(146097);
    let doe = z.rem_euclid(146097);
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let mo = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if mo <= 2 { y + 1 } else { y };
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{m:02}:{s:02}Z")
}

/// The decision, with nothing written anywhere.
pub fn evaluate(policy: &Policy, ledger: &Ledger, report: &Report) -> Result<(), String> {
    let now = now_iso();
    if now.as_str() > policy.expires.as_str() {
        return Err(format!("policy expired at {}", policy.expires));
    }
    if report.payments.is_empty() {
        return Err("no payment to an outside address (self-sends are not covered by this policy)".into());
    }
    if report.fee_zat > policy.max_fee_zat {
        return Err(format!("fee {} zat is above the policy's {} zat", report.fee_zat, policy.max_fee_zat));
    }
    let mut total = 0u64;
    for p in &report.payments {
        let known = policy.allowed_recipients.iter().find(|r| r.address == p.address);
        let Some(known) = known else {
            return Err(format!("recipient {} is not on the allow-list", short(&p.address)));
        };
        if p.zat > policy.per_payment_cap_zat {
            return Err(format!("{} zat to {} is above the per-payment cap of {} zat", p.zat, known.label, policy.per_payment_cap_zat));
        }
        total += p.zat;
    }
    let today = &now[..10];
    let used = ledger.allowed_today_zat(today);
    if used + total > policy.daily_budget_zat {
        return Err(format!("daily budget: {} zat already allowed today, {} more would pass {} zat", used, total, policy.daily_budget_zat));
    }
    Ok(())
}

/// Evaluate and record. The ledger line is written before the signature share
/// leaves the process, so an allowed payment is always on the record.
pub fn decide(policy_path: &str, ledger_path: &str, report: &Report) -> Result<(), String> {
    let policy = Policy::load(policy_path).map_err(|e| format!("cannot load policy: {e}"))?;
    let mut ledger = Ledger::open(ledger_path).map_err(|e| format!("cannot open ledger: {e}"))?;
    if let Err(i) = ledger.verify() {
        return Err(format!("ledger chain broken at entry {i}; refusing everything until a human looks"));
    }
    let verdict = evaluate(&policy, &ledger, report);
    let (decision, reason) = match &verdict {
        Ok(()) => ("allow", None),
        Err(r) => ("refuse", Some(r.clone())),
    };
    ledger.append(&policy, report, decision, reason).map_err(|e| format!("cannot write ledger: {e}"))?;
    verdict
}

fn short(address: &str) -> String {
    if address.len() > 24 { format!("{}…{}", &address[..12], &address[address.len() - 8..]) } else { address.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::check::Payment;

    fn report(payments: Vec<(&str, u64)>, fee: u64) -> Report {
        Report {
            lines: vec![],
            warnings: vec![],
            payments: payments.into_iter().map(|(a, z)| Payment { address: a.into(), zat: z }).collect(),
            spent_zat: 0,
            change_zat: 0,
            fee_zat: fee,
            expiry_height: 0,
        }
    }

    fn policy() -> Policy {
        Policy {
            version: 1,
            name: "test".into(),
            network: "test".into(),
            per_payment_cap_zat: 20_000_000,
            daily_budget_zat: 50_000_000,
            allowed_recipients: vec![Recipient { label: "counter".into(), address: "utest1counter".into() }],
            max_fee_zat: 30_000,
            expires: "2099-01-01T00:00:00Z".into(),
        }
    }

    fn empty_ledger() -> Ledger {
        Ledger { path: "/dev/null".into(), entries: vec![] }
    }

    #[test]
    fn allows_a_payment_inside_the_policy() {
        assert!(evaluate(&policy(), &empty_ledger(), &report(vec![("utest1counter", 1_000_000)], 10_000)).is_ok());
    }

    #[test]
    fn refuses_an_unknown_recipient() {
        let err = evaluate(&policy(), &empty_ledger(), &report(vec![("utest1attacker", 1_000_000)], 10_000)).unwrap_err();
        assert!(err.contains("allow-list"), "{err}");
    }

    #[test]
    fn refuses_over_the_per_payment_cap() {
        let err = evaluate(&policy(), &empty_ledger(), &report(vec![("utest1counter", 20_000_001)], 10_000)).unwrap_err();
        assert!(err.contains("per-payment cap"), "{err}");
    }

    #[test]
    fn refuses_when_the_daily_budget_runs_out() {
        let dir = std::env::temp_dir().join(format!("ironclad-ledger-{}", std::process::id()));
        let _ = fs::remove_file(&dir);
        let mut ledger = Ledger::open(dir.to_str().unwrap()).unwrap();
        let p = policy();
        ledger.append(&p, &report(vec![("utest1counter", 20_000_000)], 10_000), "allow", None).unwrap();
        ledger.append(&p, &report(vec![("utest1counter", 20_000_000)], 10_000), "allow", None).unwrap();
        assert!(evaluate(&p, &ledger, &report(vec![("utest1counter", 10_000_000)], 10_000)).is_ok());
        let err = evaluate(&p, &ledger, &report(vec![("utest1counter", 10_000_001)], 10_000)).unwrap_err();
        assert!(err.contains("daily budget"), "{err}");
        assert!(Ledger::open(dir.to_str().unwrap()).unwrap().verify().is_ok());
    }

    #[test]
    fn refuses_an_expired_policy_and_a_high_fee() {
        let mut p = policy();
        p.expires = "2000-01-01T00:00:00Z".into();
        assert!(evaluate(&p, &empty_ledger(), &report(vec![("utest1counter", 1)], 1)).unwrap_err().contains("expired"));
        let p = policy();
        assert!(evaluate(&p, &empty_ledger(), &report(vec![("utest1counter", 1)], 40_000)).unwrap_err().contains("fee"));
    }

    #[test]
    fn a_tampered_ledger_is_detected() {
        let dir = std::env::temp_dir().join(format!("ironclad-tamper-{}", std::process::id()));
        let _ = fs::remove_file(&dir);
        let mut ledger = Ledger::open(dir.to_str().unwrap()).unwrap();
        let p = policy();
        ledger.append(&p, &report(vec![("utest1counter", 5)], 1), "allow", None).unwrap();
        ledger.append(&p, &report(vec![("utest1counter", 6)], 1), "allow", None).unwrap();
        let text = fs::read_to_string(&dir).unwrap().replace("\"decision\":\"allow\"", "\"decision\":\"refuse\"");
        fs::write(&dir, text).unwrap();
        assert_eq!(Ledger::open(dir.to_str().unwrap()).unwrap().verify(), Err(0));
    }

    #[test]
    fn iso_dates_are_right() {
        assert_eq!(iso_from_unix(0), "1970-01-01T00:00:00Z");
        assert_eq!(iso_from_unix(1_793_860_418), "2026-11-05T06:33:38Z");
    }
}
