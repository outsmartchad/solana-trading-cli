/**
 * Vendored from @percolator/core — PDA derivation for Percolator.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import { PublicKey } from "@solana/web3.js";

const textEncoder = new TextEncoder();

export function deriveVaultAuthority(
  programId: PublicKey,
  slab: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("vault"), slab.toBytes()],
    programId
  );
}

export function deriveInsuranceLpMint(
  programId: PublicKey,
  slab: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("ins_lp"), slab.toBytes()],
    programId
  );
}

export const PYTH_PUSH_ORACLE_PROGRAM_ID = new PublicKey(
  "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT"
);

/**
 * Derive the Pyth Push Oracle PDA for a given feed ID.
 * Seeds: [shard_id(u16 LE, always 0), feed_id(32 bytes)]
 * Program: pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT
 */
export function derivePythPushOraclePDA(feedIdHex: string): [PublicKey, number] {
  const feedId = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    feedId[i] = parseInt(feedIdHex.substring(i * 2, i * 2 + 2), 16);
  }
  const shardBuf = new Uint8Array(2); // shard_id = 0 (u16 LE)
  return PublicKey.findProgramAddressSync(
    [shardBuf, feedId],
    PYTH_PUSH_ORACLE_PROGRAM_ID,
  );
}

export function deriveLpPda(
  programId: PublicKey,
  slab: PublicKey,
  lpIdx: number
): [PublicKey, number] {
  const idxBuf = new Uint8Array(2);
  new DataView(idxBuf.buffer).setUint16(0, lpIdx, true);
  return PublicKey.findProgramAddressSync(
    [textEncoder.encode("lp"), slab.toBytes(), idxBuf],
    programId
  );
}
