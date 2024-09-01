import {
    CommitmentLevel,
    SubscribeRequest,
  } from "@triton-one/yellowstone-grpc";
import { req } from "pino-std-serializers";
export async function createSubscribeTokenRequest(mintAddress: string) {
    let request: any = null;
    request = {
      slots: {},
      accounts: {},
      transactions: {
        pumpdotfun: {
          vote: false,
          failed: false,
          signature: undefined,
          accountInclude: [mintAddress],
          accountExclude: [],
          accountRequired: [mintAddress],
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


