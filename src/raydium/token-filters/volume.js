const fetch = require('node-fetch');
const {fetchAMMPoolId} = require("../Pool/fetch_pool")
async function getDayVolume(tokenAddress){
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
        if(dayVolume !== 0) return dayVolume;
        else{
            dayVolume = response.data[0].day.volume
        }
        return dayVolume;
    }catch(e){
        console.log("Error getting 24h volume: ", e)
    }
}
async function getWeekVolume(tokenAddress){
    try{
        const poolId = await fetchAMMPoolId(tokenAddress);
        let response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
        let weekVolume = 0;
        while(!response.success){
            console.log("The response was not successful when getting week volume, trying again")
            response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
            if(response.success) weekVolume = response.data[0].week.volume
        }
        if(weekVolume !== 0) return weekVolume;
        else{
            weekVolume = response.data[0].week.volume
        }

        return weekVolume;
    }catch(e){
        console.log("Error getting 24h volume: ", e)
    }
}

async function getMonthVolume(tokenAddress){
    try{
        const poolId = await fetchAMMPoolId(tokenAddress);
        let response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
        let monthVolume = 0;
        while(!response.success){
            console.log("The response was not successful when getting month volume, trying again")
            response = await( await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
            if(response.success) monthVolume = response.data[0].month.volume
        }
        if(monthVolume !== 0) return monthVolume;
        else{
            monthVolume = response.data[0].month.volume
        }
        return monthVolume;
    }catch(e){
        console.log("Error getting 24h volume: ", e)
    }
}

//getDayVolume("3XTp12PmKMHxB6YkejaGPUjMGBLKRGgzHWgJuVTsBCoP")

module.exports = {getDayVolume, getMonthVolume, getWeekVolume}