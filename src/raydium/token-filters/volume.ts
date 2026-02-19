const fetch = require('node-fetch');
import {fetchAMMPoolId} from "../Pool/fetch_pool";

const MAX_RETRIES = 10;

async function fetchPoolVolume(poolId: string, period: 'day' | 'week' | 'month'): Promise<number | undefined> {
    try {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const response = await (await fetch(`https://api-v3.raydium.io/pools/info/ids?ids=${poolId}`)).json();
            if (response.success && response.data?.[0]?.[period]?.volume !== undefined) {
                const volume = response.data[0][period].volume;
                console.log(`${period} volume:`, volume);
                return volume;
            }
            console.log(`The response was not successful when getting ${period} volume, trying again (${attempt + 1}/${MAX_RETRIES})`);
        }
        console.log(`Failed to get ${period} volume after ${MAX_RETRIES} retries`);
        return 0;
    } catch (e) {
        console.log(`Error getting ${period} volume: `, e);
    }
}

export async function getDayVolume(tokenAddress: string) {
    const poolId = await fetchAMMPoolId(tokenAddress);
    return fetchPoolVolume(poolId, 'day');
}

export async function getWeekVolume(tokenAddress: string) {
    const poolId = await fetchAMMPoolId(tokenAddress);
    return fetchPoolVolume(poolId, 'week');
}

export async function getMonthVolume(tokenAddress: string) {
    const poolId = await fetchAMMPoolId(tokenAddress);
    return fetchPoolVolume(poolId, 'month');
}