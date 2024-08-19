const swap_helper = require("./swap-helper");
const { PublicKey } = require("@solana/web3.js");
const { wallet } = require("../../helpers/config");
const { getDecimals } = require("../../helpers/util");
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
async function buy(tokenToBuy, amountTokenOut, slippage) {
  try {
    const convertedAmountOfTokenOut = await swap_helper.convertToInteger(
      amountTokenOut,
      9
    );
    const quoteResponse = await swap_helper.getQuote(
      wsol,
      tokenToBuy,
      convertedAmountOfTokenOut,
      slippage
    );
    console.log(quoteResponse);
    const wallet_PubKey = wallet.publicKey.toBase58();
    const swapTransaction = await swap_helper.getSwapTransaction(
      quoteResponse,
      wallet_PubKey
    );
    const { confirmed, signature } =
      await swap_helper.finalizeTransaction(swapTransaction);
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

module.exports = { buy };
