import { logger } from "../utils/logger";
const {program} = require("commander")
let targetTokenToMonitor:string = "";

program.option("--token <TOKEN_ADDRESS>", "Specify the token you want to monitor")
  .option("-h, --help", "display help for command")
  .action((options:any) => {
    if (options.help) {
      logger.info(
        "ts-node rug-detection.ts --token <TOKEN_ADDRESS>"
      );
      process.exit(0);
    }
    if(options.token){
        targetTokenToMonitor = options.token
    }
  });
program.parse();

async function snipe(){

   // show the options
    logger.info(`Will monitor the token: ${targetTokenToMonitor}`);
    

      try{
        
      }catch(e){
        logger.error(`error when streaming ${e}`);
      }
    
    
}

snipe();