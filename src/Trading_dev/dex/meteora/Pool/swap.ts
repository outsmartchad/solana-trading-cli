import "rpc-websockets/dist/lib/client";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";
//const BN =require("bn.js");
import { connection, wallet } from "../../../../helpers/config";
import { PROGRAM_ID } from "../constants";
import { fetchDLMMPoolId, fetchDLMMPool } from "./fetch-pool";
import {
  TransactionMessage,
  ComputeBudgetProgram,
  VersionedTransaction,
} from "@solana/web3.js";
import { jito_executeAndConfirm } from "../../../../Transactions/jito_tips_tx_executor";
import { jito_fee } from "../../../../helpers/config";
const BN = require("bn.js");
// const provider = new AnchorProvider(connection, ourWallet, {
//   commitment: "confirmed",
// });

async function swap(tokenAddress: string) {
  const swapYtoX = true;
  console.log(wallet.publicKey.toBase58());
  const swapAmount = new BN(1);
  const dlmmPool = await fetchDLMMPool(tokenAddress);
  const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);
  const swapQuote = await dlmmPool.swapQuote(
    swapAmount,
    swapYtoX,
    new BN(10*100),
    binArrays
  );
  const swapTx: any = await dlmmPool.swap({
    inToken: dlmmPool.tokenX.publicKey,
    binArraysPubkey: swapQuote.binArraysPubkey,
    inAmount: swapAmount,
    lbPair: dlmmPool.pubkey,
    user: wallet.publicKey,
    minOutAmount: swapQuote.minOutAmount,
    outToken: dlmmPool.tokenY.publicKey,
  });
  try {
    const swapTxHash = await sendAndConfirmTransaction(connection, swapTx, [
      wallet,
    ]);
    console.log("🚀 ~ swapTxHash:", swapTxHash);
  } catch (error) {
    console.log("🚀 ~ error:", JSON.parse(JSON.stringify(error)));
  }
  // const recentBlockhash = await connection.getLatestBlockhash();
  // const messageV0 = new TransactionMessage({
  //   payerKey: wallet.publicKey,
  //   recentBlockhash: recentBlockhash.blockhash,
  //   instructions: [
  //     ...[
  //       ComputeBudgetProgram.setComputeUnitPrice({
  //         microLamports: 305290,
  //       }),
  //       ComputeBudgetProgram.setComputeUnitLimit({
  //         units: 102750,
  //       }),
  //     ],
  //     ...swapTx.instructions,
  //   ],
  // }).compileToV0Message();

  // const transaction = new VersionedTransaction(messageV0);
  // transaction.sign([wallet]);
  // const res = await jito_executeAndConfirm(transaction, wallet,recentBlockhash, jito_fee);
  // const signature = res.signature;
  // const confirmed = res.confirmed;

  // if (signature) {
  //   return { txid: signature };
  // } else {
  //   console.log("jito fee transaction failed when swapping token in a DLMM pool");
  // }
}
async function main() {
  const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
  await swap(tokenAddress);
}
main();
