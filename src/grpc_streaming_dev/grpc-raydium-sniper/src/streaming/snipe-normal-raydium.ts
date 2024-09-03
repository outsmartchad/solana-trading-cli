import {streamNewTokens} from "./raydium"
import {streamOpenbook} from "./openbook"
import {init} from "../transaction/transaction"
const {program} = require("commander");
let targetTokenToSnipe:string = "";

program.option("--targetToken <TOKEN_ADDRESS>", "Specify the token you want to snipe")
  .option("-h, --help", "display help for command")
  .action((options:any) => {
    if (options.help) {
      console.log(
        "ts-node snipe-normal-raydium.ts --targetToken <TOKEN_ADDRESS>"
      );
      process.exit(0);
    }
    if (!options.targetToken){
      console.error("❌ Missing required options");
      process.exit(1);
    }
    targetTokenToSnipe = options.targetToken
  });
program.parse();

async function snipe(){
    console.log(`Siping ${targetTokenToSnipe}`)
    await init();
    streamNewTokens("normal", targetTokenToSnipe)
    streamOpenbook("normal", targetTokenToSnipe)
}

snipe();