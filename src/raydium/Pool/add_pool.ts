import assert from "assert";
import {
  jsonInfo2PoolKeys,
  Liquidity,
  Token,
  TOKEN_PROGRAM_ID,
  TokenAmount,
  Percent,
} from "@raydium-io/raydium-sdk";
import { PublicKey, Keypair } from "@solana/web3.js";
//import { getPoolId, getPoolIdByPair } from("./query_pool.js");
import {fetchAMMPoolId} from "./fetch_pool";
import Decimal from "decimal.js";

import {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  dev_connection,
  wallet,
} from "../../helpers/config";
import { formatAmmKeysById_pool } from "./formatAmmKeysById";
import {
  buildAndSendTx,
  getWalletTokenAccount,
  loadOrCreateKeypair_wallet,
  getDecimals,
  getTokenMetadata,
  checkTx,
} from "../../helpers/util";
const BN = require("bn.js");
import { program } from "commander";

let payer_keypair:any = null,
  token_address:any = null,
  pool_id:any = null,
  sol:any = null,
  cluster = null,
  priority_fee = null,
  connection_sol = connection;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--pool_id <POOL_ID>", "Specify the pool id")
  .option("--sol <NUMBER_OF_SOL>", "Specify the number of SOL")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("--priority_fee <PRIORITY_FEE>", "Specify the priority fee")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node add_pool --payer <PATH_WALLET> --token_address <ADDRESS_TOKEN> --pool_id <POOL_ID> --sol <NUMBER_OF_SOL> --cluster <CLUSTER> --priority_fee <PRIORITY_FEE>"
      );
      process.exit(0);
    }

    if (!options.token_address || !options.sol || !options.cluster) {
      console.log(
        "Please provide the required param's value, except the pool id and the priority fee."
      );
      process.exit(1);
    }
    if (options.payer) {
      payer_keypair = options.payer;
    }
    token_address = new PublicKey(options.token_address);
    pool_id = options.pool_id;
    sol = options.sol;
    cluster = options.cluster;
    priority_fee = options.priority_fee;

    // Handle the logic for the create command
  });
program.parse();
/**
 * Adds liquidity to a target pool.
 * @param {Object} input - The input parameters.
 * @param {string} input.targetPool - The ID of the target pool.
 * @param {number} input.Amount - The amount of liquidity to add.
 * @param {string} input.quoteToken - The quote token for the liquidity.
 * @param {number} input.slippage - The slippage for the liquidity.
 * @param {Object} input.wallet - The wallet information.
 * @param {string} input.wallet.publicKey - The public key of the wallet.
 * @param {string} input.walletTokenAccounts - The token accounts of the wallet.
 * @returns {Object} - The transaction IDs and the amount of another currency.
 */
export async function ammAddLiquidity(input:any) {
  try {
    const targetPoolInfo = await formatAmmKeysById_pool(input.targetPool);
    assert(targetPoolInfo, "cannot find the target pool");

    // -------- step 1: compute another amount --------

    const poolKeys:any = jsonInfo2PoolKeys(targetPoolInfo);
    const extraPoolInfo = await Liquidity.fetchInfo({
      connection,
      poolKeys,
    });
    const { maxAnotherAmount, anotherAmount, liquidity } =
      Liquidity.computeAnotherAmount({
        poolKeys,
        poolInfo: { ...targetPoolInfo, ...extraPoolInfo },
        amount: input.Amount,
        anotherCurrency: input.quoteToken,
        slippage: input.slippage,
      });

    console.log("will add liquidity info", {
      liquidity: liquidity.toString(),
      liquidityD: new Decimal(liquidity.toString()).div(
        10 ** extraPoolInfo.lpDecimals
      ),
    });

    // -------- step 2: make instructions --------
    const addLiquidityInstructionResponse:any =
      await Liquidity.makeAddLiquidityInstructionSimple({
        connection,
        poolKeys,
        userKeys: {
          owner: input.wallet.publicKey,
          payer: input.wallet.publicKey,
          tokenAccounts: input.walletTokenAccounts,
        },
        amountInA: input.Amount,
        amountInB: maxAnotherAmount,
        fixedSide: "a",
        makeTxVersion,
      });
    console.log(
      "addLiquidityInstructionResponse: ",
      addLiquidityInstructionResponse
    );

    return {
      txids: await buildAndSendTx(
        addLiquidityInstructionResponse.innerTransactions,
        null
      ),
      anotherAmount,
    };
  } catch (e) {
    console.log(e);
  }
}
/**
 * Helper function for adding liquidity to an AMM pool that retries the transaction if it fails.
 * @param {Object} input - The input parameters for adding liquidity.
 * @returns {Promise<void>} - A promise that resolves when the liquidity is added.
 */
export async function ammAddLiquidityHelper(input:any) {
  const res:any = await ammAddLiquidity(input);
  console.log("txids:", res?.txids);
  const response = await checkTx(res?.txids[0]);
  if (response) {
    console.log(`https://explorer.solana.com/tx/${res?.txids}?cluster=mainnet`);
  } else {
    console.log("Transaction failed");
    console.log("trying to send the transaction again");
    ammAddLiquidityHelper(input);
  }
}

/**
 * Main function for adding liquidity to a pool.
 * @returns {Promise<void>} A promise that resolves when liquidity is added.
 */
async function main() {
  if (payer_keypair !== null) {
    payer_keypair = await loadOrCreateKeypair_wallet(payer_keypair);
  } else {
    payer_keypair = Keypair.fromSecretKey(wallet.secretKey);
  }
  const baseToken = DEFAULT_TOKEN.WSOL;
  const { tokenName, tokenSymbol } = await getTokenMetadata(token_address);
  console.log("token symbol: ", tokenSymbol);
  const quoteToken = new Token(
    TOKEN_PROGRAM_ID,
    token_address,
    await getDecimals(token_address),
    tokenSymbol,
    tokenName
  );
  let targetPool = null;
  if (pool_id != null) {
    targetPool = pool_id;
  } else targetPool = await fetchAMMPoolId(quoteToken.mint.toBase58());
  if (targetPool === null) {
    console.log(
      "Pool not found or raydium is not supported for this token. Exiting..."
    );
    process.exit(1);
  }
  console.log("targetPool: ", targetPool);
  const inputTokenAmount = new Decimal(sol);
  const Amount = new TokenAmount(
    baseToken,
    new BN(inputTokenAmount.mul(10 ** baseToken.decimals).toFixed(0))
  );
  const slippage = new Percent(5, 1000);
  const walletTokenAccounts = await getWalletTokenAccount(
    connection,
    payer_keypair.publicKey
  );

  await ammAddLiquidityHelper({
    baseToken,
    quoteToken,
    targetPool,
    Amount,
    slippage,
    walletTokenAccounts,
    wallet: payer_keypair,
  });
}

main();
