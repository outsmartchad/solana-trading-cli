/**
 * Vendored from @percolator/core — ATA helpers.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getAccount,
  Account,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export function getAtaSync(
  owner: PublicKey,
  mint: PublicKey,
  tokenProgramId: PublicKey = TOKEN_PROGRAM_ID,
): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, false, tokenProgramId);
}

export async function fetchTokenAccount(
  connection: Connection,
  address: PublicKey,
  tokenProgramId: PublicKey = TOKEN_PROGRAM_ID,
): Promise<Account> {
  return getAccount(connection, address, undefined, tokenProgramId);
}
