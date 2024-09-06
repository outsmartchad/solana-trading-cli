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

    targetTokenToSnipe = options.targetToken
  });
program.parse();

async function snipe(){
    console.log(`Siping ${targetTokenToSnipe}`)
    await init();
    if(targetTokenToSnipe!== ""){
      streamNewTokens("normal", targetTokenToSnipe)
      streamOpenbook("normal", targetTokenToSnipe)
    }else{
      streamNewTokens("normal", "");
      streamOpenbook("normal", "");
    }
}

snipe();