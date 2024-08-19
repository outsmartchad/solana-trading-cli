const { initSdk } = require("../raydium_config");
const { wsol } = require("../constants.js");
let sdkCache = { sdk: null, expiry: 0 };
async function fetchAMMPoolId(tokenAddress) {
  let raydium = null;
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

async function fetchAMMPoolIdByMintPair(mint1, mint2) {
  let raydium = null;
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

module.exports = { fetchAMMPoolId, fetchAMMPoolIdByMintPair };
