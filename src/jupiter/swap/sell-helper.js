const swap_helper = require("./swap-helper");
const { PublicKey } = require("@solana/web3.js");
const { wallet } = require("../../helpers/config");
const { getDecimals } = require("../../helpers/util");
const wsol = "So11111111111111111111111111111111111111112";

/**
 * Sells a specified amount of a token on the DEX.
 * @param {string} tokenToSell - The address of the token to sell.
 * @param {number} amountOfTokenToSell - The amount of the token to sell.
 * @param {number} slippage - The slippage tolerance percentage.
 * @returns {Promise<void>} - A promise that resolves when the sell operation is completed.
 */
async function sell(tokenToSell, amountOfTokenToSell, slippage) {
  try {
    const decimals = await getDecimals(new PublicKey(tokenToSell));
    console.log(decimals);
    const convertedAmountOfTokenOut = await swap_helper.convertToInteger(
      amountOfTokenToSell,
      decimals
    );
    console.log(convertedAmountOfTokenOut);
    const quoteResponse = await swap_helper.getQuote(
      tokenToSell,
      wsol,
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
    } else {
      console.log("Transaction failed");
      console.log("retrying transaction...");
      await sell(tokenToSell, amountOfTokenToSell, slippage);
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = { sell };
