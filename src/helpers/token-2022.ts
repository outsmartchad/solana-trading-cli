/**
 * Token-2022 Detection Utility
 *
 * Detects whether a mint uses the standard SPL Token program or Token-2022.
 * Used by multiple DEX adapters (futarchy-amm, futarchy-launchpad, dflow, etc.)
 * to correctly derive ATAs and build instructions.
 *
 * Source: 100x-algo-bots/trading-modules/futarchy-amm/utils.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

/**
 * Get the token program for a given mint (supports both SPL Token and Token-2022).
 *
 * Reads the on-chain account to check its owner program. If the mint account
 * is owned by Token-2022, returns TOKEN_2022_PROGRAM_ID; otherwise returns
 * TOKEN_PROGRAM_ID.
 *
 * @param connection - Solana RPC connection
 * @param mint - Mint public key
 * @returns TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID
 * @throws Error if the mint account is not found on-chain
 */
export async function getTokenProgram(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) {
    throw new Error(`Mint account not found: ${mint.toBase58()}`);
  }
  if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  }
  return TOKEN_PROGRAM_ID;
}

/**
 * Check if a mint uses Token-2022.
 *
 * @param connection - Solana RPC connection
 * @param mint - Mint public key
 * @returns true if the mint uses Token-2022, false otherwise
 */
export async function isToken2022(
  connection: Connection,
  mint: PublicKey,
): Promise<boolean> {
  const program = await getTokenProgram(connection, mint);
  return program.equals(TOKEN_2022_PROGRAM_ID);
}
