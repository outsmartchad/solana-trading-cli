import {
  BlockhashWithExpiryBlockHeight,
  Keypair,
  VersionedTransaction,
  Transaction,
} from "@solana/web3.js";
import { getConnection } from "../helpers/config";

export interface SimpleResult {
  confirmed: boolean;
  signature: string;
}

/**
 * Executes a transaction and confirms it on the Solana blockchain.
 */
export async function simple_executeAndConfirm(
  transaction: VersionedTransaction | Transaction,
  payer: Keypair,
  latestBlockhash: BlockhashWithExpiryBlockHeight
): Promise<SimpleResult> {
  console.log("Executing transaction...");
  const signature = await simple_execute(transaction);
  console.log("Transaction executed. Confirming transaction...");
  return simple_confirm(signature, latestBlockhash);
}

async function simple_execute(transaction: VersionedTransaction | Transaction): Promise<string> {
  const connection = getConnection();
  return connection.sendRawTransaction(
    transaction instanceof VersionedTransaction
      ? transaction.serialize()
      : transaction.serialize(),
    {
      skipPreflight: true,
      maxRetries: 2,
    }
  );
}

async function simple_confirm(
  signature: string,
  latestBlockhash: BlockhashWithExpiryBlockHeight
): Promise<SimpleResult> {
  const connection = getConnection();
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    },
    "confirmed"
  );
  return { confirmed: !confirmation.value.err, signature };
}
