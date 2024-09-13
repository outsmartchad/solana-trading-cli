import {
    CommitmentLevel,
    SubscribeRequest,
  } from "@triton-one/yellowstone-grpc";
import { req } from "pino-std-serializers";
const RaydiumProgram = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
const RaydiumRoute = "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS"
const RaydiumCAMM = "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
const tokenAccountProgram = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
export async function createSubscribePoolsRequest(pools: string[]) {
    let request: any = null;
    request = {
      slots: {},
      accounts: {},
      transactions: {
        pumpdotfun: {
          vote: false,
          failed: false,
          signature: undefined,
          accountInclude: [...pools],
          accountExclude: [],
          accountRequired: [RaydiumProgram],
        },
      },
      transactionsStatus: {},
      blocks: {},
      blocksMeta: {},
      accountsDataSlice: [],
      commitment: CommitmentLevel.PROCESSED, // Subscribe to processed blocks for the fastest updates
      entry: {},
    };
    return request;
}
export async function createClearAllSubscriptionsRequest() {
    const request = {
        "slots": {},
        "accounts": {},
        "transactions": {},
        "blocks": {},
        "blocksMeta": {},
        "accountsDataSlice": []
      };
    return request;
}


