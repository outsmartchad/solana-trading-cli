const { swap } = require("./Pool/swap.js");
const { program } = require("commander");
const { loadOrCreateKeypair_wallet } = require("../helpers/util.js");
const { wallet } = require("../helpers/config.js");

let payer_keypair = null,
  token_address = null,
  percentage = null,
  cluster = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--percentage <SELL_PERCENTAGE>", "Specify the percentage")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node sell --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE> --cluster <CLUSTER>"
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
    token_address = options.token_address;
    percentage = options.percentage;
    cluster = options.cluster;
  });
program.parse();

/**
 * Sell function that executes a swap transaction.
 *
 * @param {string} side - The side of the swap (buy or sell).
 * @param {string} address - The address to swap tokens.
 * @param {number} sell_percentage - The percentage of tokens to sell.
 * @param {string} payer - The payer address for the transaction.
 * @returns {Promise<void>} - A promise that resolves when the swap transaction is completed.
 */
async function sell(side, address, sell_percentage, payer) {
  await swap(side, address, -1, sell_percentage, payer, "trade");
}
async function main() {
  let payer_wallet = null;
  if (payer_keypair !== null) {
    payer_wallet = await loadOrCreateKeypair_wallet(payer_keypair); // specified wallet by user in command
    sell("sell", token_address, percentage, payer_wallet);
  } else {
    sell("sell", token_address, percentage, wallet); // default pre-defined wallet
  }
}
main();
