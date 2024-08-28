import { PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  DecimalUtil,
  Percentage,
  TransactionBuilder,
} from "@orca-so/common-sdk";
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  swapQuoteByInputToken,
  Whirlpool,
  WhirlpoolData,
  IGNORE_CACHE,
} from "@orca-so/whirlpools-sdk";
import {
  MAINNET_WHIRLPOOLS_CONFIG,
  WSOL,
  USDC,
  tick_spacing,
} from "../constants";
import Decimal from "decimal.js";
import { connection, wallet, jito_fee } from "../../helpers/config";
import { jito_executeAndConfirm } from "../../Transactions";
import { TransactionMessage, Transaction, TransactionInstruction } from "@solana/web3.js";
import { VersionedTransaction } from "@solana/web3.js";
const ourWallet = new Wallet(wallet);
async function main() {
  console.log(ourWallet.publicKey.toBase58());
  const provider = new AnchorProvider(connection, ourWallet, {
    commitment: "confirmed",
  });
  const ctx = WhirlpoolContext.withProvider(
    provider,
    ORCA_WHIRLPOOL_PROGRAM_ID
  );
  const client = buildWhirlpoolClient(ctx);
  const whirlpool_pubkey = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    MAINNET_WHIRLPOOLS_CONFIG,
    WSOL.mint,
    USDC.mint,
    tick_spacing
  ).publicKey;
  console.log("Pool Id: ", whirlpool_pubkey.toBase58());
  const whirlpool = await client.getPool(whirlpool_pubkey);
  // tokenB -> tokenA
  const amountIn = new Decimal("1"); // 1 USDC to WSOL
  const quote = await swapQuoteByInputToken(
    whirlpool,
    USDC.mint,
    DecimalUtil.toBN(amountIn, USDC.decimals),
    Percentage.fromFraction(10, 1000), // 10/1000 = 1% slippage
    ctx.program.programId,
    ctx.fetcher,
    IGNORE_CACHE
  );
  // Output the estimation
  console.log(
    "estimatedAmountIn:",
    DecimalUtil.fromBN(quote.estimatedAmountIn, USDC.decimals).toString(),
    "USDC"
  );
  console.log(
    "estimatedAmountOut:",
    DecimalUtil.fromBN(quote.estimatedAmountOut, WSOL.decimals).toString(),
    "WSOL"
  );
  console.log(
    "otherAmountThreshold:",
    DecimalUtil.fromBN(quote.otherAmountThreshold, WSOL.decimals).toString(),
    "WSOL"
  );
  // build the tx
  const swapTx: any = await whirlpool.swap(quote);
  let ixList = [], signers = [];
  for (const ix of swapTx.instructions) {
    ixList.push(...ix.instructions);
    //ixList.push(...ix.cleanupInstructions);
    signers.push(...ix.signers);
  }

  try {
    const recentBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [...ixList],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallet,...signers]);
    const res = await jito_executeAndConfirm(
      transaction,
      wallet,
      recentBlockhash,
      jito_fee
    );
    const signature = res.signature;
    const confirmed = res.confirmed;

    if (confirmed) {
      console.log(`🚀 https://solscan.io/tx/${signature}`);
    } else {
      console.log(
        "jito fee transaction failed when swapping token in a orca whirl pool"
      );
    }
  } catch (error: any) {
    console.log("🚀 ~ error: ", JSON.parse(JSON.stringify(error)));
  }
}

main();
