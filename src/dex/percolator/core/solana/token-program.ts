/**
 * Vendored from @percolator/core — Token program detection.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
);

export async function detectTokenProgram(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  return info.owner;
}

export function isToken2022(tokenProgramId: PublicKey): boolean {
  return tokenProgramId.equals(TOKEN_2022_PROGRAM_ID);
}
