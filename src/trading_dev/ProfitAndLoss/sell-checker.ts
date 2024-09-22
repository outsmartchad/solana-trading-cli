import { deleteBoughtTokens, getSPLTokenBalance, loadBoughtTokens, logExitPrice, readBoughtTokens, writeBoughtTokens} from "./utils";
import {checkStopLoss } from "./stop-loss"
import { checkTakeProfit } from "./take-profit";
import {retriveWalletState, writeLineToLogFile} from "./utils";
import { logger, retrieveEnvVariable } from "../../utils";
import {wsol, path_To_bought_tokens} from "./constants"
import {connection, wallet} from "../../helpers/config";
import { sell } from "../../raydium/sell_helper";
import Decimal from "decimal.js";
import { PublicKey, SYSVAR_EPOCH_SCHEDULE_PUBKEY } from "@solana/web3.js";
let boughtTokens:string[] = [], currentOurWalletState = {};

async function checkIsPricesHitTPorSL(){


    try{
    if(boughtTokens.length > 0){
      
    for(let i=0; i<boughtTokens.length; i++){
        let token = boughtTokens[i];
          let tokenObj = await readBoughtTokens(token, path_To_bought_tokens);
          const entry_price = tokenObj.entry_price;
          if(entry_price>0){ // check if already bought

            if(await checkTakeProfit(token, path_To_bought_tokens)){
                logger.info(`Take profit price reached for token ${token}`);
                writeLineToLogFile(`Take profit price reached for token ${token}`);
                const balance = await getSPLTokenBalance(connection, new PublicKey(token), wallet.publicKey); // check if still holding the token
                if(balance > 0) {
                logger.info(`selling ${token}...`);
                writeLineToLogFile(`selling ${token}...`);
                sell("sell", token, 100, wallet); // sell all
                
                }
                continue;
            }
            if(await checkStopLoss(token, path_To_bought_tokens)){
                logger.info(`Stop loss price reached for token ${token}`);
                writeLineToLogFile(`Stop loss price reached for token ${token}`);
                const balance = await getSPLTokenBalance(connection, new PublicKey(token), wallet.publicKey); // check if still holding the token
                if(balance > 0) {
                logger.info(`selling ${token}...`);
                writeLineToLogFile(`selling ${token}...`);
                sell("sell", token, 100, wallet); // sell all
                
                }
            }


          }
    }
    }
    }catch(err){
      console.log(err);

    }
      
}
export async function main() {
  logger.info("Starting sell...");
  while (true) {
    boughtTokens = await loadBoughtTokens(path_To_bought_tokens);

    // Run both check functions concurrently
    await Promise.all([
      checkIsPricesHitTPorSL().then(() => new Promise(resolve => setTimeout(resolve, 3000))),
    ]);

    // If you want a consistent delay after both checks are complete, you can add it here
    // await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
main();