const { swap } = require("./Pool/swap.js");
const { program } = require("commander");
const { loadOrCreateKeypair_wallet } = require("../helpers/util.js");
const { wallet } = require("../helpers/config.js");

let payer_keypair = null,
  token_address = null,
  sol = null,
  cluster = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--sol <NUMBER_OF_SOL>", "Specify the number of SOL")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node buy --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL> --cluster <CLUSTER>"
      );
      process.exit(0);
    }
    if (!options.token_address || !options.sol || !options.cluster) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    if (options.payer) {
      payer_keypair = options.payer;
    }
    token_address = options.token_address;
    sol = options.sol;
    cluster = options.cluster;
  });
program.parse();

/**
 * Buy function to perform a swap on the Raydium DEX.
 *
 * @param {string} side - The side of the trade (buy/sell).
 * @param {string} address - The address of the token to trade.
 * @param {number} no_of_sol - The amount of SOL to trade.
 * @param {string} payer - The payer's keypair for the transaction.
 * @returns {Promise<void>} - A promise that resolves when the swap is completed.
 */
async function buy(side, address, no_of_sol, payer) {
  let payer_wallet = null;
  if (payer_keypair !== null) {
    payer_wallet = await loadOrCreateKeypair_wallet(payer_keypair);
    await swap(side, address, no_of_sol, -1, payer_wallet, "trade");
  } else {
    await swap(side, address, no_of_sol, -1, wallet, "trade");
  }
}

buy("buy", token_address, sol, payer_keypair);
