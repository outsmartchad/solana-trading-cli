const swap_helper = require("./swap-helper");
const { wallet } = require("../../../../helpers/config");
const { getDecimals } = require("../../../../helpers/util");
const wsol = "So11111111111111111111111111111111111111112";

async function sell(addressOfTokenOut, amountOfTokenToSell, slippage) {
  try {
    const decimals = await getDecimals(addressOfTokenOut);
    const convertedAmountOfTokenOut = swap_helper.convertToInteger(
      amountOfTokenToSell,
      decimals
    );
    const quoteResponse = await swap_helper.getQuote(
      addressOfTokenOut,
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
    }
  } catch (error) {
    console.error(error);
  }
}

module.exports = { sell };
