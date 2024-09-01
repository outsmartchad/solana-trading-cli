import { logger } from "../helpers/logger";
import {swap} from "./Pool"
import { program } from "commander";

let token:string="",
  sol:number=0;
program
  .option("--token <ADDRESS_TOKEN>", "Specify the token address")
  .option("--sol <NUMBER_OF_SOL>", "Specify the number of SOL")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      logger.info(
        "ts-node buy --token <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>"
      );
      process.exit(0);
    }
    if (!options.token || !options.sol) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    token = options.token;
    sol = options.sol;
  });
program.parse();

/**
 * Buy function to perform a swap on the Meteora DEX.
 *
 * @param {string} side - The side of the trade (buy/sell).
 * @param {string} token_address - The address of the token to trade.
 * @param {number} no_of_sol - The amount of SOL to trade.
 * @returns {Promise<void>} - A promise that resolves when the swap is completed.
 */
async function buy(side:string, token_address:string, no_of_sol:number) {
  await swap(side, token_address, no_of_sol, -1);
}
buy("buy", token, sol);
