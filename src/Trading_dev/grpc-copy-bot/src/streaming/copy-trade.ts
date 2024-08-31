import { streamTargetTrader } from "./stream-trader";
import { init } from "../transaction/transaction";
import { logger } from "../../../../helpers/logger";
import { fork } from "child_process";
import bs58 from "bs58";
import path from "path";
export const stream_trader_path = path.join(__dirname, "stream-trader.ts");
import { program } from "commander";
let targetTraderToCopy: string = "";

program
  .option("--trader <TRADER_ADDRESS>", "Specify the trader you want to copy")
  .option("-h, --help", "display help for command")
  .action((options: any) => {
    if (options.help) {
      logger.info("ts-node copy-trade.ts --trader <TRADER_ADDRESS_TO_COPY>");
      process.exit(0);
    }
    if (options.trader) {
      targetTraderToCopy = options.trader;
    }
  });
program.parse();

async function snipe() {
  // show the options
  logger.info(`Trader: ${targetTraderToCopy}`);
  // show the target token
  logger.info(`bot will copy the trades from ${targetTraderToCopy}.`);

  // initialize the bot
  await init();
  try {
    // Start copy_buy in a separate process
    await streamTargetTrader(targetTraderToCopy);
  } catch (e) {
    logger.error(`error when streaming ${e}`);
    logger.info("Retrying in 1 second");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await snipe();
  }
}

snipe();
