import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

/**
 * Checks the balance of a wallet address.
 */
export async function checkBalanceByAddress(
  address: string,
  connection: Connection
): Promise<number | undefined> {
  try {
    new PublicKey(address);
  } catch (error) {
    console.error(`The provided address is invalid: ${address}`);
    return undefined;
  }

  const publicKey = new PublicKey(address);
  const balanceInLamports = await connection.getBalance(publicKey);
  const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
  console.log(`Balance for ${address}: ${balanceInSOL} SOL`);
  return balanceInSOL;
}

/**
 * Retrieves the balance of an SPL token associated with a given token account.
 */
export async function getSPLTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey,
  payerPubKey: PublicKey
): Promise<number> {
  const address = getAssociatedTokenAddressSync(tokenAccount, payerPubKey);
  const info = await connection.getTokenAccountBalance(address);
  if (info.value.uiAmount == null) throw new Error("No balance found");
  return info.value.uiAmount;
}
