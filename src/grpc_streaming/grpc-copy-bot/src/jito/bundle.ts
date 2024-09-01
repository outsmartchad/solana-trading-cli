import {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
  MessageV0,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types";
import * as Fs from "fs";
require("dotenv").config();
import { searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import {
  ChannelCredentials,
  ChannelOptions,
  ClientReadableStream,
  ServiceError,
} from "@grpc/grpc-js";
import { SearcherServiceClient } from "jito-ts/dist/gen/block-engine/searcher";
import {
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  JITO_TIPS,
} from "../constants";

import bs58 from "bs58";
import { logger } from "../../../../helpers/logger";
import { bundle } from "jito-ts";
const blockEngineUrl = process.env.BLOCK_ENGINE_URL || "";
logger.info(`BLOCK_ENGINE_URL: ${blockEngineUrl}`);
const c = searcherClient(blockEngineUrl, undefined);
export const searcherClientAdv = (
  url: string,
  authKeypair: Keypair | undefined,
  grpcOptions?: Partial<ChannelOptions>
): SearcherServiceClient => {
  const client: SearcherServiceClient = new SearcherServiceClient(
    url,
    ChannelCredentials.createSsl(),
    { ...grpcOptions }
  );

  return client;
};

// Get Tip Accounts

let tipAccounts: string[] = [];
(async () => {
  try {
    tipAccounts = await c.getTipAccounts();
    // console.log('Result:', tipAccounts);
  } catch (error) {
    console.error("Error:", error);
  }
})();

export async function sendBundle(
  latestBlockhash: string,
  transaction: VersionedTransaction,
  poolId: PublicKey,
  masterKeypair: Keypair
) {
  try {
    const _tipAccount = tipAccounts[Math.floor(Math.random() * 6)];
    const tipAccount = new PublicKey(_tipAccount);
    const b = new Bundle([transaction], 4);
    const jito_tips = parseFloat(JITO_TIPS);
    b.addTipTx(
      masterKeypair,
      jito_tips * LAMPORTS_PER_SOL, // Adjust Jito tip amount here
      tipAccount,
      latestBlockhash
    );
    logger.info(`Sending bundle`);
    const bundleResult = await c.sendBundle(b);
    logger.info(`Sent trade tx to jito!`);
    logger.info({
      dexscreener: `https://dexscreener.com/solana/${poolId.toBase58()}?maker=${masterKeypair.publicKey.toBase58()}`,
    });
  } catch (error) {
    logger.error(error);
  }
}

// Get leader schedule

// This was when I was experimenting with only sending the buy tx when a Jito leader was up or going to be up in the next slot so that I wouldn't
// have to wait multiple slots for the tx to be processed. I ended up not using this feature as it couldn't get it working correctly before I moved on.

export async function storeJitoLeaderSchedule() {
  const cs = searcherClientAdv(blockEngineUrl, undefined);

  const leaderSchedule = new Set<number>();

  cs.getConnectedLeadersRegioned(
    { regions: ["tokyo", "amsterdam", "ny", "frankfurt"] },
    (error, response) => {
      for (let key in response) {
        if (key === "connectedValidators") {
          let validators = response[key];
          for (let validatorKey in validators) {
            // Each validator object
            let validator = validators[validatorKey];
            // Assuming `slots` is an array inside each validator object
            Object.keys(validator.connectedValidators).forEach(
              (key: string) => {
                const slotsArray: number[][] = Object.values(
                  validator.connectedValidators[key]
                ); // Assume SlotList is an array of arrays
                const flattenedSlotsArray: number[] = slotsArray.flat(); // Flatten the array
                flattenedSlotsArray.forEach((slot: number) => {
                  leaderSchedule.add(slot);
                });
              }
            );
          }
        }
      }

      //console.log(leaderSchedule);
    }
  );

  return leaderSchedule;
}
