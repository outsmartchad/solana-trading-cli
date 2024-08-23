import {connection} from "../../../../helpers/config";
import { Keypair, Connection } from "@solana/web3.js";
import {PumpFunSDK} from  "pumpdotfun-sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

export function getProvider(){
    const wallet:any = Keypair.generate();
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "finalized",
    });
    return provider;
}

export async function subscribeToCompleteBondingCurveEvent(sdk: PumpFunSDK){
    const completeEventId = sdk.addEventListener("completeEvent", (event, slot, signature) => {
        console.log("completeEvent", event, slot, signature);
    });
    console.log("Subscribed to completeEvent with ID:", completeEventId);
}
export async function subscribeToCreatePumpTokenEvent(sdk: PumpFunSDK){
    const createEventId = sdk.addEventListener("createEvent", (event, slot, signature) => {
        console.log("createEvent", event, slot, signature);
        console.log("mint pubkey", event.mint.toBase58())
    });
    console.log("Subscribed to createEvent with ID:", createEventId);
}
export async function subscribeToTradeEvent(sdk: PumpFunSDK){
    const tradeEventId = sdk.addEventListener("tradeEvent", (event, slot, signature) => {
        console.log("tradeEvent", event, slot, signature);
    });
    console.log("Subscribed to tradeEvent with ID:", tradeEventId);
}
async function main(){
    try {
        const provider = getProvider();
        const sdk = new PumpFunSDK(provider);
        
        // Set up event listeners
        await subscribeToCreatePumpTokenEvent(sdk);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}
main();
