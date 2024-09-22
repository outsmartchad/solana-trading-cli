import { swap } from "./Pool/swap";
import { program } from "commander";
import { loadOrCreateKeypair_wallet } from "../helpers/util";
import { wallet } from "../helpers/config";
import { Keypair } from "@solana/web3.js";
import { logger } from "../helpers/logger";

let payer_keypair:any = null,
  token_address:any = null,
  sol:any = null,
  cluster:any = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token <ADDRESS_TOKEN>", "Specify the token address")
  .option("--sol <NUMBER_OF_SOL>", "Specify the number of SOL")
  .option("--cluster <CLUSTER>", "Specify the cluster")
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
    if (options.payer) {
      payer_keypair = options.payer;
    }
    token_address = options.token;
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
async function buy(side:string, address:string, no_of_sol:number, payer:Keypair) {
  let payer_wallet = null;
  if (payer_keypair !== null) {
    payer_wallet = await loadOrCreateKeypair_wallet(payer_keypair);
    await swap(side, address, no_of_sol, -1, payer_wallet, "trade");
  } else {
    await swap(side, address, no_of_sol, -1, wallet, "trade");
  }
}

buy("buy", token_address, sol, payer_keypair);
