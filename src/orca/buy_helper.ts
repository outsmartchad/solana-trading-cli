import {swap} from "./Pool";

/**
 * Buys a specified amount of tokens using SOL.
 * 
 * @param token_address The address of the token to buy.
 * @param buyAmountInSOL The amount of SOL to use for the purchase.
 */
export async function buy(token_address:string, buyAmountInSOL:number) {
  await swap("buy", token_address, buyAmountInSOL, -1);
}