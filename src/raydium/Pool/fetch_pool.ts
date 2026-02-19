import { initSdk } from "../raydium_config";
import { wsol } from "../constants";
import {getInfoFromDexscreener} from "../../dexscreener";
let sdkCache = { sdk: null, expiry: 0 };
export async function fetchAMMPoolId(tokenAddress:string) {
  try{
  const info = await getInfoFromDexscreener(tokenAddress);
  const poolId = info.poolId;
  console.log(`AMM Pool ID: ${poolId}`);
  if(poolId !== "") return poolId;
  }catch(e){
    console.log("Error getting AMM pool ID using dexscreener api: ", e);
    console.log("Trying to get AMM pool ID using raydium api");
  }
  let raydium:any = null;
  if (sdkCache.sdk) {
    raydium = sdkCache.sdk;
  } else {
    raydium = await initSdk();
    sdkCache.sdk = raydium;
  }
  const data = await raydium.api.fetchPoolByMints({
    mint1: wsol,
    mint2: tokenAddress,
  });
  const listOfPools = data.data;
  for (const obj of listOfPools) {
    if (obj.type === "Standard") {
      // return the first AMM pool ID
      console.log(`AMM Pool ID: ${obj.id}`);
      return obj.id;
    }
  }
  console.log("No AMM pool ID found for the given token address");
  return ""; // return empty string if no AMM pool ID is found
}

export async function fetchAMMPoolIdByMintPair(mint1:string, mint2:string) {
  let raydium:any = null;
  if (sdkCache.sdk) {
    raydium = sdkCache.sdk;
  } else {
    raydium = await initSdk();
    sdkCache.sdk = raydium;
  }
  const data = await raydium.api.fetchPoolByMints({
    mint1: mint1,
    mint2: mint2,
  });
  const listOfPools = data.data;
  for (const obj of listOfPools) {
    if (obj.type === "Standard") {
      // return the first AMM pool ID
      console.log(`AMM Pool ID: ${obj.id}`);
      return obj.id;
    }
  }
  console.log("No AMM pool ID found for the given mint pair");
  return ""; // return empty string if no AMM pool ID is found
}
export async function fetchLPToken(tokenAddress:string) {
  const MAX_RETRIES = 10;
  try {
    const poolId = await fetchAMMPoolId(tokenAddress);
    let lpToken = "";
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await (
        await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)
      ).json();
      if (response.success && response.data?.[0]?.lpMint?.address) {
        lpToken = response.data[0].lpMint.address;
        return lpToken;
      }
      console.log(
        `The response was not successful when getting LP token, trying again (${attempt + 1}/${MAX_RETRIES})`
      );
    }
    console.log("Failed to get LP token after maximum retries");
    return lpToken;
  } catch (e) {
    console.log("Error getting LP token: ", e);
  }
}
//fetchLPToken("3XTp12PmKMHxB6YkejaGPUjMGBLKRGgzHWgJuVTsBCoP");

//fetchAMMPoolId("ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82")