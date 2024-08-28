import { initSdk } from "./raydium_config";
import {fetchAMMPoolId} from "./Pool/fetch_pool";
import Decimal from "decimal.js";
import {wsol} from "./constants";
import { sol } from "@metaplex-foundation/js";
let sdkCache = { sdk: null, expiry: 0 };
export async function getCurrentPriceInSOL(
  tokenAddress:string
) {
  try {
    // Check if poolId is already set
    let raydium:any = null;
    if (sdkCache.sdk) {
      raydium = sdkCache.sdk;
    } else {
      raydium = await initSdk();
      sdkCache.sdk = raydium;
    }
    let poolId = null;
    poolId = await fetchAMMPoolId(tokenAddress);
    
    const res = await raydium.liquidity.getRpcPoolInfos([poolId]);
    const poolInfo = res[poolId];

    const baseMint = poolInfo.baseMint.toString();
    const quoteMint = poolInfo.quoteMint.toString();
    const baseDecimals = new Decimal(poolInfo.baseDecimal.toString());
    const quoteDecimals = new Decimal(poolInfo.quoteDecimal.toString());
    const solMintAddress = wsol;
    //const solPrice = await getCurrentSolPrice();
    let solReserve = null;
    let tokenReserve = null;
    let priceInSOL;

    if (baseMint === solMintAddress) {
      // baseMint is SOL, (this is pump token)
      solReserve = new Decimal(poolInfo.baseReserve.toString()).div(
        new Decimal(10).pow(baseDecimals)
      );
      tokenReserve = new Decimal(poolInfo.quoteReserve.toString()).div(
        new Decimal(10).pow(quoteDecimals)
      );
      priceInSOL = solReserve.div(tokenReserve);
    } else {
      // Neither baseMint nor quoteMint is SOL, use the pool price directly
      solReserve = new Decimal(poolInfo.quoteReserve.toString()).div(
        new Decimal(10).pow(quoteDecimals)
      );
      tokenReserve = new Decimal(poolInfo.baseReserve.toString()).div(
        new Decimal(10).pow(baseDecimals)
      );
      priceInSOL = poolInfo.poolPrice;
    }
    //console.log(`Current price of ${tokenAddress} in SOL: ${priceInSOL}`);
    return priceInSOL;
  } catch (e) {
    console.log(`Error when getting current price of ${tokenAddress} `, e);
  }
}
export async function getCurrentSolPrice(){
    try{
        let raydium:any = null
        if(sdkCache.sdk){
            raydium = sdkCache.sdk;
        }
        else {
            raydium = await initSdk();
            sdkCache.sdk = raydium;
        }
        const sol_usdc = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2"
        let res = await raydium.liquidity.getRpcPoolInfos([sol_usdc]);
        while(res === undefined || res === null){
            res = await raydium.liquidity.getRpcPoolInfos([sol_usdc]);
        }
        const poolInfo = res[sol_usdc];
        return poolInfo.poolPrice;
    }catch(e){
        console.log("Error getting current SOL price: ", e)

    }

}

export async function getCurrentPriceInUSD(tokenAddress:string){
    const priceInSOL = await getCurrentPriceInSOL(tokenAddress);
    const solPrice = await getCurrentSolPrice();
    return priceInSOL * solPrice;
}


async function main(){
    // console.log(await getCurrentPriceInSOL("3XTp12PmKMHxB6YkejaGPUjMGBLKRGgzHWgJuVTsBCoP"));
    // console.log(await getCurrentSolPrice());
    //console.log(await getCurrentPriceInUSD("4MBEqrtgabZ9G5EmKm7XTrcknZ1nWg3TrvFHZMrENgrd"));
    //console.log(await getCurrentPriceInSOL("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"));
}
//main();
