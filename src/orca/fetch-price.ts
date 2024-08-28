import Decimal from "decimal.js";
import { wsol, usdc } from "../raydium";
import {fetchWhirlPool} from "./Pool"
import { PriceMath } from "@orca-so/whirlpools-sdk";
// on-chain rpc method to get the current price of the token
export async function getCurrentPriceInSOL(tokenAddress:string):Promise<any> {
    const whirlPool:any = await fetchWhirlPool(tokenAddress);
    const sqrt_price_x64 = whirlPool.getData().sqrtPrice;
    const price = PriceMath.sqrtPriceX64ToPrice(sqrt_price_x64, whirlPool.tokenAInfo.decimals, whirlPool.tokenBInfo.decimals);
    return new Decimal(1).div(price.toFixed(whirlPool.tokenBInfo.decimals));
}
export async function getCurrentSolPrice():Promise<any> {
    const whirlPool:any = await fetchWhirlPool(usdc);
    const sqrt_price_x64 = whirlPool.getData().sqrtPrice;
    const price = PriceMath.sqrtPriceX64ToPrice(sqrt_price_x64, whirlPool.tokenAInfo.decimals, whirlPool.tokenBInfo.decimals);
    return price;
}
export async function getCurrentPriceInUSD(tokenAddress:string):Promise<any> {
    return (await getCurrentPriceInSOL(tokenAddress))*(await getCurrentSolPrice());
}

//getCurrentPriceInSOL("DhFTtmQ1ymhWWabzViW1Ewf43iaqaVuriSsw5HF8pump");
//getCurrentSolPrice();
//getCurrentPriceInUSD("DhFTtmQ1ymhWWabzViW1Ewf43iaqaVuriSsw5HF8pump");