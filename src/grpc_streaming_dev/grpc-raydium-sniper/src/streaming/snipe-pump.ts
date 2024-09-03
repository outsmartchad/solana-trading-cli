import {streamNewTokens} from "./raydium"
import {streamOpenbook} from "./openbook"
import {init} from "../transaction/transaction"
const {program} = require("commander")
let targetTokenToSnipe:string = "";

program.option("--token <TOKEN_ADDRESS>", "Specify the token you want to snipe")
  .option("-h, --help", "display help for command")
  .action((options:any) => {
    if (options.help) {
      console.log(
        "ts-node snipe-pump.ts --token <TOKEN_ADDRESS>"
      );
      process.exit(0);
    }
    if (!options.token ) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    targetTokenToSnipe = options.token
  });
program.parse();

async function snipe(){
    console.log(`Siping ${targetTokenToSnipe}`)
    await init();
    streamNewTokens("pump", targetTokenToSnipe)
    streamOpenbook("pump", targetTokenToSnipe)
}

snipe();