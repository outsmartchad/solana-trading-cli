import { swap } from "../../../Pool/swap.js";
import { program } from "commander";
import { loadOrCreateKeypair_wallet } from "../../../Pool/util.js";
// node buy --payer <PATH_TO_SECRET_KEY> --token-address <ADDRESS_TOKEN> --SOL <NUMBER_OF_SOL> --cluster <CLUSTER>
let payer_keypair = null,
  token_address = null,
  sol = null,
  cluster = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--sol <NUMBER_OF_SOL>", "Specify the number of SOL")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node buy --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL> --cluster <CLUSTER>"
      );
      process.exit(0);
    }
    if (
      !options.payer ||
      !options.token_address ||
      !options.sol ||
      !options.cluster
    ) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    payer_keypair = options.payer;
    token_address = options.token_address;
    sol = options.sol;
    cluster = options.cluster;
  });
program.parse();

async function buy(side, address, no_of_sol, payer) {
  await swap(side, address, no_of_sol, -1, payer);
}
const payer_wallet = await loadOrCreateKeypair_wallet(payer_keypair);
buy("buy", token_address, sol, payer_wallet);
