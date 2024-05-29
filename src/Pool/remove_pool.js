import assert from "assert";

// jsonInfo2PoolKeys,
// Liquidity,
// LiquidityPoolKeys,
// TokenAmount,
// Token,
import * as raydium from "@raydium-io/raydium-sdk";

import { Keypair, PublicKey } from "@solana/web3.js";
import { Decimal } from "decimal.js";
import {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  wallet,
  dev_connection,
} from "./config.js";
import { formatAmmKeysById } from "./formatAmmKeysById.js";
import {
  buildAndSendTx,
  getWalletTokenAccount,
  loadOrCreateKeypair_wallet,
  checkTx,
} from "./util.js";
import { getPoolId, getPoolIdByPair, queryLpByToken } from "./query_pool.js";
import { getSPLTokenBalance } from "../helpers/check_balance.js";
import { getDecimals, getTokenMetadata } from "./util.js";
import { BN } from "@project-serum/anchor";

import { program } from "commander";
// node remove_pool.mjs --payer <PATH_PAYER> --token <TOKEN_ADDRESS> --percentage <LP_TOKEN_PERCENTAGE> --cluster <CLUSTER>
let payer_keypair = null,
  tokenAddress = null,
  percentage = null,
  cluster = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token <TOKEN_ADDRESS>", "Specify the token address")
  .option(
    "--percentage <LP_TOKEN_PERCENTAGE>",
    "Specify the percentage of LP token to remove"
  )
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node remove_pool --payer <PATH_PAYER> --token <TOKEN_ADDRESS> --percentage <LP_TOKEN_PERCENTAGE> --cluster <CLUSTER>"
      );
      process.exit(0);
    }
    if (
      !options.payer ||
      !options.token ||
      !options.percentage ||
      !options.cluster
    ) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    payer_keypair = options.payer;
    tokenAddress = new PublicKey(options.token);
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
    const targetPoolInfo = await formatAmmKeysById(input.targetPool);
    assert(targetPoolInfo, "cannot find the target pool");

    // -------- step 1: make instructions --------
    const poolKeys = raydium.jsonInfo2PoolKeys(targetPoolInfo);
    const removeLiquidityInstructionResponse =
      await raydium.Liquidity.makeRemoveLiquidityInstructionSimple({
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
        removeLiquidityInstructionResponse.innerTransactions
      ),
    };
  } catch (err) {
    console.log(err);
    return {
      txids: await buildAndSendTx(
        removeLiquidityInstructionResponse.innerTransactions
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
  const response = await queryLpByToken(tokenAddress);
  console.log(response.Raydium_LiquidityPoolv4[0].lpMint);
  return response.Raydium_LiquidityPoolv4[0].lpMint;
}

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
  payer_keypair = await loadOrCreateKeypair_wallet(payer_keypair);
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

  const lpToken = new raydium.Token(
    raydium.TOKEN_PROGRAM_ID,
    new PublicKey(lpTokenAddress),
    decimals,
    tokenSymbol,
    tokenName
  );

  const percentageOfLpToken = percentage / 100;
  const inputTokenAmount = new Decimal(lpTokenBalance * percentageOfLpToken);

  const removeLpTokenAmount = new raydium.TokenAmount(
    lpToken,
    new BN(inputTokenAmount.mul(10 ** lpToken.decimals).toFixed(0))
  );
  const targetPool = await getPoolIdByPair(tokenAddress);
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
