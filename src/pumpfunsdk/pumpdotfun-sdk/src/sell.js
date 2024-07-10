const {sell} = require('./tools');
const { PublicKey } = require("@solana/web3.js");
const { program } = require("commander");
let token_address = null, sellPercentage = null;
program
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--percentage <SELL_PERCENTAGE>", "Specify the percentage of token to sell")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node sell --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>"
      );
      process.exit(0);
    }
    if (!options.token_address || !options.percentage) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    token_address = options.token_address;
    sellPercentage = options.percentage;
  });
program.parse();


sell(new PublicKey(token_address), sellPercentage/100);