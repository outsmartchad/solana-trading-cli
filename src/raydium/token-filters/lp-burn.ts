import { initSdk } from "../raydium_config";
import Decimal from "decimal.js";
import { connection } from "../../helpers/config";
import { PublicKey } from "@solana/web3.js";
import { fetchAMMPoolId } from "../Pool/fetch_pool";
import { getDecimals } from "../../helpers/util";
let sdkCache = { sdk: null, expiry: 0 };
export async function getLPBurnPercentage(tokenAddress:string) {
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
    const lpDecimals = await getDecimals(poolInfo.lpMint);
    const lpMint = poolInfo.lpMint.toString();
    const lpReserve:any = new Decimal(poolInfo.lpReserve.toString()).div(
      new Decimal(10).pow(lpDecimals)
    );
    const lpCurrentSupply:any = await connection.getTokenSupply(
      new PublicKey(lpMint)
    );

    const burnPercentage =
      100 - (lpCurrentSupply.value.uiAmount / lpReserve) * 100;
    console.log(burnPercentage);
    return burnPercentage;
  } catch (e) {
    console.log("Error getting current SOL in pool: ", e);
  }
}
//getLPBurnPercentage("3XTp12PmKMHxB6YkejaGPUjMGBLKRGgzHWgJuVTsBCoP");

