import {
    CommitmentLevel,
    SubscribeRequest,
  } from "@triton-one/yellowstone-grpc";
import Client from "@triton-one/yellowstone-grpc";
const PING_INTERVAL_MS = 30_000; 

export async function handleSubscribe(client_stream: any, args: SubscribeRequest){
 // Create `error` / `end` handler
 const streamClosed = new Promise<void>((resolve, reject) => {
 client_stream.on("error", (error:any) => {
     console.log("ERROR", error);
     reject(error);
     client_stream.end();
   });
   client_stream.on("end", () => {
     resolve();
   });
   client_stream.on("close", () => {
     resolve();
   });
 });

 // Send subscribe request
 await new Promise<void>((resolve, reject) => {
    client_stream.write(args, (err: any) => {
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
   // Send pings every 5s to keep the connection open
   const pingRequest: SubscribeRequest = {
    ping: { id: 1 },
    // Required, but unused arguments
    accounts: {},
    accountsDataSlice: [],
    transactions: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    slots: {},
  };
  setInterval(async () => {
    await new Promise<void>((resolve, reject) => {
        client_stream.write(pingRequest, (err:any) => {
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
  }, PING_INTERVAL_MS);

 await streamClosed;
}