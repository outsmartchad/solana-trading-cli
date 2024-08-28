import {fetchWhirlPool} from "../Pool";

export async function getCurrentMarketCap(token_address:string):Promise<any> {
    const whirlPool:any = await fetchWhirlPool(token_address);
    
}