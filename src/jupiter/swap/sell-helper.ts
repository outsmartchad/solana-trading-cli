import {
  convertToInteger,
  getQuote,
  getSwapTransaction,
  finalizeTransaction,
} from "./swap-helper";
import { PublicKey } from "@solana/web3.js";
import { wallet } from "../../helpers/config";
import { getDecimals } from "../../helpers/util";
const wsol = "So11111111111111111111111111111111111111112";

/**
 * Sells a specified amount of a token on the DEX.
 * @param {string} tokenToSell - The address of the token to sell.
 * @param {number} amountOfTokenToSell - The amount of the token to sell.
 * @param {number} slippage - The slippage tolerance percentage.
 * @returns {Promise<void>} - A promise that resolves when the sell operation is completed.
 */
export async function sell(
  tokenToSell: string,
  amountOfTokenToSell: number,
  slippage: any
) {
  try {
    const decimals = await getDecimals(new PublicKey(tokenToSell));
    console.log(decimals);
    const convertedAmountOfTokenOut = await convertToInteger(
      amountOfTokenToSell,
      decimals
    );
    console.log(convertedAmountOfTokenOut);
    const quoteResponse = await getQuote(
      tokenToSell,
      wsol,
      convertedAmountOfTokenOut,
      slippage
    );
    const wallet_PubKey = wallet.publicKey.toBase58();
    const swapTransaction = await getSwapTransaction(
      quoteResponse,
      wallet_PubKey
    );
    const { confirmed, signature } = await finalizeTransaction(swapTransaction);
    if (confirmed) {
      console.log("http://solscan.io/tx/" + signature);
    } else {
      console.log("Transaction failed");
      console.log("retrying transaction...");
      await sell(tokenToSell, amountOfTokenToSell, slippage);
    }
  } catch (error) {
    console.error(error);
  }
}

async function main() {
  const tokenAddress = "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh";
  const amountOfTokenToSell = 0.000025;
  const slippage = 1;
  await sell(tokenAddress, amountOfTokenToSell, slippage);
}

// main();