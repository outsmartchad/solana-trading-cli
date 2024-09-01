import {streamAnyNewTokens, streamTargetNewToken} from "./pump.fun"
import {AUTO_SELL_TIMEOUT} from "../constants"
import {init} from "../transaction/transaction"
import { logger } from "../utils/logger";
const {program} = require("commander")
let targetTokenToSnipe:string = "";
let isAutoSell = false;
let sellAfterNumberBuys = 1
let isJito = false;
let n = 1;

program.option("--token <TOKEN_ADDRESS>", "Specify the token you want to snipe")
  .option("-h, --help", "display help for command")
  .option("--auto-sell", "Auto sell token after buying")
  .option("--sell-after <NUMBER>", "Sell token after number of buys")
  .option("--n <NUMBER>", "number of tokens to snipe")
  .option("--jito", "Jito mode")
  .action((options:any) => {
    if (options.help) {
      logger.info(
        "ts-node snipe-create.ts --token <TOKEN_ADDRESS> --sell-after <SELL_TOKEN_AFTER_NUMBER_OF_BUYS> --n <NUMBER_OF_TOKEN_TO_SNIPE> --auto-sell --jito"
      );
      process.exit(0);
    }
    if(options.token){
        targetTokenToSnipe = options.token
    }
    if(options.autoSell){
        isAutoSell = true;
    }
    if(options.sellAfter){
        sellAfterNumberBuys = options.sellAfter;
    }
    if(options.jito){
        isJito = true;
    }
    if(options.n){
        n = options.n;
    }
  });
program.parse();

async function snipe(){

   // show the options
    logger.info(`Auto sell mode enabled: ${isAutoSell}`)
    logger.info(`Sell after: ${sellAfterNumberBuys} buys`)
    logger.info(`Jito mode enabled: ${isJito}`)
    logger.info(`Number of tokens to snipe: ${n}`)
    if(isAutoSell){
      logger.info(`Auto sell after ${AUTO_SELL_TIMEOUT} seconds`)
    }
    // show the target token
    if(targetTokenToSnipe === ""){
      logger.info("bot will snipe any new tokens")
    }
    else logger.info(`bot will snipe ${targetTokenToSnipe}`)

    // initialize the bot
    await init();
      // stream the tokens and auto-sell when condition is met
      try{
        if(targetTokenToSnipe === ""){
            await streamAnyNewTokens(isAutoSell, sellAfterNumberBuys, isJito, n);
        }else{
            await streamTargetNewToken(targetTokenToSnipe, isAutoSell, sellAfterNumberBuys, isJito);
        }
      }catch(e){
        logger.error(`error when streaming ${e}`);
      }
    
    
}

snipe();