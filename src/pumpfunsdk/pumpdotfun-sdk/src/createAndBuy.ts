import {createAndBuy} from "./tools";
// command line tool
import {program} from "commander";
import fs from "fs";
import { logger } from "../../../helpers/logger";

let sol:any = null, mintKeypair:any = null, name:any = null, symbol:any = null, 
description:any = null, telegram:any = null, twitter:any = null, website:any = null, file:any = null;
program.option("--pathToMintKeypair <PATH_TO_MINT_KEYPAIR>", "Specify the path to your own mint keypair")
  .option("--sol <NUMBER_OF_SOL>", "Specify the number of SOL you want to buy")
  .option("--name <TOKEN_NAME>", "Specify the token name")
  .option("--symbol <TOKEN_SYMBOL>", "Specify the token symbol")
  .option("--description <TOKEN_DESCRIPTION>", "Specify the token description") 
  .option("--telegram <TELEGRAM_LINK>", "Specify the telegram link")
  .option("--twitter <TWITTER_LINK>", "Specify the twitter link")
  .option("--website <WEBSITE_LINK>", "Specify the website link")
  .option("--file <FILE_PATH>", "Specify the file path")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      logger.info(
        "ts-node createAndBuy --pathToMintKeypair <PATH_TO_MINT_KEYPAIR> --sol <NUMBER_OF_SOL> --name <TOKEN_NAME> --symbol <TOKEN_SYMBOL> --description <TOKEN_DESCRIPTION> --telegram <TELEGRAM_LINK> --twitter <TWITTER_LINK> --website <WEBSITE_LINK> --file <FILE_PATH>"
      );
      process.exit(0);
    }
    if (!options.pathToMintKeypair || !options.sol || !options.name || !options.symbol || !options.description || !options.file) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    mintKeypair = options.pathToMintKeypair;
    sol = options.sol;
    name = options.name;
    symbol = options.symbol;
    description = options.description;
    telegram = options.telegram;
    twitter = options.twitter;
    website = options.website;
    file = options.file;
  });
program.parse();

async function main(){
    let tokenMetadata = {
        name: name,
        symbol: symbol,
        description: description,
        telegram: telegram,
        twitter: twitter,
        website: website,
        file: await fs.openAsBlob(
          file
        ),
      };
    createAndBuy(mintKeypair, tokenMetadata, sol);
}
main();

