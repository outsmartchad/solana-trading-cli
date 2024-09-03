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
import { GRPC_XTOKEN, GRPC_URL } from "../constants/constants";
import { token } from "@metaplex-foundation/js";
let trader_balance_wallet:any = {};
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

export async function checkIfRug(data: any, token_address: string) {
  const suspiciousAddresses: { [key: string]: number } = {};
  const threshold = 1000; // Define a threshold for suspicious inflow

  data.transaction.message.instructions.forEach((instruction: any) => {
    if (instruction.programId === token_address) {
      // Decode the instruction data from base58
      const decodedInstruction = bs58.decode(instruction.data);

      // Extract the destination address (bytes 1 to 33)
      const destination = new PublicKey(decodedInstruction.slice(1, 33)).toString();

      // Extract the amount (bytes 33 to 41) and convert to integer
      const amountBuffer = decodedInstruction.slice(33, 41);
      const amount = parseInt(Buffer.from(amountBuffer).toString('hex'), 16);

      // Track the inflow to the destination address
      if (!suspiciousAddresses[destination]) {
        suspiciousAddresses[destination] = 0;
      }
      suspiciousAddresses[destination] += amount;

      // Log a warning if the inflow exceeds the threshold
      if (suspiciousAddresses[destination] > threshold) {
        logger.warn(`Suspicious inflow detected to address: ${destination}, amount: ${suspiciousAddresses[destination]}`);
      }
    }
  });
}

export async function streamTargetTrader(token_address: string) {
  try {
    logger.info("Target token to monitor if it's going to rug: ", token);

    const stream = await client.subscribe();
    const r1 = await createSubscribeTokenRequest(token_address);
    handleSubscribe(stream, r1);
    stream.on("data", (data) => {
      if (data.transaction !== undefined) {
        logger.info(`Current slot: ${data.transaction.slot}`);
        checkIfRug(data, token_address); // Call the checkIfRug function
      }
    });
  } catch (e) {
    logger.error(e);
    throw e;
  }
}
