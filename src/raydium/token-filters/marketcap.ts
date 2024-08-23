import { initSdk } from "../raydium_config";
import Decimal from "decimal.js";
import { fetchAMMPoolId } from "../Pool/fetch_pool";
import { wsol } from "../constants";
import { connection } from "../../helpers/config";
import { PublicKey } from "@solana/web3.js";
let sdkCache = { sdk: null, expiry: 0 };
export async function getCurrentSolPrice() {
  try {
    let raydium:any = null;
    if (sdkCache.sdk) {
      raydium = sdkCache.sdk;
    } else {
      raydium = await initSdk();
      sdkCache.sdk = raydium;
    }
    const sol_usdc = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
    const res = await raydium.liquidity.getRpcPoolInfos([sol_usdc]);
    const poolInfo = res[sol_usdc];
    return poolInfo.poolPrice;
  } catch (e) {
    console.log("Error getting current SOL price: ", e);
  }
}
export async function getCurrentMarketCap(tokenAddress:string) {
  try {
    let raydium:any = null;
    if (sdkCache.sdk) {
      raydium = sdkCache.sdk;
    } else {
      raydium = await initSdk();
      sdkCache.sdk = raydium;
    }
    let poolId = await fetchAMMPoolId(tokenAddress);
    const res = await raydium.liquidity.getRpcPoolInfos([poolId]);
    const poolInfo = res[poolId];
    const baseMint = poolInfo.baseMint.toString();
    const quoteMint = poolInfo.quoteMint.toString();
    const baseDecimals = new Decimal(poolInfo.baseDecimal.toString());
    const quoteDecimals = new Decimal(poolInfo.quoteDecimal.toString());
    const solMintAddress = wsol;
    let solReserve = null;
    let tokenReserve = null;
    let priceInSOL;

    if (baseMint === solMintAddress) {
      // baseMint is SOL
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
    const priceInUSD = priceInSOL * (await getCurrentSolPrice());
    const supply:any = await connection.getTokenSupply(new PublicKey(tokenAddress));
    const mc =
      priceInUSD *
      supply.value.uiAmount;
    return mc;
  } catch (e) {
    console.log(`Error when getting current market cap of ${tokenAddress} `, e);
  }
}

//getCurrentMarketCap("3XTp12PmKMHxB6YkejaGPUjMGBLKRGgzHWgJuVTsBCoP");

