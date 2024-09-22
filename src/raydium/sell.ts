import { swap } from "./Pool/swap";
import { program } from "commander";
import { loadOrCreateKeypair_wallet } from "../helpers/util";
import { wallet } from "../helpers/config";
import { Keypair } from "@solana/web3.js";
import { logger } from "../helpers/logger";

let payer_keypair:any = null,
  token_address:any = null,
  percentage:any = null,
  cluster = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token <ADDRESS_TOKEN>", "Specify the token address")
  .option("--percentage <SELL_PERCENTAGE>", "Specify the percentage")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-h, --help", "display help for command")
  .action((options:any) => {
    if (options.help) {
      logger.info(
        "ts-node sell --token <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>"
      );
      process.exit(0);
    }
    if (!options.token || !options.percentage) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    if (options.payer) {
      payer_keypair = options.payer;
    }
    token_address = options.token;
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
export async function sell(side:string, address:string, sell_percentage:number, payer:Keypair) {
  await swap(side, address, -1, sell_percentage, payer, "trade");
}
export async function main() {
  let payer_wallet = null;
  if (payer_keypair !== null) {
    payer_wallet = await loadOrCreateKeypair_wallet(payer_keypair); // specified wallet by user in command
    sell("sell", token_address, percentage, payer_wallet);
  } else {
    sell("sell", token_address, percentage, wallet); // default pre-defined wallet
  }
}
main();
