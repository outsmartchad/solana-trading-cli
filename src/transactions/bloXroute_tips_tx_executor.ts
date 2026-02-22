import { bloXRoute_auth_header, bloXroute_fee } from "../helpers/config";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import base58 from "bs58";

const TRADER_API_TIP_WALLET = "HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY";
const ENDPOINT = "http://uk.solana.dex.blxrbdn.com";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function createMemoInstruction(msg: string): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(msg, "utf-8"),
  });
}

export async function CreateTraderAPITipTransaction(
  senderAddress: PublicKey,
  tipAmountInLamports: number
): Promise<Transaction> {
  const tipAddress = new PublicKey(TRADER_API_TIP_WALLET);
  return new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderAddress,
      toPubkey: tipAddress,
      lamports: tipAmountInLamports,
    })
  );
}

export async function bloXroute_executeAndConfirm(
  transaction: Transaction,
  signers: Keypair[]
): Promise<void> {
  if (!bloXRoute_auth_header) {
    throw new Error("BLOXROUTE_AUTH_HEADER not set. Configure via 'outsmart init' or .env");
  }

  const memo = createMemoInstruction("Powered by bloXroute Trader Api");

  const privateKey = process.env.PRIVATE_KEY || "";
  const wallet = Keypair.fromSecretKey(base58.decode(privateKey));

  // Get blockhash from bloXroute API
  const bhResp = await fetch(`${ENDPOINT}/api/v2/system/blockhash`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": bloXRoute_auth_header,
    },
  });
  if (!bhResp.ok) throw new Error(`bloXroute blockhash failed: ${bhResp.status}`);
  const bhData = await bhResp.json() as { blockHash?: string };
  if (!bhData.blockHash) throw new Error("No blockHash in bloXroute response");

  const fee = Math.round(bloXroute_fee * LAMPORTS_PER_SOL);
  let tx = new Transaction({
    recentBlockhash: bhData.blockHash,
    feePayer: wallet.publicKey,
  });

  tx.add(transaction);
  tx.add(memo);
  tx.add(await CreateTraderAPITipTransaction(wallet.publicKey, fee));
  tx.sign(wallet);

  const serializeTxBytes = tx.serialize();
  const buffTx = Buffer.from(serializeTxBytes);
  const encodedTx = buffTx.toString("base64");
  console.log("Submitting transaction to bloXroute...");

  try {
    const resp = await fetch(`${ENDPOINT}/api/v2/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": bloXRoute_auth_header,
      },
      body: JSON.stringify({
        transaction: { content: encodedTx, isCleanup: false },
        skipPreFlight: false,
        frontRunningProtection: false,
        useStakedRPCs: true,
      }),
    });
    if (!resp.ok) throw new Error(`bloXroute submit failed: ${resp.status}`);
    const response = await resp.json() as { signature?: string };

    if (response.signature) {
      console.log(`txn landed successfully\nSignature: https://solscan.io/tx/${response.signature}`);
    } else {
      console.log("Transaction failed");
    }
  } catch (e: any) {
    console.error("bloXroute submission error:", e?.message || e);
  }
}
