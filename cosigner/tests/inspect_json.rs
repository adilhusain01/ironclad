//! `inspect --json` is what a wallet front end (zshield-mcp's Ironclad mode)
//! reads before it asks the co-signer to sign: the payments, fee and expiry the
//! checks found, in whole zatoshis, plus the sighash and spend count. It must
//! carry the checked numbers exactly, never a reparse of the display lines.

mod common;

use common::*;
use ironclad_cosigner::{check, keys, pczt_io, report};
use orchard::keys::{FullViewingKey, Scope, SpendingKey};
use zcash_protocol::consensus::NetworkType;

fn group() -> FullViewingKey {
    FullViewingKey::from(&SpendingKey::from_bytes([7; 32]).unwrap())
}

#[test]
fn inspect_json_carries_the_checked_payment_fee_and_sighash() {
    let pczt = build(&group(), honest(&group(), text_memo("invoice 42")));
    let checked = check::analyze(&pczt, &group(), NetworkType::Main).unwrap();
    let json = report::inspect_json(&pczt, &checked).unwrap();

    let paid = keys::encode_address(&stranger().address_at(0u32, Scope::External), NetworkType::Main).unwrap();
    let payments = json["payments"].as_array().unwrap();
    assert_eq!(payments.len(), 1, "{json}");
    assert_eq!(payments[0]["address"], paid.as_str());
    assert_eq!(payments[0]["zat"].as_u64(), Some(PAYMENT));
    assert_eq!(json["fee_zat"].as_u64(), Some(fee(2)));
    assert_eq!(json["spent_zat"].as_u64(), Some(SPEND));
    assert_eq!(json["change_zat"].as_u64(), Some(SPEND - PAYMENT - fee(2)));
    assert_eq!(json["expiry_height"].as_u64(), Some(u64::from(checked.expiry_height)));
    assert_eq!(json["sighash"], hex::encode(pczt_io::sighash(&pczt).unwrap()).as_str());
    assert_eq!(json["spends_to_sign"].as_u64(), Some(pczt_io::spends_to_sign(&pczt).unwrap().len() as u64));
    assert_eq!(json["warnings"].as_array().unwrap().len(), checked.warnings.len());
}
