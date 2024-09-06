import { CommitmentLevel, SubscribeRequest } from "@triton-one/yellowstone-grpc";
import pino from "pino";
import Client from "@triton-one/yellowstone-grpc";
import { LIQUIDITY_STATE_LAYOUT_V4, MARKET_STATE_LAYOUT_V3 } from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { bufferRing } from "./openbook";
import { buy } from "../transaction/transaction";
import { storeJitoLeaderSchedule } from "../jito/bundle";
import {GRPC_XTOKEN, GRPC_URL} from "../constants"
const client:any = new Client(GRPC_URL, GRPC_XTOKEN, undefined); //grpc endpoint 
let snipeCache:string[] = [] // to avoid duplicate sniping same token

const transport = pino.transport({
  target: 'pino-pretty',
});

export const logger = pino(
  {
    level: 'info',
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  transport,
);

// Array to store Jito leaders for current epoch
let leaderSchedule = new Set<number>();

// Function to populate the Jito leader array
export async function populateJitoLeaderArray() {
  leaderSchedule = await storeJitoLeaderSchedule();
}

// uncomment this line to enable Jito leader schedule check and delete the return line.
function slotExists(slot: number): boolean {
  //return leaderSchedule.has(slot);
  return true
}


(async () => {
  const version = await client.getVersion(); // gets the version information
  console.log(version);
})();

let latestBlockHash: string = "";

export async function streamNewTokens(snipeTokenType:string, targetToken:string) {
  const stream = await client.subscribe();
  // Collecting all incoming events.
  stream.on("data", (data:any) => {
    if (data.blockMeta) {
      latestBlockHash = data.blockMeta.blockhash;
    }

    if (data.account != undefined) {
      logger.info(`New token alert!`);
      let slotCheckResult = false;
      let slotCheck = Number(data.account.slot);
      for (let i = 0; i < 2; i++) {
        logger.info(`Start slot check. Attempt ${i}`);
        const exists = slotExists(slotCheck + i);
        logger.info(`End slot check`);
        if (exists === true) {
          slotCheckResult = true;
          break;
        }
      }

      if (slotCheckResult) {
        const poolstate = LIQUIDITY_STATE_LAYOUT_V4.decode(data.account.account.data);
        const tokenAccount = new PublicKey(data.account.account.pubkey);
        logger.info(`Token Account: ${tokenAccount}`);
        let TokenToBuy = (snipeTokenType==="pump")?poolstate.quoteMint:poolstate.baseMint;
        let Attempt = 0;
        const maxAttempts = 3;
        const intervalId = setInterval(async () => {
          const marketDetails = bufferRing.findPattern(poolstate.baseMint);
          console.log("Token incoming: ", TokenToBuy);
          console.log("Market Details: ", marketDetails)
          if(targetToken !== "" && TokenToBuy.toBase58() !== targetToken) clearInterval(intervalId);
          else if (Buffer.isBuffer(marketDetails)) {
            const fullMarketDetailsDecoded = MARKET_STATE_LAYOUT_V3.decode(marketDetails);
            const marketDetailsDecoded = {
              bids: fullMarketDetailsDecoded.bids,
              asks: fullMarketDetailsDecoded.asks,
              eventQueue: fullMarketDetailsDecoded.eventQueue,
            };
            console.log(`Sniping ${targetToken}`)
            if(TokenToBuy.toBase58() === targetToken) buy(latestBlockHash, tokenAccount, poolstate, marketDetailsDecoded, snipeTokenType);
            else {
              if(targetToken === "") buy(latestBlockHash, tokenAccount, poolstate, marketDetailsDecoded, snipeTokenType);
            }
            clearInterval(intervalId);
          } else if(Attempt>=maxAttempts){
            logger.error("Invalid market details")
            clearInterval(intervalId)
          }
        }, 1); // send tx per 10ms
      }
      else {
        logger.info(`No up coming Jito leaders. Slot: ${data.account.slot}`)
      }



    }
  });
  let tokenTypeFilter = (snipeTokenType==="pump")?{
    "memcmp": {
      "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint').toString(), // Filter for the target token we want to snipe
      "base58": "So11111111111111111111111111111111111111112"
    }
  }:{
    "memcmp": {
      "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint').toString(), // Filter for the target token we want to snipe
      "base58": "So11111111111111111111111111111111111111112"
    }
  }
  // Create a subscription request.
  const request: SubscribeRequest = {
    "slots": {},
    "accounts": {
      "raydium": {
        "account": [],
        "filters": [
          tokenTypeFilter,
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId').toString(), // Filter for only Raydium markets that contain references to Serum
              "base58": "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"
            }
          },
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('swapQuoteInAmount').toString(), // Hack to filter for only new tokens. There is probably a better way to do this
              "bytes": Uint8Array.from([0])
            }
          },
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('swapBaseOutAmount').toString(), // Hack to filter for only new tokens. There is probably a better way to do this
              "bytes": Uint8Array.from([0])
            }
          }
        ],
        "owner": ["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"] // raydium program id to subscribe to
      }
    },
    "transactions": {},
    "blocks": {},
    "blocksMeta": {
      "block": []
    },
    "accountsDataSlice": [],
    "commitment": CommitmentLevel.PROCESSED,  // Subscribe to processed blocks for the fastest updates
    entry: {}
  }

  // Sending a subscription request.
  await new Promise<void>((resolve, reject) => {
    stream.write(request, (err: null | undefined) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject(err);
      }
    });
  }).catch((reason) => {
    console.error(reason);
    throw reason;
  });
}
