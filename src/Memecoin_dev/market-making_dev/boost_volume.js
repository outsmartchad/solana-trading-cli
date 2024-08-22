const { connection, wallet } = require("../../helpers/config.js");
const {
  simple_executeAndConfirm,
} = require("../../Transactions/simple_tx_executor.js");
const {
  jito_executeAndConfirm,
} = require("../../Transactions/jito_tips_tx_executor.js");
const { program } = require("commander");
const {
  loadOrCreateKeypair_wallet,
  checkTx,
} = require("../../helpers/util.js");
const {
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} = require("@solana/web3.js");
const { swapForVolume } = require("../../raydium/Pool/swap.js");
let slippage = null,
  tokenAddress = null,
  payer = null,
  cluster = null,
  solPerOrder = null;

program
  .option("--token_address <TOKEN_ADDRESS>", "Specify the token address")
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option(
    "--sol_per_order <SOL_PER_ORDER>",
    "Specify the number of SOL per order"
  )
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node boost_volume --token_address <TOKEN_ADDRESS> --payer <PATH_TO_SECRET_KEY> --cluster <CLUSTER> --sol_per_order <SOL_PER_ORDER>"
      );
      process.exit(0);
    }
    if (!options.token_address || !options.cluster || !options.sol_per_order) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    tokenAddress = options.token_address;
    if (payer) payer = options.payer;
    cluster = options.cluster;
    solPerOrder = options.sol_per_order;
  });
program.parse();

/**
 * Boosts the volume by buying and selling a token in one transaction.
 * @async
 * @function boost_volume
 * @returns {Promise<void>}
 */
async function boost_volume() {
  while (true) {
    console.log(
      `Boosting volume..., buying and selling ${tokenAddress} in one transaction...`
    );
    try {
      const { confirmed, signature } = await swapForVolume(
        tokenAddress,
        solPerOrder
      );
      await error_handling(signature, confirmed);
    } catch (e) {
      console.log(e);
      console.log("trying to send the transaction again...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }
  }
}

/**
 * Handles error for a transaction.
 * @param {string} signature - The transaction signature.
 * @param {boolean} confirmed - Indicates if the transaction is confirmed.
 * @returns {Promise<void>} - A promise that resolves when the error handling is complete.
 */
async function error_handling(signature, confirmed) {
  if (confirmed) {
    console.log(`https://solscan.io/tx/${signature}?cluster=mainnet`);
    return;
  }
  const response = await checkTx(signature);
  if (response) {
    console.log(`https://solscan.io/tx/${signature}?cluster=mainnet`);
  } else {
    console.log("Transaction failed");
    console.log("trying to send the transaction again");
  }
}
boost_volume();
