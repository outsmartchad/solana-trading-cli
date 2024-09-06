import fetch from 'cross-fetch';
import {wsol, usdc} from './constants';
export async function getCurrentPriceInSOL(tokenAddress:string){
    try{
        const response = await( await fetch(`https://price.jup.ag/v6/price?ids=${tokenAddress}&vsToken=${wsol}`)).json();
        //const response = await( await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${wsol}&outputMint=${tokenAddress}&amount=1000000&slippageBps=50`) ).json()
        console.log(response);
        return response.data[tokenAddress].price;
    }catch(e){
        console.log(`Error when getting current price of ${tokenAddress} `, e)
    }
}

export async function getCurrentPriceInUSD(tokenAddress:string){
    try{
        const response = await( await fetch(`https://price.jup.ag/v6/price?ids=${tokenAddress}&vsToken=${usdc}`)).json();
        //const response = await( await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${wsol}&outputMint=${tokenAddress}&amount=1000000&slippageBps=50`) ).json()
        console.log(response);
        return response.data[tokenAddress].price;
    }catch(e){
        console.log(`Error when getting current price of ${tokenAddress} `, e)
    }
}

async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    console.log(await getCurrentPriceInUSD(tokenAddress));
}
//main();