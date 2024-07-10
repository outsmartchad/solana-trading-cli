const { PublicKey } = require("@solana/web3.js");
const {buy} = require("./tools");
const { program } = require("commander");
let token_address = null, sol = null;
program
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--sol <NUMBER_OF_SOL>", "Specify the number of SOL")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node buy --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>"
      );
      process.exit(0);
    }
    if (!options.token_address || !options.sol) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    token_address = options.token_address;
    sol = options.sol;
  });
program.parse();


buy(new PublicKey(token_address), sol);

