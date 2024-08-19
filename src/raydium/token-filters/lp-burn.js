const { initSdk } = require("../raydium_config");
const Decimal = require("decimal.js");
const { wsol } = require("../constants");
const { connection } = require("../../helpers/config");
const { PublicKey } = require("@solana/web3.js");
const { fetchAMMPoolId } = require("../Pool/fetch_pool");
const { getDecimals } = require("../../helpers/util");
let sdkCache = { sdk: null, expiry: 0 };
async function getLPBurnPercentage(tokenAddress) {
  try {
    let raydium = null;
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
    const lpReserve = new Decimal(poolInfo.lpReserve.toString()).div(
      new Decimal(10).pow(lpDecimals)
    );
    const lpCurrentSupply = await connection.getTokenSupply(
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
getLPBurnPercentage("3XTp12PmKMHxB6YkejaGPUjMGBLKRGgzHWgJuVTsBCoP");

module.exports = { getLPBurnPercentage };
