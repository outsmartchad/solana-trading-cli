import { logger } from "../helpers/logger";
import {sell} from "./swap"
import { program } from "commander";
import {getSPLTokenBalance} from "../helpers/check_balance"
import { connection, wallet } from "../helpers/config";
import { PublicKey } from "@solana/web3.js";

let token:string="",
  percentage:number=0;
program
  .option("--token <ADDRESS_TOKEN>", "Specify the token address")
  .option("--percentage <SELL_PERCENTAGE>", "Specify the sell percentage")
  .option("-h, --help", "display help for command")
  .action((options) => {
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
    token = options.token;
    percentage = options.percentage;
  });
program.parse();

/**
 * Sell function to perform a swap on the Meteora DEX.
 *
 * @param {string} side - The side of the trade (buy/sell).
 * @param {string} token_address - The address of the token to trade.
 * @param {number} sell_percentage - The sell percentage.
 * @returns {Promise<void>} - A promise that resolves when the swap is completed.
 */
async function sell_cli(side:string, token_address:string, sell_percentage:number) {
  const balance = await getSPLTokenBalance(connection, new PublicKey(token_address), wallet.publicKey);
  await sell(token_address, balance*percentage/100, 1); // using 1% slippage
}
sell_cli("sell", token, percentage);
