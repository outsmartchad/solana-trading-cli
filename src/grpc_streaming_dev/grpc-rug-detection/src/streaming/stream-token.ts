import pino from "pino";
import Client from "@triton-one/yellowstone-grpc";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  createClearAllSubscriptionsRequest,
  createSubscribeTokenRequest,
} from "./grpc-requests-type";
import { handleSubscribe } from "./utils";
import { getSPLBalance, retriveWalletState } from "../../../../utils";
import { GRPC_XTOKEN } from "../constants/constants";
import { token } from "@metaplex-foundation/js";
let trader_balance_wallet:any = {};
export const raydium_authority = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"; // ***it represent the person who extract/put the sol/token to the pool for every raydium swap txn***
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


(async () => {
  const version = await client.getVersion(); // gets the version information
  logger.info(version);
})();

export async function checkIfRug(data: any, token_address: string) {
    

  
}

export async function streamTargetTrader(token_address: string) {
  try {
    logger.info("Target token to monitor if it's going to rug: ", token);


    const stream = await client.subscribe();
    // throw new Error("test"); // test if it restarts when error occurs
    // process.exit(1); // test if it restart when process exit
    // Create `error` / `end` handler
    const r1 = await createSubscribeTokenRequest(token_address);
    handleSubscribe(stream, r1);
    stream.on("data", (data) => {
      // receive an update when trader makes a transaction
      if (data.transaction !== undefined) {
        logger.info(`Current slot: ${data.transaction.slot}`);  
      }
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}
