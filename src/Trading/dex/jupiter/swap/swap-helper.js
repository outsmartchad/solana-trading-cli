const { VersionedTransaction } = require("@solana/web3.js");
const fetch = require("cross-fetch");
const { connection, wallet, jito_fee } = require("../../../../helpers/config");
const {
  jito_executeAndConfirm,
} = require("../../../../Transactions/jito_tips_tx_executor");
/**
 * Get quote for the swap
 * @param {string} addressOfTokenOut The token that we are selling
 * @param {string} addressOfTokenIn The token that we are buying
 * @param {number} convertedAmountOfTokenOut The amount of tokens that we are selling
 * @param {number} slippage The slippage percentage
 * @returns Promise<QuoteResponse>
 */
async function getQuote(
  tokenOut,
  tokenIn,
  convertedAmountOfTokenOut,
  slippage
) {
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${tokenIn}\&outputMint=${tokenOut}\&amount=${convertedAmountOfTokenOut}\&slippageBps=${slippage}`;
  const response = await fetch(url);
  const quote = await response.json();
  return quote;
}

/**
 * Get serialized transactions for the swap
 * @returns {Promise<string>} swapTransaction
 */
async function getSwapTransaction(quoteResponse, wallet_pubKey) {
  try {
    let body = null;
    body = {
      quoteResponse,
      userPublicKey: wallet_pubKey,
      wrapAndUnwrapSol: true,
      restrictIntermediateTokens: false,
      prioritizationFeeLamports: "auto",
      autoMultiplier: 2,
    };
    const resp = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const swapResponse = await resp.json();
    return swapResponse.swapTransaction;
  } catch (error) {
    throw new Error(error);
  }
}
async function convertToInteger(amount, decimals) {
  return Math.floor(amount * 10 ** decimals);
}

/**
 * @param {*} swapTransaction
 * @returns Promise<string> txid
 */
async function finalizeTransaction(swapTransaction) {
  try {
    // deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    let transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // sign the transaction
    transaction.sign([wallet]);

    const rawTransaction = transaction.serialize();
    const latestBlockhash = await connection.getLatestBlockhash();
    let { confirmed, signature } = await jito_executeAndConfirm(
      rawTransaction,
      wallet,
      latestBlockhash,
      jito_fee
    );
    while (!confirmed) {
      console.log("Transaction failed");
      console.log("resubmitting transaction...");
      confirmed,
        (signature = await jito_executeAndConfirm(
          rawTransaction,
          wallet,
          latestBlockhash,
          jito_fee
        ));
    }
    console.log(`Jito Transaction sent and confirmed with txid: ${signature}`);
    return { confirmed, signature };
  } catch (error) {
    throw new Error(error);
  }
  return { confirmed: false, signature: null };
}

module.exports = {
  getQuote,
  getSwapTransaction,
  finalizeTransaction,
  convertToInteger,
};
