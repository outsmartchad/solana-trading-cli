const { initSdk } = require("../raydium_config");
const Decimal = require("decimal.js");
const { fetchAMMPoolId } = require("../Pool/fetch_pool");
const { wsol } = require("../constants");

let sdkCache = { sdk: null, expiry: 0 };
async function getCurrentSolInPool(tokenAddress) {
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
    const baseMint = poolInfo.baseMint.toString();
    const quoteMint = poolInfo.quoteMint.toString();
    const baseDecimals = new Decimal(poolInfo.baseDecimal.toString());
    const quoteDecimals = new Decimal(poolInfo.quoteDecimal.toString());
    const solMintAddress = wsol;
    let solReserve = null;
    let tokenReserve = null;

    if (baseMint === solMintAddress) {
      // baseMint is SOL
      solReserve = new Decimal(poolInfo.baseReserve.toString()).div(
        new Decimal(10).pow(baseDecimals)
      );
      tokenReserve = new Decimal(poolInfo.quoteReserve.toString()).div(
        new Decimal(10).pow(quoteDecimals)
      );
    } else {
      // Neither baseMint nor quoteMint is SOL, use the pool price directly
      solReserve = new Decimal(poolInfo.quoteReserve.toString()).div(
        new Decimal(10).pow(quoteDecimals)
      );
      tokenReserve = new Decimal(poolInfo.baseReserve.toString()).div(
        new Decimal(10).pow(baseDecimals)
      );
    }
    console.log(solReserve);
    return solReserve;
  } catch (e) {
    console.log("Error getting current SOL in pool: ", e);
  }
}

//getCurrentSolInPool("3XTp12PmKMHxB6YkejaGPUjMGBLKRGgzHWgJuVTsBCoP")
module.exports = { getCurrentSolInPool };
