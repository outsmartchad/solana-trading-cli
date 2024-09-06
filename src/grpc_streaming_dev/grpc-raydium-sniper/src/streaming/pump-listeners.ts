import { solanaConnection } from "../transaction/transaction";
const { Keypair, Connection } = require("@solana/web3.js");
const { PumpFunSDK } = require("pumpdotfun-sdk");
const { AnchorProvider } = require("@coral-xyz/anchor");

function getProvider() {
  const wallet = Keypair.generate();
  const provider = new AnchorProvider(solanaConnection, wallet, {
    commitment: "proccessed",
  });
  return provider;
}

async function subscribeToCompleteBondingCurveEvent(sdk: any) {
  const completeEventId = sdk.addEventListener(
    "completeEvent",
    (event: any, slot: any, signature: any) => {
      console.log("mint pubkey", event.mint.toBase58());
    }
  );
  console.log("Subscribed to completeEvent with ID:", completeEventId);
}
async function subscribeToCreatePumpTokenEvent(sdk: any) {
  const createEventId = sdk.addEventListener(
    "createEvent",
    (event: any, slot: any, signature: any) => {
      console.log("createEvent", event, slot, signature);
      console.log("mint pubkey", event.mint.toBase58());
    }
  );
  console.log("Subscribed to createEvent with ID:", createEventId);
}
async function subscribeToTradeEvent(sdk: any) {
  const tradeEventId = sdk.addEventListener(
    "tradeEvent",
    (event: any, slot: any, signature: any) => {
      console.log("tradeEvent", event, slot, signature);
    }
  );
  console.log("Subscribed to tradeEvent with ID:", tradeEventId);
}
async function main() {
  try {
    const provider = getProvider();
    const sdk = new PumpFunSDK(provider);

    // Set up event listeners
    await subscribeToCompleteBondingCurveEvent(sdk);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
main();
