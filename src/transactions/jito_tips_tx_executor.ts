import {
  BlockhashWithExpiryBlockHeight,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import axios from "axios";
import bs58 from "bs58";
import { getConnection } from "../helpers/config";

const jito_Validators = [
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
];

const endpoints = [
  "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
];

export function getRandomValidator(): PublicKey {
  const res = jito_Validators[Math.floor(Math.random() * jito_Validators.length)];
  return new PublicKey(res);
}

export interface JitoResult {
  confirmed: boolean;
  signature: string | null;
}

/**
 * Executes and confirms a Jito bundle transaction.
 */
export async function jito_executeAndConfirm(
  transaction: VersionedTransaction | Transaction,
  payer: Keypair,
  latestBlockhash: BlockhashWithExpiryBlockHeight,
  jitofee: number
): Promise<JitoResult> {
  console.log("Executing transaction (jito)...");
  const jito_validator_wallet = getRandomValidator();
  console.log("Selected Jito Validator:", jito_validator_wallet.toBase58());

  try {
    const fee = Math.round(jitofee * LAMPORTS_PER_SOL);
    console.log(`Jito Fee: ${fee / LAMPORTS_PER_SOL} SOL`);

    const jitoFee_message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: jito_validator_wallet,
          lamports: fee,
        }),
      ],
    }).compileToV0Message();

    const jitoFee_transaction = new VersionedTransaction(jitoFee_message);
    jitoFee_transaction.sign([payer]);

    const jitoTxSignature = bs58.encode(jitoFee_transaction.signatures[0]);
    const serializedJitoFeeTransaction = bs58.encode(jitoFee_transaction.serialize());
    const serializedTransaction = bs58.encode(
      transaction instanceof VersionedTransaction
        ? transaction.serialize()
        : transaction.serialize()
    );

    const final_transaction = [serializedJitoFeeTransaction, serializedTransaction];

    const requests = endpoints.map((url) =>
      axios.post(
        url,
        { jsonrpc: "2.0", id: 1, method: "sendBundle", params: [final_transaction] },
        { timeout: 10000 }
      )
    );

    console.log("Sending tx to Jito validators...");
    const res = await Promise.all(requests.map((p) => p.catch((e) => e)));
    const success_res = res.filter((r) => !(r instanceof Error));

    if (success_res.length > 0) {
      console.log("Jito validator accepted the tx");
      return await jito_confirm(jitoTxSignature, latestBlockhash);
    } else {
      console.log("No Jito validators accepted the tx");
      return { confirmed: false, signature: jitoTxSignature };
    }
  } catch (e) {
    if (e instanceof axios.AxiosError) {
      console.log("Failed to execute the jito transaction");
    } else {
      console.log("Error during jito transaction execution:", e);
    }
    return { confirmed: false, signature: null };
  }
}

/**
 * Confirms a transaction on the Solana blockchain.
 */
export async function jito_confirm(
  signature: string,
  latestBlockhash: BlockhashWithExpiryBlockHeight
): Promise<JitoResult> {
  console.log("Confirming the jito transaction...");
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
