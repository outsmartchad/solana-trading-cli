import { swap } from "../../../Pool/swap.js";
import { program } from "commander";
import { loadOrCreateKeypair_wallet } from "../../../Pool/util.js";
// node sell.mjs --payer <PATH_TO_SECRET_KEY> --token-address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE> --cluster <CLUSTER>
let payer_keypair = null,
  token_address = null,
  percentage = null,
  cluster = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--percentage <SELL_PERCENTAGE>", "Specify the percentage")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node sell --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE> --cluster <CLUSTER>"
      );
      process.exit(0);
    }
    if (
      !options.payer ||
      !options.token_address ||
      !options.percentage ||
      !options.cluster
    ) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    payer_keypair = options.payer;
    token_address = options.token_address;
    percentage = options.percentage;
    cluster = options.cluster;
  });
program.parse();
async function sell(side, address, sell_percentage, payer) {
  await swap(side, address, -1, sell_percentage, payer);
}

const payer_wallet = await loadOrCreateKeypair_wallet(payer_keypair);
sell("sell", token_address, percentage, payer_wallet);
