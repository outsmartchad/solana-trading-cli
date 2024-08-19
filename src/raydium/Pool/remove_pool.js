const assert = require("assert");

const {
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  TokenAmount,
  Token,
  TOKEN_PROGRAM_ID,
} = require("@raydium-io/raydium-sdk");

const { Keypair, PublicKey } = require("@solana/web3.js");
const { Decimal } = require("decimal.js");
const {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  wallet,
  dev_connection,
} = require("../../helpers/config.js");
const {
  formatAmmKeysById_pool,
  formatAmmKeysById_swap,
} = require("./formatAmmKeysById.js");
const {
  buildAndSendTx,
  getWalletTokenAccount,
  loadOrCreateKeypair_wallet,
  checkTx,
} = require("../../helpers/util.js");
// const {
//   getPoolId,
//   getPoolIdByPair,
//   queryLpByToken,
//   queryLpPair,
// } = require("./query_pool.js");
const { fetchAMMPoolId, fetchLPToken} = require("./fetch_pool.js")
const { getSPLTokenBalance } = require("../helpers/check_balance.js");
const { getDecimals, getTokenMetadata } = require("../helpers/util.js");
const { BN } = require("@project-serum/anchor");
const { program } = require("commander");

let payer_keypair = null,
  tokenAddress = null,
  percentage = null,
  cluster = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token_address <TOKEN_ADDRESS>", "Specify the token address")
  .option(
    "--percentage <LP_TOKEN_PERCENTAGE>",
    "Specify the percentage of LP token to remove"
  )
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node remove_pool --payer <PATH_PAYER> --token_address <TOKEN_ADDRESS> --percentage <LP_TOKEN_PERCENTAGE> --cluster <CLUSTER>"
      );
      process.exit(0);
    }
    if (!options.token_address || !options.percentage || !options.cluster) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    if (options.payer) {
      payer_keypair = options.payer;
    }
    tokenAddress = new PublicKey(options.token_address);
    percentage = options.percentage;
    cluster = options.cluster;
  });
program.parse();
/**
 * Removes liquidity from a target pool.
 * @param {Object} input - The input parameters.
 * @param {string} input.targetPool - The ID of the target pool.
 * @param {Object} input.wallet - The wallet object.
 * @param {string} input.wallet.publicKey - The public key of the wallet.
 * @param {Array} input.walletTokenAccounts - The token accounts of the wallet.
 * @param {number} input.removeLpTokenAmount - The amount of LP tokens to remove.
 * @param {number} makeTxVersion - The transaction version.
 * @returns {Object} - The transaction IDs.
 */
async function ammRemoveLiquidity(input) {
  try {
    // -------- pre-action: fetch basic info --------
    const targetPoolInfo = await formatAmmKeysById_pool(input.targetPool);
    assert(targetPoolInfo, "cannot find the target pool");

    // -------- step 1: make instructions --------
    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo);
    const removeLiquidityInstructionResponse =
      await Liquidity.makeRemoveLiquidityInstructionSimple({
        connection,
        poolKeys,
        userKeys: {
          owner: input.wallet.publicKey,
          payer: input.wallet.publicKey,
          tokenAccounts: input.walletTokenAccounts,
        },
        amountIn: input.removeLpTokenAmount,
        makeTxVersion,
      });

    return {
      txids: await buildAndSendTx(
        removeLiquidityInstructionResponse.innerTransactions,
        {
          preflightCommitment: "confirmed",
        }
      ),
    };
  } catch (err) {
    console.log(err);
    return {
      txids: await buildAndSendTx(
        removeLiquidityInstructionResponse.innerTransactions,
        {
          preflightCommitment: "confirmed",
        }
      ),
    };
  }
}

/**
 * Finds the LP token address for a given token address.
 * @param {string} tokenAddress - The token address.
 * @returns {string} - The LP token address.
 */
async function findLPTokenAddress(tokenAddress) {
  const response = await fetchLPToken(tokenAddress);
  console.log(response);
  console.log(response.Raydium_LiquidityPoolv4[0].lpMint);
  return response.Raydium_LiquidityPoolv4[0].lpMint;
}

/**
 * Helper function for removing liquidity from an AMM pool that retries the transaction if it fails.
 * @param {Object} input - The input parameters for removing liquidity.
 * @returns {Promise<void>} - A promise that resolves when the liquidity is removed.
 */
async function ammRemoveLiquidityHelper(input) {
  const { txids } = await ammRemoveLiquidity(input);
  console.log("txids:", txids);
  const response = await checkTx(txids[0]);
  if (response) {
    console.log(`https://explorer.solana.com/tx/${txids}?cluster=mainnet`);
  } else {
    console.log("Transaction failed");
    console.log("trying to send the transaction again");
    ammRemoveLiquidityHelper(input);
  }
}
/**
 * Main function for removing a pool's liquidity.
 * @returns {Promise<void>} A promise that resolves when the pool removal is complete.
 */
async function main() {
  if (payer_keypair !== null) {
    payer_keypair = await loadOrCreateKeypair_wallet(payer_keypair);
  } else {
    payer_keypair = Keypair.fromSecretKey(wallet.secretKey);
  }

  const lpTokenAddress = await findLPTokenAddress(tokenAddress);
  const lpTokenAccount = new PublicKey(lpTokenAddress);
  const lpTokenBalance = await getSPLTokenBalance(
    connection,
    lpTokenAccount,
    payer_keypair.publicKey
  );
  console.log("lpTokenBalance", lpTokenBalance);
  const decimals = await getDecimals(lpTokenAccount);
  console.log("decimals", decimals);
  const { tokenName, tokenSymbol } = await getTokenMetadata(lpTokenAddress);

  const lpToken = new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey(lpTokenAddress),
    decimals,
    tokenSymbol,
    tokenName
  );

  const percentageOfLpToken = percentage / 100;
  const inputTokenAmount = new Decimal(lpTokenBalance * percentageOfLpToken);

  const removeLpTokenAmount = new TokenAmount(
    lpToken,
    new BN(inputTokenAmount.mul(10 ** lpToken.decimals).toFixed(0))
  );
  const targetPool = await fetchAMMPoolId(tokenAddress);
  if (targetPool === null) {
    console.log(
      "Pool not found or raydium is not supported for this token. Exiting..."
    );
    return;
  }
  const walletTokenAccounts = await getWalletTokenAccount(
    connection,
    payer_keypair.publicKey
  );

  await ammRemoveLiquidityHelper({
    removeLpTokenAmount,
    targetPool,
    walletTokenAccounts,
    wallet: payer_keypair,
  });
}

main();
