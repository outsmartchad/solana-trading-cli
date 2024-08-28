import {fetchWhirlPool} from "../Pool"
import { wsol } from "../constants";

export async function getCurrentSolInPool(token_address:string):Promise<any> {
    const whirlPool:any = await fetchWhirlPool(token_address);
    let solReserve:number = 0;
    console.log(whirlPool.tokenVaultAInfo)
    if(whirlPool.tokenVaultAInfo.mint.toBase58() === wsol){
        solReserve = Number(whirlPool.tokenVaultAInfo.amount)/Math.pow(10,9);
    }else{
        solReserve = Number(whirlPool.tokenVaultBInfo.amount)/Math.pow(10,9);
    }
    console.log(solReserve);
    return solReserve;
} 


// getCurrentSolInPool("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");