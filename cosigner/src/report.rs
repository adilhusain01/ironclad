//! The co-signer's checked view of a PCZT as JSON, for a wallet front end that
//! must know the fee and payments before it asks for a signature.

use std::error::Error;

use pczt::Pczt;
use serde_json::{Value, json};

use crate::check::Report;
use crate::pczt_io;

/// The payments, fee, change and expiry the checks found, in whole zatoshis,
/// with the sighash the co-signer would sign and the number of spends.
pub fn inspect_json(pczt: &Pczt, report: &Report) -> Result<Value, Box<dyn Error>> {
    Ok(json!({
        "payments": report.payments.iter().map(|p| json!({ "address": p.address, "zat": p.zat })).collect::<Vec<_>>(),
        "spent_zat": report.spent_zat,
        "change_zat": report.change_zat,
        "fee_zat": report.fee_zat,
        "expiry_height": report.expiry_height,
        "warnings": report.warnings,
        "sighash": hex::encode(pczt_io::sighash(pczt)?),
        "spends_to_sign": pczt_io::spends_to_sign(pczt)?.len(),
    }))
}
