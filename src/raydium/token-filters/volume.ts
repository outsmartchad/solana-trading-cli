const fetch = require('node-fetch');
import {fetchAMMPoolId} from "../Pool/fetch_pool";
export async function getDayVolume(tokenAddress:string){
    try{
        const poolId = await fetchAMMPoolId(tokenAddress);
        let response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
        let dayVolume = 0;
        response.success = false;
        while(!response.success){
            console.log("The response was not successful when getting day volume, trying again")
            response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
            if(response.success) dayVolume = response.data[0].day.volume
        }
        console.log(dayVolume)
        if(dayVolume !== 0) return dayVolume;
        else{
            dayVolume = response.data[0].day.volume
        }
        return dayVolume;
    }catch(e){
        console.log("Error getting 24h volume: ", e)
    }
}
export async function getWeekVolume(tokenAddress:string){
    try{
        const poolId = await fetchAMMPoolId(tokenAddress);
        let response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
        let weekVolume = 0;
        while(!response.success){
            console.log("The response was not successful when getting week volume, trying again")
            response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
            if(response.success) weekVolume = response.data[0].week.volume
        }
        console.log(weekVolume);
        if(weekVolume !== 0) return weekVolume;
        else{
            weekVolume = response.data[0].week.volume
        }

        return weekVolume;
    }catch(e){
        console.log("Error getting 24h volume: ", e)
    }
}

export async function getMonthVolume(tokenAddress:string){
    try{
        const poolId = await fetchAMMPoolId(tokenAddress);
        let response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
        let monthVolume = 0;
        while(!response.success){
            console.log("The response was not successful when getting month volume, trying again")
            response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
            if(response.success) monthVolume = response.data[0].month.volume
        }
        console.log(monthVolume);
        if(monthVolume !== 0) return monthVolume;
        else{
            monthVolume = response.data[0].month.volume
        }
        return monthVolume;
    }catch(e){
        console.log("Error getting 24h volume: ", e)
    }
}

//getMonthVolume("GiMsMKgMq3cX3PJwPZCxh6CsrsVTc5P975eeAMPLpump");