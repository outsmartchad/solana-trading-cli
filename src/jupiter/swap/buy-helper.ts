import {getQuote, getSwapTransaction, convertToInteger, finalizeTransaction} from "./swap-helper";
import { PublicKey } from "@solana/web3.js";
import { wallet } from "../../helpers/config";
import { getDecimals } from "../../helpers/util";
const wsol = "So11111111111111111111111111111111111111112";

/**
 * Buys a token using the specified parameters.
 *
 * @param {string} tokenToBuy - The token to be swapped for.
 * @param {number} amountTokenOut - The amount of token to be received.
 * @param {number} slippage - The slippage tolerance percentage.
 * @returns {Promise<void>} - A promise that resolves when the buy operation is completed.
 * @throws {Error} - If an error occurs during the buy operation.
 */
export async function buy(tokenToBuy:string, amountTokenOut:number, slippage:any) {
  try {
    const convertedAmountOfTokenOut = await convertToInteger(
      amountTokenOut,
      9
    );
    const quoteResponse = await getQuote(
      wsol,
      tokenToBuy,
      convertedAmountOfTokenOut,
      slippage
    );
    console.log(quoteResponse);
    const wallet_PubKey = wallet.publicKey.toBase58();
    const swapTransaction = await getSwapTransaction(
      quoteResponse,
      wallet_PubKey
    );
    const { confirmed, signature } =
      await finalizeTransaction(swapTransaction);
    if (confirmed) {
      console.log("http://solscan.io/tx/" + signature);
    } else {
      console.log("Transaction failed");
      console.log("retrying transaction...");
      await buy(tokenToBuy, amountTokenOut, slippage);
    }
  } catch (error) {
    console.error(error);
  }
}

async function main() {
  const tokenAddress = "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh";
  const amountOfSOLToUse = 0.015
  const slippage = 1;
  await buy(tokenAddress, amountOfSOLToUse, slippage);
}

//main();

