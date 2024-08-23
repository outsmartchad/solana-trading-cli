const { fetchDLMMPoolId } = require("./fetch-pool");
const {usdc} = require("./constants");

async function getCurrentPriceInSOL(tokenAddress) {
  const poolId = await fetchDLMMPoolId(tokenAddress);
  const response = await (
    await fetch(`https://dlmm-api.meteora.ag/pair/${poolId}`)
  ).json();
  return response.current_price;
}
async function getCurrentSolPrice() {
    const poolId = await fetchDLMMPoolId(usdc);
    const response = await (
      await fetch(`https://dlmm-api.meteora.ag/pair/${poolId}`)
    ).json();
    return response.current_price;
}
async function getCurrentPriceInUSD(tokenAddress) {
    const poolId = await fetchDLMMPoolId(tokenAddress);
    const response = await (
        await fetch(`https://dlmm-api.meteora.ag/pair/${poolId}`)
    ).json();
    return response.current_price*(await getCurrentSolPrice());
}

async function main(){
    console.log(await getCurrentPriceInSOL("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"));
    console.log(await getCurrentPriceInUSD("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"));
}

//main();

module.exports = { getCurrentPriceInUSD, getCurrentPriceInSOL, getCurrentSolPrice };