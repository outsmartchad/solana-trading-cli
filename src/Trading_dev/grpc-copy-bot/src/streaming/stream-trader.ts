import pino from "pino";
import Client from "@triton-one/yellowstone-grpc";
import { PublicKey } from "@solana/web3.js";
import { storeJitoLeaderSchedule, sendBundle } from "../jito/bundle";
import bs58 from "bs58";
import {
  createClearAllSubscriptionsRequest,
  createSubscribeTraderRequest,
} from "./grpc-requests-type";
import { handleSubscribe, wsol } from "./utils";
import { getSPLBalance, retriveWalletState } from "../../../../utils";
import { connection, quoteToken, wallet, GRPC_XTOKEN } from "../constants/constants";
import { sell, buy } from "../raydium";
let trader_balance_wallet:any = {};
let targetTrader = "";
const client = new Client(
  "https://grpc.fra.shyft.to",
  GRPC_XTOKEN,
  {
    "grpc.max_receive_message_length": 64 * 1024 * 1024, // 64MiB
  }
); //grpc endpoint
const transport = pino.transport({
  target: "pino-pretty",
});

export const logger = pino(
  {
    level: "info",
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  transport
);
// Array to store Jito leaders for current epoch
let leaderSchedule = new Set<number>();
export async function populateJitoLeaderArray() {
  leaderSchedule = await storeJitoLeaderSchedule();
}

(async () => {
  const version = await client.getVersion(); // gets the version information
  logger.info(version);
})();

export async function checkTraderBuyOrSell(data: any, traderAddress: string) {
  const preTokenBalances = data.transaction.transaction.meta.preTokenBalances;
  const postTokenBalances = data.transaction.transaction.meta.postTokenBalances;
  const latestBlockhash = await connection.getLatestBlockhash("processed");
  let targetToken = "";
  // look for the token that the trader is buying or selling
  for (let i = 0; i < preTokenBalances.length; i++) {
    if (
      preTokenBalances[i].owner === traderAddress &&
      preTokenBalances[i].mint !== wsol
    ) {
      targetToken = preTokenBalances[i].mint;
      break;
    }
  }
  for (let i = 0; i < postTokenBalances.length; i++) {
    if (
      postTokenBalances[i].owner === traderAddress &&
      postTokenBalances[i].mint !== wsol
    ) {
      targetToken = postTokenBalances[i].mint;
      break;
    }
  }
  if (targetToken === "") return;
  const old_wallet_state = trader_balance_wallet;
  trader_balance_wallet = await retriveWalletState(traderAddress);
  console.log("Old wallet state: ", old_wallet_state);
  console.log("New wallet state: ", trader_balance_wallet);
  if (trader_balance_wallet[wsol] < old_wallet_state[wsol]) {
    logger.info(`Trader is buying ${targetToken} using WSOL`);
    let buy_percentage = Math.abs(
      (trader_balance_wallet[wsol] - old_wallet_state[wsol]) /
        old_wallet_state[wsol]
    );
    console.log("Buy percentage: ", buy_percentage);
    const ourWsolBalance = await getSPLBalance(
      connection,
      new PublicKey(wsol),
      wallet.publicKey
    );
    console.log(`We are using ${ourWsolBalance * buy_percentage} WSOL`);
    const { pool, txn } = await buy(
      "buy",
      targetToken,
      buy_percentage * ourWsolBalance,
      wallet
    );
    sendBundle(latestBlockhash.blockhash, txn, pool, wallet);
  } else if (trader_balance_wallet[wsol] > old_wallet_state[wsol]) {
    logger.info(`Trader is selling ${targetToken} for WSOL`);
    let newBalanceOfToken = 0;
    if (targetToken in trader_balance_wallet)
      newBalanceOfToken = trader_balance_wallet[targetToken];
    let sell_percentage = Math.abs(
      (newBalanceOfToken - old_wallet_state[targetToken]) /
        old_wallet_state[targetToken]
    );
    console.log("Sell percentage: ", sell_percentage);
    const ourTokenBalance = await getSPLBalance(
      connection,
      new PublicKey(targetToken),
      wallet.publicKey
    );
    if (ourTokenBalance === 0) {
      logger.info(`We don't have any ${targetToken} to sell`);
      return;
    }
    const { pool, txn } = await sell(
      "sell",
      targetToken,
      sell_percentage,
      wallet
    );
    sendBundle(latestBlockhash.blockhash, txn, pool, wallet);
    // wait for 1 second and send again
    await new Promise((resolve) => setTimeout(resolve, 1000));
    sendBundle(latestBlockhash.blockhash, txn, pool, wallet);
  } else if (trader_balance_wallet["SOL"] < old_wallet_state["SOL"]) {
    logger.info(`Trader is buying ${targetToken} using SOL`);
    let buy_percentage = Math.abs(
      (trader_balance_wallet["SOL"] - old_wallet_state["SOL"]) /
        old_wallet_state["SOL"]
    );
    console.log("Buy percentage: ", buy_percentage);
    const ourWsolBalance = await getSPLBalance(
      connection,
      new PublicKey(wsol),
      wallet.publicKey
    );
    console.log(`We are using ${ourWsolBalance * buy_percentage} WSOL`);
    const { pool, txn } = await buy(
      "buy",
      targetToken,
      buy_percentage * ourWsolBalance,
      wallet
    );
    sendBundle(latestBlockhash.blockhash, txn, pool, wallet);
  } else if (trader_balance_wallet["SOL"] > old_wallet_state["SOL"]) {
    logger.info(`Trader is selling ${targetToken} for SOL`);
    let newBalanceOfToken = 0;
    if (targetToken in trader_balance_wallet)
      newBalanceOfToken = trader_balance_wallet[targetToken];
    let sell_percentage = Math.abs(
      (newBalanceOfToken - old_wallet_state[targetToken]) /
        old_wallet_state[targetToken]
    );
    console.log("Sell percentage: ", sell_percentage);
    const ourTokenBalance = await getSPLBalance(
      connection,
      new PublicKey(targetToken),
      wallet.publicKey
    );
    if (ourTokenBalance === 0) {
      logger.info(`We don't have any ${targetToken} to sell`);
      return;
    }
    const { pool, txn } = await sell(
      "sell",
      targetToken,
      sell_percentage,
      wallet
    );
    sendBundle(latestBlockhash.blockhash, txn, pool, wallet);
    // wait for 1 second and send again
    await new Promise((resolve) => setTimeout(resolve, 1000));
    sendBundle(latestBlockhash.blockhash, txn, pool, wallet);
  } else {
    // check if the trader is swapping tokens
    let increasedToken = "",
      decreasedToken = "";
    for (const mint in trader_balance_wallet) {
      if (mint === wsol || mint === "SOL") {
        continue;
      }
      if (increasedToken && decreasedToken) {
        break;
      }
      const prevBalance = old_wallet_state[mint] || 0;
      const currentBalance = trader_balance_wallet[mint];

      if (currentBalance > prevBalance) {
        increasedToken = mint;
      } else if (currentBalance < prevBalance) {
        decreasedToken = mint;
      }
    }
    if (increasedToken && decreasedToken) {
      logger.info(`Trader is swapping ${decreasedToken} for ${increasedToken}`);
      let swap_percentage = Math.abs(
        (trader_balance_wallet[decreasedToken] -
          old_wallet_state[decreasedToken]) /
          old_wallet_state[decreasedToken]
      );
      console.log("Swap percentage: ", swap_percentage);
      // we use wsol as the quote token to buy the increased token
      const ourWsolBalance = await getSPLBalance(
        connection,
        new PublicKey(wsol),
        wallet.publicKey
      );
      const { pool, txn } = await buy(
        "buy",
        increasedToken,
        swap_percentage * ourWsolBalance,
        wallet
      );
      sendBundle(latestBlockhash.blockhash, txn, pool, wallet);
    }
  }
}

export async function streamTargetTrader(traderAddress: string) {
  try {
    console.log("Target trader: ", traderAddress);
    trader_balance_wallet = await retriveWalletState(traderAddress);
    console.log(trader_balance_wallet);

    const stream = await client.subscribe();
    // throw new Error("test"); // test if it restarts when error occurs
    // process.exit(1); // test if it restart when process exit
    // Create `error` / `end` handler
    const r1 = await createSubscribeTraderRequest(traderAddress);
    handleSubscribe(stream, r1);
    stream.on("data", (data) => {
      // receive an update when trader makes a transaction
      if (data.transaction !== undefined) {
        logger.info(`Current slot: ${data.transaction.slot}`);
        checkTraderBuyOrSell(data, traderAddress);
      }
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}
