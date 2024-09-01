import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import { swapQuoteByInputToken, IGNORE_CACHE } from "@orca-so/whirlpools-sdk";
import {
  MAINNET_WHIRLPOOLS_CONFIG,
  WSOL,
  USDC,
  tick_spacing,
  ourWallet,
  client,
  ctx,
} from "../constants";
import Decimal from "decimal.js";
import { connection, wallet, jito_fee } from "../../helpers/config";
import { getSPLTokenBalance } from "../../helpers/check_balance";
import { jito_executeAndConfirm } from "../../transactions";
import {
  TransactionMessage,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import { fetchWhirlPool } from "./fetch-pool";
/**
 * Performs a swap operation in a Whirl pool.
 * @param side The side of the swap operation, either "buy" or "sell". Default is "buy".
 * @param tokenAddress The address of the token to be swapped.
 * @param buyAmountInSOL The amount of SOL to be used for buying the token. Default is 0.1.
 * @param sellPercentage The percentage of the token to be sold. Default is 100%.
 * @returns A Promise that resolves to the transaction hash if the swap is successful, otherwise an error object.
 */
export async function swap(
  side: string = "buy",
  tokenAddress: string,
  buyAmountInSOL: number = 0.1,
  sellPercentage: number = 100
) {
  const tokenMint = new PublicKey(tokenAddress);
  const whirlPool: any = await fetchWhirlPool(tokenAddress);
  let amountIn: Decimal,
    inToken: PublicKey,
    outToken: PublicKey,
    tokenDecimal: number,
    quote: any;
  if (side === "buy") {
    amountIn = new Decimal(buyAmountInSOL);
    inToken = WSOL.mint;
    outToken = tokenMint;
    quote = await swapQuoteByInputToken(
      whirlPool,
      inToken,
      DecimalUtil.toBN(amountIn, WSOL.decimals),
      Percentage.fromFraction(10, 1000), // 10/1000 = 1% slippage
      ctx.program.programId,
      ctx.fetcher,
      IGNORE_CACHE
    );
  } else {
    const balance = await getSPLTokenBalance(
      connection,
      tokenMint,
      wallet.publicKey
    );
    amountIn = new Decimal(balance * (sellPercentage / 100));
    inToken = tokenMint;
    outToken = WSOL.mint;
    if (whirlPool.tokenAInfo.mint.toBase58() === tokenMint.toBase58()) {
      tokenDecimal = whirlPool.tokenAInfo.decimals;
    } else {
      tokenDecimal = whirlPool.tokenBInfo.decimals;
    }
    quote = await swapQuoteByInputToken(
      whirlPool,
      inToken,
      DecimalUtil.toBN(amountIn, tokenDecimal),
      Percentage.fromFraction(10, 1000), // 10/1000 = 1% slippage
      ctx.program.programId,
      ctx.fetcher,
      IGNORE_CACHE
    );
  }
  // build the tx
  const swapTx: any = await whirlPool.swap(quote);
  let ixList = [],
    signers = [];
  // extract the instructions and signers
  for (const ix of swapTx.instructions) {
    ixList.push(...ix.instructions);
    //ixList.push(...ix.cleanupInstructions);
    signers.push(...ix.signers);
  }

  // send the tx to jito
  try {
    const recentBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [...ixList],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallet, ...signers]);
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
//swap("buy", "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", 0.01, -1); // buy 0.01 SOL worth of the token
//swap("sell", "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", -1, 50); // sell 50% of the token
