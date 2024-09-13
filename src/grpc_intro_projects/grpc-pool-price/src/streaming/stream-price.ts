import pino from "pino";
import Client from "@triton-one/yellowstone-grpc";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  createClearAllSubscriptionsRequest,
  createSubscribePoolsRequest,
} from "./grpc-requests-type";
import { handleSubscribe, wsol } from "./utils";
import { getSPLBalance, retriveWalletState } from "../../../../utils";
import { connection, wallet, GRPC_XTOKEN, GRPC_URL } from "../constants/constants";
let trader_balance_wallet:any = {};
let targetTrader = "";
export const raydium_authority = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"; // ***it represent the person who extract/put the sol/token to the pool for every raydium swap txn***
const client = new Client(
  GRPC_URL,
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

(async () => {
  const version = await client.getVersion(); // gets the version information
  logger.info(version);
})();

export async function checkPoolPrice(data: any) {
  const preTokenBalances = data.transaction.transaction.meta.preTokenBalances;
  const postTokenBalances = data.transaction.transaction.meta.postTokenBalances;
  const latestBlockhash = await connection.getLatestBlockhash("processed");
  let targetToken = "", postPoolSOL=0, postPoolToken=0, prePoolSOL=0, prePoolToken=0, side = "";
  // look for the token that the trader is buying or selling
  for (const account of preTokenBalances) {
    if (targetToken !== "" && prePoolSOL !== 0 && prePoolToken!==0) break; // make sure we get the target token and pool sol balances and trader address only
    if (account.owner === raydium_authority && account.mint !== wsol) targetToken = account.mint;
    if (account.owner === raydium_authority && account.mint === wsol) {
      prePoolSOL = account.uiTokenAmount.uiAmount;
    }
    if (account.owner === raydium_authority && account.mint !== wsol) {
      prePoolToken = account.uiTokenAmount.uiAmount;
    }
  }
 for (const account of postTokenBalances) {
    if (postPoolSOL !== 0 && postPoolToken!==0) break; // make sure we get the target token and pool sol balances and trader address only
    if (account.owner === raydium_authority && account.mint !== wsol ) targetToken = account.mint;
    if (account.owner === raydium_authority && account.mint === wsol) {
      postPoolSOL = account.uiTokenAmount.uiAmount;
    }
    if (account.owner === raydium_authority && account.mint !== wsol) {
      postPoolToken = account.uiTokenAmount.uiAmount;
    }
  }
  if (targetToken === "") return;
  logger.info(`The current price in SOL of ${targetToken} is ${postPoolSOL/postPoolToken}`)


  
}

export async function streamPoolsPrice(pools:string[]) {
  try {

    const stream = await client.subscribe();
    const r1 = await createSubscribePoolsRequest(pools);
    handleSubscribe(stream, r1);
    stream.on("data", (data) => {
      // receive an update when trader makes a transaction
      if (data.transaction !== undefined) {
        logger.info(`Current slot: ${data.transaction.slot}`);
        checkPoolPrice(data);
      }
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}
