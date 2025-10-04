import {fetchDLMMPool} from "../Pool";
import {wsol} from "../constants"
export async function getCurrentSolInPool(token_address:string):Promise<any> {
  const dlmmPool = await fetchDLMMPool(token_address);
  let solReserve:number;
  if(dlmmPool.tokenX.publicKey.toBase58() === wsol){
    const decimalsX = (dlmmPool.tokenX as any).decimals ?? (dlmmPool.tokenX as any).decimal;
    solReserve = Number(dlmmPool.tokenX.amount)/Math.pow(10,decimalsX);
  }else{
    const decimalsY = (dlmmPool.tokenY as any).decimals ?? (dlmmPool.tokenY as any).decimal;
    solReserve = Number(dlmmPool.tokenY.amount)/Math.pow(10,decimalsY);
  }
  console.log(solReserve);
  return solReserve;

} 

//getCurrentSolInPool("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");