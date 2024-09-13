import { initSdk } from "../raydium_config";
import { wsol } from "../constants";
let sdkCache = { sdk: null, expiry: 0 };
export async function fetchAMMPoolId(tokenAddress:string) {
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
  try {
    const poolId = await fetchAMMPoolId(tokenAddress);
    let response = await (
      await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)
    ).json();
    let lpToken = "";
    response.success = false;
    console.log(response.data);
    while (!response.success) {
      console.log(
        "The response was not successful when getting LP token, trying again"
      );
      response = await (
        await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)
      ).json();
      if (response.success) lpToken = response.data[0].lpMint.address;
    }
    return lpToken;
  } catch (e) {
    console.log("Error getting LP token: ", e);
  }
}
//fetchLPToken("3XTp12PmKMHxB6YkejaGPUjMGBLKRGgzHWgJuVTsBCoP");

//fetchAMMPoolId("ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82")