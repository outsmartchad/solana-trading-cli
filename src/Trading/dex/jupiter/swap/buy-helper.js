const swap_helper = require("./swap-helper");
const { wallet } = require("../../../../helpers/config");
const { getDecimals } = require("../../../../helpers/util");
const wsol = "So11111111111111111111111111111111111111112";
/**
 * Buys a token by performing a swap transaction.
 *
 * @param {string} tokenIn - The token to be swapped.
 * @param {number} amountTokenOut - The amount of token to be swapped.
 * @param {number} slippage - The slippage tolerance for the swap.
 * @returns {Promise<void>} - A promise that resolves when the swap transaction is completed.
 * @throws {Error} - If an error occurs during the swap transaction.
 */
async function buy(tokenIn, amountTokenOut, slippage) {
  try {
    const decimals = await getDecimals(wsol);
    const convertedAmountOfTokenOut = swap_helper.convertToInteger(
      amountTokenOut,
      decimals
    );
    const quoteResponse = await swap_helper.getQuote(
      wsol,
      tokenIn,
      convertedAmountOfTokenOut,
      slippage
    );
    const wallet_PubKey = wallet.publicKey.toBase58();
    const swapTransaction = await swap_helper.getSwapTransaction(
      quoteResponse,
      wallet_PubKey
    );
    const { confirmed, signature } = await swap_helper.finalizeTransaction(
      swapTransaction
    );
    if (confirmed) {
      console.log("http://solscan.io/tx/" + signature);
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = { buy };
