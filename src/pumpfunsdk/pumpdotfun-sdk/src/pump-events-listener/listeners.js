const {connection} = require("../../../../helpers/config");
const { Keypair, Connection } =  require("@solana/web3.js");
const {PumpFunSDK} =require ("pumpdotfun-sdk");
const { AnchorProvider } = require ("@coral-xyz/anchor");

function getProvider(){
    const wallet = Keypair.generate();
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "finalized",
    });
    return provider;
}

async function subscribeToCompleteBondingCurveEvent(sdk){
    const completeEventId = sdk.addEventListener("completeEvent", (event, slot, signature) => {
        console.log("completeEvent", event, slot, signature);
    });
    console.log("Subscribed to completeEvent with ID:", completeEventId);
}
async function subscribeToCreatePumpTokenEvent(sdk){
    const createEventId = sdk.addEventListener("createEvent", (event, slot, signature) => {
        console.log("createEvent", event, slot, signature);
        console.log("mint pubkey", event.mint.toBase58())
    });
    console.log("Subscribed to createEvent with ID:", createEventId);
}
async function subscribeToTradeEvent(sdk){
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

module.exports = {subscribeToCompleteBondingCurveEvent, subscribeToCreatePumpTokenEvent, subscribeToTradeEvent, getProvider};