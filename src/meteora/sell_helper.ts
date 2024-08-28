import {swap} from "./Pool";

/**
 * Sells a token with the specified token address and sell percentage.
 * 
 * @param token_address The address of the token to be sold.
 * @param sell_percentage The percentage of the token to be sold.
 */
export async function sell(token_address:string, sell_percentage:number) {
  await swap("sell", token_address, -1, sell_percentage);
}   