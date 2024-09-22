import * as fs from 'fs/promises';
import fetch from 'cross-fetch';
import {sl, tp, wsol, order_size, buyin_percentage} from "./constants"
import Decimal from 'decimal.js';
import { Connection, PublicKey } from "@solana/web3.js";
import {connection} from "../../helpers/config";
import {getCurrentMarketCap, getDayVolume, getCurrentSolInPool } from "../../raydium/token-filters";
import {initSdk} from "../../raydium/raydium_config"
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {fetchAMMPoolId} from "../../raydium/Pool/fetch_pool"
import {logger} from "../../utils"
import path from "path";
let sdkCache = {sdk: null, expiry: 0}
const log_path = path.join(__dirname, "info.log");
export async function retriveWalletState(wallet_address: string) {
    try{
    const filters = [
      {
        dataSize: 165, //size of account (bytes)
      },
      {
        memcmp: {
          offset: 32, //location of our query in the account (bytes)
          bytes: wallet_address, //our search criteria, a base58 encoded string
        },
      },
    ];
    const accounts = await connection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      { filters: filters }
    );
    let results:any = {};
    const solBalance = await connection.getBalance(new PublicKey(wallet_address));
    accounts.forEach((account:any, i:any) => {
      //Parse the account data
      const parsedAccountInfo = account.account.data;
      const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
      const tokenBalance =
        parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
      results[mintAddress] = tokenBalance;
    });
    results["SOL"] = solBalance / 10 ** 9;
    return results || {};
  }catch(e){
    console.log(e)
  }
  return {};
  }

export async function getSPLTokenBalance(connection:Connection, tokenAccount:PublicKey, payerPubKey:PublicKey) {
    try{
    const address = getAssociatedTokenAddressSync(tokenAccount, payerPubKey);
    const info = await connection.getTokenAccountBalance(address, "finalized");
    if (info.value.uiAmount == null) throw new Error("No balance found");
    return info.value.uiAmount;
    }catch(err:any){
        logger.error(`Errr when checking token balance...`)
    }
    return 0;
}
export async function loadBoughtTokens(path_To_bought_tokens:string) {
    try {
      let boughtTokens:any = [];
      const data = await fs.readFile(path_To_bought_tokens, 'utf8');
      const jsonData = JSON.parse(data);
      // the JSON structure is something like { "tokenA": {...}, "tokenB": {...} }
      boughtTokens = Object.keys(jsonData);
      return boughtTokens;
    } catch (err) {
      console.error('Error reading or parsing file:', err);
    }
  }
/**
 * Reads the bought tokens from a JSON file and returns the token object for the given token address.
 * @param {string} tokenAddress - The address of the token to read.
 * @returns {Object} - The token object containing entry price, take profit price, and stop loss price.
 */
export async function readBoughtTokens(tokenAddress:string, path_To_bought_tokens:string) {
    try {
        // Read the JSON file asynchronously
        const data = await fs.readFile(path_To_bought_tokens, { encoding: 'utf8' });
        // Parse the JSON data
        const jsonData = JSON.parse(data);
        // Access the data
        if(!(tokenAddress in jsonData)){
            return null;
        }

        const tokenObj = jsonData[tokenAddress];

        return tokenObj;
    } catch (err) {
        console.error('Error reading file:', err);
    }
}
/**
 * Writes the bought tokens to a JSON file.
 * @param {string} tokenAddress - The address of the token.
 * @param {object} tokenObj - The token object to be written.
 * @returns {Promise<void>} - A promise that resolves when the tokens are written successfully, or rejects with an error.
 */
export async function writeBoughtTokens(tokenAddress:string, tokenObj:object, path_To_bought_tokens:string) {
    try {
        // Read the JSON file asynchronously
        const data = await fs.readFile(path_To_bought_tokens, { encoding: 'utf8' });
        // Parse the JSON data
        const jsonData = JSON.parse(data);
        // Update the JSON data
        jsonData[tokenAddress] = tokenObj;
        // Write the updated JSON data back to the file
        await fs.writeFile(path_To_bought_tokens, JSON.stringify(jsonData, null, 2));
    } catch (err) {
        console.error('Error writing bought tokens file:', err);
    }
}
/**
 * Deletes the bought tokens after selling it from the JSON file.
 * @param {string} tokenAddress - The address of the token to be deleted.
 * @returns {Promise<void>} - A promise that resolves when the tokens are deleted successfully.
 */
export async function deleteBoughtTokens(tokenAddress:string, path_To_bought_tokens:string) {
    try {
        // Read the JSON file asynchronously
        const data = await fs.readFile(path_To_bought_tokens, { encoding: 'utf8' });
        // Parse the JSON data
        const jsonData = JSON.parse(data);
        if (tokenAddress in jsonData) delete jsonData[tokenAddress];
        // Write the updated JSON data back to the file
        await fs.writeFile(path_To_bought_tokens, JSON.stringify(jsonData, null, 2));
    } catch (err) {
        console.error('Error deleting bought tokens file:', err);
    }
}

export async function getCurrentPriceJUP(tokenAddress:string){
    // api: https://price.jup.ag/v6/price?ids=tokenAddress&vsToken=So11111111111111111111111111111111111111112
    try{
        const response = await( await fetch(`https://price.jup.ag/v6/price?ids=${tokenAddress}&vsToken=${wsol}`)).json();
        //const response = await( await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${wsol}&outputMint=${tokenAddress}&amount=1000000&slippageBps=50`) ).json()
        console.log(response)
    }catch(e){
        console.log(`Error when getting current price of ${tokenAddress} `, e)
    }
}
export async function logExitPrice(tokenAddress: string, exitPrice:number, path_To_bought_tokens:string){
    let tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
    tokenObj.exit_price = exitPrice;
    await writeBoughtTokens(tokenAddress, tokenObj, path_To_bought_tokens);
}
export async function logTraderEntryPrice(tokenAddress:string, entryPrice:number, path_To_bought_tokens:string){
    const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
    tokenObj.trader_entry_price = entryPrice;
    await writeBoughtTokens(tokenAddress, tokenObj, path_To_bought_tokens);
}
// export async function setEntryPrice(tokenAddress){
//     const tokenObj = await readBoughtTokens(tokenAddress);
//     const trader_entry_price = tokenObj.trader_entry_price;
//     tokenObj.entry_price = trader_entry_price * (1 - entry_percentage);
//     await writeBoughtTokens(tokenAddress, tokenObj);
// }
export async function setInitTokenObj(tokenAddress: string, path_To_bought_tokens:string){
    // if day volume < 100k, 
    // we don't trade it
    const currentPrice = new Decimal(await getCurrentPriceRaydium(tokenAddress, path_To_bought_tokens));
    const ourEntryPrice = currentPrice.mul(new Decimal(1).minus(buyin_percentage));
    let ourEntryPriceDec = new Decimal(ourEntryPrice);
    let tpPriceDec = ourEntryPriceDec.mul(new Decimal(1).plus(tp));
    let slPriceDec = ourEntryPriceDec.mul(new Decimal(1).minus(sl));
    const mc = await getCurrentMarketCap(tokenAddress);
    const noOfSolInPool = await getCurrentSolInPool(tokenAddress);
    let solPerOrder = order_size;
    const poolId = await fetchAMMPoolId(tokenAddress);
    // if((mc||0) >= 10000000){
    //     solPerOrder = 2;
    //     tpPriceDec = ourEntryPriceDec.mul(new Decimal(1).plus(new Decimal(0.05)));
    //   }
    //   if((mc||0) >= 5000000){
    //       solPerOrder = 1.5
    //       tpPriceDec = ourEntryPriceDec.mul(new Decimal(1).plus(new Decimal(0.05)));
    //   }
    //   else if((mc||0) >= 1000000){
    //       solPerOrder = 1;
    //       tpPriceDec = ourEntryPriceDec.mul(new Decimal(1).plus(new Decimal(0.05)));
    //   }else{
    //       solPerOrder = 0.5;
    //       tpPriceDec = ourEntryPriceDec.mul(new Decimal(1).plus(new Decimal(0.05)));
    // }

    const tokenObj = {
        "entry_price": ourEntryPriceDec,
        "tp_price": tpPriceDec,
        "sl_price": slPriceDec,
        "exit_price": 0,
        "poolId": poolId,
        "number_of_sol_in_pool": noOfSolInPool,
        "market_cap": mc,
        "sol_per_order": solPerOrder,
    }
    console.log("Init our trade successfully!", tokenObj)
    await writeBoughtTokens(tokenAddress, tokenObj, path_To_bought_tokens);
}

export async function checkIfHitEntryPrice(tokenAddress:string, path_To_bought_tokens:string){
    const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
    const currentPrice = await getCurrentPriceRaydium(tokenAddress, path_To_bought_tokens);
    const entryPrice = tokenObj.entry_price;
    if(currentPrice <= entryPrice){
        return true;
    }
    return false;
}
export async function getCurrentPriceRaydium(tokenAddress:string, path_To_bought_tokens:string){
    try{
        // Check if poolId is already set
        let raydium:any = null
        if(sdkCache.sdk){
            raydium = sdkCache.sdk;
        }
        else {
            raydium = await initSdk();
            sdkCache.sdk = raydium;
        }
        const tokenObj = await readBoughtTokens(tokenAddress, path_To_bought_tokens);
        let poolId:any = null;
        if (tokenObj === null) {
            poolId = "";
        } else {
            poolId = tokenObj.poolId;
        }
        if (poolId === "") {
            poolId = await fetchAMMPoolId(tokenAddress);
            if(tokenObj){
                tokenObj.poolId = poolId;
                await writeBoughtTokens(tokenAddress, tokenObj, path_To_bought_tokens);
            }
        }
        const res = await raydium.liquidity.getRpcPoolInfos([poolId]);
        const poolInfo = res[poolId];
        const baseMint = poolInfo.baseMint.toString();
        const quoteMint = poolInfo.quoteMint.toString();
        const baseDecimals = new Decimal(poolInfo.baseDecimal.toString());
        const quoteDecimals = new Decimal(poolInfo.quoteDecimal.toString());
        const solMintAddress = wsol;
        //const solPrice = await getCurrentSolPrice();
        let solReserve:any = null;
        let tokenReserve:any = null;
        let priceInSOL;

        if (baseMint === solMintAddress) {
            // baseMint is SOL, (this is pump token)
            solReserve = new Decimal(poolInfo.baseReserve.toString()).div(new Decimal(10).pow(baseDecimals));
            tokenReserve = new Decimal(poolInfo.quoteReserve.toString()).div(new Decimal(10).pow(quoteDecimals));
            priceInSOL = solReserve.div(tokenReserve);
        }  else {
            // Neither baseMint nor quoteMint is SOL, use the pool price directly
            solReserve = new Decimal(poolInfo.quoteReserve.toString()).div(new Decimal(10).pow(quoteDecimals));
            tokenReserve = new Decimal(poolInfo.baseReserve.toString()).div(new Decimal(10).pow(baseDecimals));
            priceInSOL = poolInfo.poolPrice;
        }
        //console.log(`Current price of ${tokenAddress} in SOL: ${priceInSOL}`);
        return priceInSOL;
    }catch(e){
        logger.error(`Error when getting current price of ${tokenAddress} `, e)
    }
}
export async function writeLineToLogFile(logMessage:string){
    fs.appendFile(log_path, `${logMessage}\n`, 'utf8');
}
  //"tokenA": {
  //  "trader_entry_price": 0.5312,
  //  "entry_price": 0.5152,
  //  "actual_entry_price": 0.5152,
  //  "tp_price": 0.58432,
  //  "sl_price": 0.42496,
  //  "exit_price": 0.5312
  //}
