import {
  CommitmentLevel,
  SubscribeRequest,
} from "@triton-one/yellowstone-grpc";
import pino from "pino";
import Client from "@triton-one/yellowstone-grpc";
import { PublicKey } from "@solana/web3.js";
import { buy, solanaConnection, sell } from "../transaction/transaction";
import { storeJitoLeaderSchedule } from "../jito/bundle";
import { AUTO_SELL, AUTO_SELL_TIMEOUT, GRPC_XTOKEN, GRPC_URL } from "../constants";
import * as borsh from "@coral-xyz/borsh";
import bs58 from "bs58";
import { Buffer } from "buffer";
import {createSubscribeNewTokenRequest, createClearAllSubscriptionsRequest, createSubscribeTokenRequest, createSubscribeTokenInSnipeCacheRequest} from "./grpc-requests-type"
import {handleSubscribe} from "./utils"

const client:any = new Client(
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
let leaderSchedule = new Set<number>();
export async function populateJitoLeaderArray() {
  leaderSchedule = await storeJitoLeaderSchedule();
}

(async () => {
  const version = await client.getVersion(); // gets the version information
  logger.info(version);
})();

/**
 * Waits for a specified timeout and then sells all tokens associated with the given mint address.
 * @param mintAddress - The address of the mint associated with the tokens to be sold.
 * @param isJito - A boolean value indicating whether the tokens are Jito tokens.
 */
export async function waitAndSellAll(mintAddress: string, isJito: boolean) {
  const strinToInt = parseInt(AUTO_SELL_TIMEOUT);
  console.log("Selling", mintAddress);
  try{
    await new Promise((resolve) => setTimeout(resolve, strinToInt*1000+1000)); // extra 1s to make sure the transaction is confirmed
    sell(new PublicKey(mintAddress), isJito);
  }catch(e){
    logger.error(`error when selling ${mintAddress}, ${e}`);
  }
}

/**
 * Subscribes to a stream and listens for new tokens and snipe it.
 * 
 * @param isAutoSell - Indicates whether to automatically sell tokens.
 * @param sellAfterNumberBuys - The number of buys after which to sell tokens.
 * @param isJito - Indicates whether to use Jito for buying and selling.
 */
export async function streamAnyNewTokens(isAutoSell: boolean, sellAfterNumberBuys: number, isJito: boolean, n: number) {
  const stream = await client.subscribe();
      // Create `error` / `end` handler

  // let sellQueue: string[] = [];
  let count = 0;
  let currentPumpFunToken: string = "";
  const r1: SubscribeRequest = await createSubscribeNewTokenRequest(undefined);
  handleSubscribe(stream, r1);
  stream.on("data", (data:any) => {
    if (data.transaction !== undefined) {
      // sellQueue = []; // clear the queue after selling all
      logger.info(`Current slot: ${data.transaction.slot}`);
      currentPumpFunToken = data.transaction.transaction.meta.postTokenBalances[0].mint
      logger.info(`New token created: ${currentPumpFunToken}`);
      if(count < n){
        buy(new PublicKey(currentPumpFunToken), isJito);
        logger.info(`Sniped ${1} times`);
        if(isAutoSell) waitAndSellAll(currentPumpFunToken, isJito);
        count += 1;
    }
    }
  });

}

/**
 * Subscribes to a stream and listens for new token creation transactions.
 * If the target token is created and meets the specified conditions, it performs a buy action.
 * @param mintAddress The address of the target token.
 * @param isAutoSell A boolean indicating whether to automatically sell after a certain number of buys.
 * @param sellAfterNumberBuys The number of buys after which to automatically sell.
 * @param isJito A boolean indicating whether to use Jito for the buy action.
 */
export async function streamTargetNewToken(mintAddress: string, isAutoSell: boolean, sellAfterNumberBuys: number, isJito: boolean) {
  const stream = await client.subscribe();
  let count = 0;
    // Create `error` / `end` handler
  const r1 = await createSubscribeNewTokenRequest(mintAddress);
  await handleSubscribe(stream, r1);
  stream.on("data", (data:any) => {
    if (data.transaction !== undefined) {
      logger.info(`Current slot: ${data.transaction.slot}`);
      logger.info(
        `Target token create tx: https://solscan.io/tx/${bs58.encode(Buffer.from(data.transaction.transaction.signature))}`
      );
      const pumpFunNewToken = data.transaction.transaction.meta.postTokenBalances[0].mint
      logger.info(`Traget token created: ${pumpFunNewToken}`);
      if (pumpFunNewToken === mintAddress && count === 0) {
        buy(new PublicKey(pumpFunNewToken), isJito);
        if(isAutoSell) waitAndSellAll(pumpFunNewToken, isJito);
        logger.info(`Sniped ${count + 1} times`);
        count += 1;
      }
    }
  });
}


