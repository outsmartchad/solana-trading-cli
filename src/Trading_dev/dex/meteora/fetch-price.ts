import { fetchDLMMPoolId, fetchDLMMPool } from "./Pool";
import {usdc} from "./constants";

// on-chain rpc method to get the current price of the token
export async function getCurrentPriceInSOL(tokenAddress:string):Promise<any> {
  const dlmmPool = await fetchDLMMPool(tokenAddress);
  dlmmPool.refetchStates();
  const activeBin = await dlmmPool.getActiveBin();
  const activeBinPricePerToken = dlmmPool.fromPricePerLamport(
    Number(activeBin.price)
  );
  return activeBinPricePerToken;
}
export async function getCurrentSolPrice():Promise<any> {

  const dlmmPool = await fetchDLMMPool(usdc);
  dlmmPool.refetchStates();
  const activeBin = await dlmmPool.getActiveBin();
  const activeBinPricePerToken = dlmmPool.fromPricePerLamport(
    Number(activeBin.price)
  );
  return activeBinPricePerToken;
}
export async function getCurrentPriceInUSD(tokenAddress:string):Promise<any> {
    return (await getCurrentPriceInSOL(tokenAddress))*(await getCurrentSolPrice());
}


async function main(){
    // console.log(await getCurrentPriceInSOL("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"));
    // console.log(await getCurrentPriceInUSD("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"));
    console.log(await getCurrentPriceInUSD("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"));
}

//main();
