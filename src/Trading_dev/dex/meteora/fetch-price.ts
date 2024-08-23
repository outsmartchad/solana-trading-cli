import { fetchDLMMPoolId } from "./fetch-pool";
import {usdc} from "./constants";

export async function getCurrentPriceInSOL(tokenAddress:string) {
  const poolId = await fetchDLMMPoolId(tokenAddress);
  const response = await (
    await fetch(`https://dlmm-api.meteora.ag/pair/${poolId}`)
  ).json();
  return response.current_price;
}
export async function getCurrentSolPrice() {
    const poolId = await fetchDLMMPoolId(usdc);
    const response = await (
      await fetch(`https://dlmm-api.meteora.ag/pair/${poolId}`)
    ).json();
    return response.current_price;
}
export async function getCurrentPriceInUSD(tokenAddress:string) {
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
