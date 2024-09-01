import {tp} from "./constants"
import { readBoughtTokens, writeBoughtTokens, getCurrentPriceRaydium } from "./utils";
import Decimal from 'decimal.js';
/**
 * Sets the take profit price for a given token address.
 * @param {string} tokenAddress - The address of the token.
 * @returns {Promise<void>} - A promise that resolves when the take profit price is set.
 */
export async function setTakeProfit_Price(tokenAddress: string, path_To_bought_tokens:string){
    try{
        const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
        const our_entry_price = tokenObj.entry_price;
        const tp_price = our_entry_price * (1 + parseFloat(tp));
        tokenObj.tp_price = tp_price;
        await writeBoughtTokens(tokenAddress, tokenObj, path_To_bought_tokens);
    }catch(err){
        console.error("Error setting take profit: ", err);
    }
}

/**
 * Retrieves the take profit price for a given token address.
 *
 * @param {string} tokenAddress - The address of the token.
 * @returns {Promise<number>} - The take profit price of the token.
 * @throws {Error} - If there is an error retrieving the take profit price.
 */
export async function getTakeProfit_Price(tokenAddress: string, path_To_bought_tokens:string){
    try{
        const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
        return tokenObj.tp_price;
    }catch(err){
        console.error("Error getting take profit price: ", err);
    }
}

/**
 * Checks if the current price of a token is greater than or equal to the take profit price.
 * @param {string} tokenAddress - The address of the token to check.
 * @returns {Promise<boolean>} - A promise that resolves to true if the current price is greater than or equal to the take profit price, false otherwise.
 */
export async function checkTakeProfit(tokenAddress: string, path_To_bought_tokens:string): Promise<boolean>{
    let res = false;
    try{
        const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
        const current_price = new Decimal(await getCurrentPriceRaydium(tokenAddress, path_To_bought_tokens)).toFixed(20);
        const take_profit_price = new Decimal(tokenObj.tp_price).toFixed(20);

        if(current_price > take_profit_price){
            console.log(`Take profit price reached for token ${tokenAddress}`);
            res = true;
        }
    }catch(e:any){
        console.error("Error checking take profit: ", e);
        if (e.response && e.response.status === 502) {
            console.error('Bad Gateway: The server received an invalid response from the upstream server.');
          }
          if (e.response && e.response.status === 504) {
            console.error('Gateway Timeout: The server did not receive a timely response.');
          }
    }
    return res;
}
