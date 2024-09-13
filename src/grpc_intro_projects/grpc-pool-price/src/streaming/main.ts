import {streamPoolsPrice} from "./stream-price"
import { logger } from "../../../../helpers/logger";
import { fork } from "child_process";
import bs58 from "bs58";
import {fetchPoolsFromTokens} from "../data"
import path from "path";
import { program } from "commander";
import { fetchAMMPoolId } from "../../../../raydium/Pool/fetch_pool";
let oneToken = "";
program
  .option("--token <TOKEN_ADDRESS>", "Specify the token address to copy")
  .option("-h, --help", "display help for command")
  .action((options: any) => {
    if (options.help) {
      logger.info("ts-node main --token <TOKEN_ADDRESS>");
      process.exit(0);
    }
    if (options.token) {
        oneToken = options.token;
    }
  });
program.parse();

async function snipe() {
  // show the options
  if(oneToken !== ""){
    logger.info(`We are going to track the price of ${oneToken}`);
  }else{
    logger.info(`We are going to track the price of all the tokens from src/data/tokens.txt`);
  }
  
  let pools = [];
  if(oneToken !== ""){
    const pool = await fetchAMMPoolId(oneToken);
    pools.push(pool);
  }else{
    pools = await fetchPoolsFromTokens();
  }
  // initialize the bot
  try {
    // Start copy_buy in a separate process
    await streamPoolsPrice(pools);
  } catch (e) {
    logger.error(`error when streaming ${e}`);
    logger.info("Retrying in 1 second");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await snipe();
  }
}

snipe();
