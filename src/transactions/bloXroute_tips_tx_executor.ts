import {
  createTraderAPIMemoInstruction,
  HttpProvider,
  MAINNET_API_UK_HTTP,
  MAINNET_API_NY_HTTP,
} from "@bloxroute/solana-trader-client-ts";
import { bloXRoute_auth_header, bloXroute_fee } from "../helpers/config";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import base58 from "bs58";

const TRADER_API_TIP_WALLET = "HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY";

// Lazy provider initialization
let _provider: HttpProvider | null = null;
function getProvider(): HttpProvider {
  if (!_provider) {
    if (!bloXRoute_auth_header) {
      throw new Error("BLOXROUTE_AUTH_HEADER not set. Configure via 'outsmart init' or .env");
    }
    const privateKey = process.env.PRIVATE_KEY || "";
    _provider = new HttpProvider(bloXRoute_auth_header, privateKey, MAINNET_API_UK_HTTP);
  }
  return _provider;
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
  const provider = getProvider();

  const memo = createTraderAPIMemoInstruction("Powered by bloXroute Trader Api");

  const privateKey = process.env.PRIVATE_KEY || "";
  const wallet = Keypair.fromSecretKey(base58.decode(privateKey));
  const recentBlockhash = await provider.getRecentBlockHash({});

  let tx = new Transaction({
    recentBlockhash: recentBlockhash.blockHash,
    feePayer: wallet.publicKey,
  });

  const fee = Math.round(bloXroute_fee * LAMPORTS_PER_SOL);
  tx.add(transaction);
  tx.add(memo);
  tx.add(await CreateTraderAPITipTransaction(wallet.publicKey, fee));
  tx.sign(wallet);

  const serializeTxBytes = tx.serialize();
  const buffTx = Buffer.from(serializeTxBytes);
  const encodedTx = buffTx.toString("base64");
  console.log("Submitting transaction to bloXroute...");

  try {
    const response = await provider.postSubmit({
      transaction: { content: encodedTx, isCleanup: false },
      skipPreFlight: false,
      frontRunningProtection: false,
      useStakedRPCs: true,
    });

    if (response.signature) {
      console.log(`txn landed successfully\nSignature: https://solscan.io/tx/${response.signature}`);
    } else {
      console.log("Transaction failed");
    }
  } catch (e: any) {
    console.error("bloXroute submission error:", e?.message || e);
  }
}
