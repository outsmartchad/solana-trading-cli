const assert = require("assert");

const {
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  Percent,
  Token,
  TOKEN_PROGRAM_ID,
  TokenAmount,
} = require("@raydium-io/raydium-sdk");
const { Keypair, PublicKey } = require("@solana/web3.js");
const { Decimal } = require("decimal.js");
const { BN } = require("@project-serum/anchor");
const { getSPLTokenBalance } = require("../helpers/check_balance.js");
const {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  RAYDIUM_MAINNET_API,
  _ENDPOINT,
} = require("../helpers/config.js");
const {
  buildAndSendTx,
  getWalletTokenAccount,
  loadOrCreateKeypair_wallet,
  getDecimals,
  getTokenMetadata,
  checkTx,
} = require("../helpers/util.js");
const { getPoolId, getPoolIdByPair } = require("./query_pool.js");
/**
 * pre-action: get pool info
 * step 1: coumpute amount out
 * step 2: create instructions by SDK function
 * step 3: compose instructions to several transactions
 * step 4: send transactions
 */
/**
 * Performs a swap operation using an Automated Market Maker (AMM) pool in Raydium.
 * @param {Object} input - The input parameters for the swap operation.
 * @returns {Object} - The transaction IDs of the executed swap operation.
 */
async function swapOnlyAmm(input) {
  // -------- pre-action: get pool info --------\
  const ammPool = await (
    await fetch(_ENDPOINT + RAYDIUM_MAINNET_API.poolInfo)
  ).json(); // If the Liquidity pool is not required for routing, then this variable can be configured as undefined
  const targetPoolInfo = [...ammPool.official, ...ammPool.unOfficial].find(
    (info) => info.id === input.targetPool
  );
  assert(targetPoolInfo, "cannot find the target pool");
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo);

  // -------- step 1: coumpute amount out --------
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: input.inputTokenAmount,
    currencyOut: input.outputToken,
    slippage: input.slippage,
  });

  // -------- step 2: create instructions by SDK function --------
  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: input.walletTokenAccounts,
      owner: input.wallet.publicKey,
    },
    amountIn: input.inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: "in",
    makeTxVersion,
  });

  console.log(
    "amountOut:",
    amountOut.toFixed(),
    "  minAmountOut: ",
    minAmountOut.toFixed()
  );

  return { txids: await buildAndSendTx(innerTransactions) };
}

/**
 * Performs a swap operation that retries the transaction if it fails.
 *
 * @param {string} side - The side of the swap operation ("buy" or "sell").
 * @param {string} tokenAddr - The address of the token.
 * @param {number} buy_AmountOfSol - The amount of SOL to buy (only applicable for "buy" side).
 * @param {number} sell_PercentageOfToken - The percentage of token to sell (only applicable for "sell" side).
 * @returns {Promise<void>} - A promise that resolves when the swap operation is completed.
 */

async function swapOnlyAmmHelper(input) {
  const { txids } = await swapOnlyAmm(input);
  console.log("txids:", txids);
  const response = await checkTx(txids[0]);
  if (response) {
    console.log(`https://solscan.io/tx/${txids}?cluster=mainnet`);
  } else {
    console.log("Transaction failed");
    console.log("trying to send the transaction again");
    swapOnlyAmmHelper(input);
  }
}
/**
 * Performs a swap operation.
 *
 * @param {string} side - The side of the swap operation ("buy" or "sell").
 * @param {string} tokenAddr - The address of the token involved in the swap.
 * @param {number} buy_AmountOfSol - The amount of SOL to buy (only applicable for "buy" side).
 * @param {number} sell_PercentageOfToken - The percentage of the token to sell (only applicable for "sell" side).
 * @param {object} payer_wallet - The payer's wallet object.
 * @returns {Promise<void>} - A promise that resolves when the swap operation is completed.
 */
async function swap(
  side,
  tokenAddr,
  buy_AmountOfSol,
  sell_PercentageOfToken,
  payer_wallet
) {
  if (side === "buy") {
    // buy - use sol to swap to the token
    const tokenAddress = tokenAddr;
    const tokenAccount = new PublicKey(tokenAddress);
    const { tokenName, tokenSymbol } = await getTokenMetadata(tokenAddress);
    const outputToken = new Token(
      TOKEN_PROGRAM_ID,
      tokenAccount,
      await getDecimals(tokenAccount),
      tokenSymbol,
      tokenName
    );
    console.log("output token: ", outputToken);
    const inputToken = DEFAULT_TOKEN.WSOL; // SOL
    const targetPool = await getPoolIdByPair(tokenAddress);
    if (targetPool === null) {
      console.log(
        "Pool not found or raydium is not supported for this token. Exiting..."
      );
      return;
    }
    const amountOfSol = new Decimal(buy_AmountOfSol);
    const inputTokenAmount = new TokenAmount(
      inputToken,
      new BN(amountOfSol.mul(10 ** inputToken.decimals).toFixed(0))
    );
    const slippage = new Percent(1, 1000);
    const walletTokenAccounts = await getWalletTokenAccount(
      connection,
      payer_wallet.publicKey
    );
    swapOnlyAmmHelper({
      outputToken,
      targetPool,
      inputTokenAmount,
      slippage,
      walletTokenAccounts,
      wallet: payer_wallet,
    });
  } else {
    // sell

    const tokenAddress = tokenAddr;
    const tokenAccount = new PublicKey(tokenAddress);
    const { tokenName, tokenSymbol } = await getTokenMetadata(tokenAddress);
    const inputToken = new Token(
      TOKEN_PROGRAM_ID,
      tokenAccount,
      await getDecimals(tokenAccount),
      tokenSymbol,
      tokenName
    );
    console.log("inputToken: ", inputToken);
    const outputToken = DEFAULT_TOKEN.WSOL; // SOL
    const targetPool = await getPoolIdByPair(tokenAddress);
    if (targetPool === null) {
      console.log(
        "Pool not found or raydium is not supported for this token. Exiting..."
      );
      return;
    }
    const walletTokenAccounts = await getWalletTokenAccount(
      connection,
      payer_wallet.publicKey
    );
    const balnaceOfToken = await getSPLTokenBalance(
      connection,
      tokenAccount,
      payer_wallet.publicKey
    );
    const percentage = sell_PercentageOfToken / 100;
    const amount = new Decimal(percentage * balnaceOfToken);
    console.log("amount: ", amount.toFixed(0));
    const slippage = new Percent(1, 100);
    const inputTokenAmount = new TokenAmount(
      inputToken,
      new BN(amount.mul(10 ** inputToken.decimals).toFixed(0))
    );
    await swapOnlyAmmHelper({
      outputToken,
      targetPool,
      inputTokenAmount,
      slippage,
      walletTokenAccounts,
      wallet: payer_wallet,
    });
  }
}

module.exports = { swap };
