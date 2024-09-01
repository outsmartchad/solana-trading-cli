import {sl} from "./constants"
import { readBoughtTokens, writeBoughtTokens, getCurrentPriceRaydium } from "./utils";
import Decimal from 'decimal.js';
/**
 * Sets the stop loss price for a given token.
 * @param {string} tokenAddress - The address of the token.
 * @returns {Promise<void>} - A promise that resolves when the stop loss price is set.
 */
export async function setStopLoss_Price(tokenAddress: string, path_To_bought_tokens:string){
    try{
        const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
        const our_entry_price = tokenObj.entry_price;
        const sl_price = our_entry_price * (1 - parseFloat(sl));
        tokenObj.sl_price = sl_price;
        await writeBoughtTokens(tokenAddress, tokenObj, path_To_bought_tokens);
    }catch(err){
        console.error("Error setting stop loss: ", err);
    }
}
/**
 * Retrieves the stop loss price for a given token address.
 * @param {string} tokenAddress - The address of the token.
 * @returns {number} - The stop loss price of the token.
 */
export async function getStopLoss_Price(tokenAddress: string, path_To_bought_tokens:string){
    try{
        const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
        return tokenObj.sl_price;
    }catch(err){
        console.error("Error getting stop loss price: ", err);
    }
}
/**
 * Checks if the current price of a token is below or equal to the stop loss price.
 * @param {string} tokenAddress - The address of the token to check.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the current price is below or equal to the stop loss price, otherwise `false`.
 */
export async function checkStopLoss(tokenAddress: string, path_To_bought_tokens:string): Promise<boolean>{
    let res = false;
    try{
        const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
        const current_price = new Decimal(await getCurrentPriceRaydium(tokenAddress, path_To_bought_tokens));
        const stop_loss_price = new Decimal(tokenObj.sl_price);
        if (stop_loss_price.greaterThanOrEqualTo(current_price)) {
            res = true;
        }
    }catch(e:any){
        console.error("Error checking stop loss: ", e);
        if (e.response && e.response.status === 502) {
            console.error('Bad Gateway: The server received an invalid response from the upstream server.');
          }
          if (e.response && e.response.status === 504) {
            console.error('Gateway Timeout: The server did not receive a timely response.');
          }
    }
    return res;
}

