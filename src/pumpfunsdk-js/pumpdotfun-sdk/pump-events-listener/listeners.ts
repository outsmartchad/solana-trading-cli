const {connection} = require("../../../helpers/config");

import { Keypair, Connection } from "@solana/web3.js";
import {PumpFunSDK} from "pumpdotfun-sdk";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";

const getProvider =()=>{
    const wallet = new NodeWallet(Keypair.generate());
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "finalized",
    });
    return provider;
}

export const subscribeToCompleteBondingCurveEvent = async (sdk) => {
    const completeEventId = sdk.addEventListener("completeEvent", (event, slot, signature) => {
        console.log("completeEvent", event, slot, signature);
    });
    console.log("Subscribed to completeEvent with ID:", completeEventId);
}
export const subscribeToCreatePumpTokenEvent = async (sdk) => {
    const createEventId = sdk.addEventListener("createEvent", (event, slot, signature) => {
        console.log("createEvent", event, slot, signature);
        console.log("mint pubkey", event.mint.toBase58())
    });
    console.log("Subscribed to createEvent with ID:", createEventId);
}
export const subscribeToTradeEvent = async (sdk) => {
    const tradeEventId = sdk.addEventListener("tradeEvent", (event, slot, signature) => {
        console.log("tradeEvent", event, slot, signature);
    });
    console.log("Subscribed to tradeEvent with ID:", tradeEventId);
}

const main = async () => {
    try {
      const provider = getProvider();
      const sdk = new PumpFunSDK(provider);
  
      // Set up event listeners
      await subscribeToCreatePumpTokenEvent(sdk);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };
  

  