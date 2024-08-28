import {fetchDLMMPoolId} from "../Pool";
const fetch = require('node-fetch');


// max 255 days of data
export async function getLastNDayVolume(
  tokenAddress: string,
  n: number
): Promise<any> {
    const poolId = await fetchDLMMPoolId(tokenAddress);
  const url = `https://dlmm-api.meteora.ag/pair/${poolId}/analytic/pair_trade_volume?num_of_days=${n}`
    const response = await (await fetch(url)).json();
    let sumOfVolume = 0;
    for (const day of response) {
        sumOfVolume += day.trade_volume;
    }
    console.log(sumOfVolume);
    return sumOfVolume;
}

export async function getDayVolume(tokenAddress:string){
    const poolId = await fetchDLMMPoolId(tokenAddress);
    const url = `https://dlmm-api.meteora.ag/pair/${poolId}/analytic/pair_trade_volume?num_of_days=1`
      const response = await (await fetch(url)).json();
      let sumOfVolume = 0;
      for (const day of response) {
          sumOfVolume += day.trade_volume;
      }
      console.log(sumOfVolume);
      return sumOfVolume;
}

export async function getWeekVolume(tokenAddress:string){
    const poolId = await fetchDLMMPoolId(tokenAddress);
    const url = `https://dlmm-api.meteora.ag/pair/${poolId}/analytic/pair_trade_volume?num_of_days=7`
      const response = await (await fetch(url)).json();
      let sumOfVolume = 0;
      for (const day of response) {
          sumOfVolume += day.trade_volume;
      }
      console.log(sumOfVolume);
      return sumOfVolume;
}

export async function getMonthVolume(tokenAddress:string){
    const poolId = await fetchDLMMPoolId(tokenAddress);
    const url = `https://dlmm-api.meteora.ag/pair/${poolId}/analytic/pair_trade_volume?num_of_days=30`
      const response = await (await fetch(url)).json();
      let sumOfVolume = 0;
      for (const day of response) {
          sumOfVolume += day.trade_volume;
      }
      console.log(sumOfVolume);
      return sumOfVolume;
}


//getMonthVolume("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"); 