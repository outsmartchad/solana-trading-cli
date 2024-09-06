# Meteora DEX Usage Examples

### Buy token through cli
`
ts-node src/meteora/buy.ts --token <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>
`

### Sell token through cli
`
ts-node src/meteora/sell.ts --token <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>
`
### buy/sell token on Meteora
```typescript
import {buy, sell} from "../meteora";
import {wallet} from "../helpers/config";
async function main() {
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const sol = 1; // buy 1 SOL worth of token using WSOL
    const sellPercentage = 50; // sell 50% of the token
    await buy(tokenAddress, sol) // buy 1 SOL worth of token
    await sell(tokenAddress, sellPercentage); // sell 50% of the token
}
```

### Fetch the price from Meteora DLMM pool
```typescript
import {getCurrentPriceInUSD, getCurrentPriceInSOL} from "../meteora";

const currentPopcatPriceInSOL = await getCurrentPriceInSOL("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");
const currentPopcatPriceInUSD = await getCurrentPriceInUSD("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");

console.log(currentPopcatPriceInSOL);
console.log(currentPopcatPriceInUSD);
```

### Fetch the pool address for the target token
```typescript
import {fetchWhirlPoolId} from "../meteora";

async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const poolId = await fetchDLMMPoolId(tokenAddress); // output Address: POPCAT/WSOL or WSOL/
    console.log(poolId);
}
```

### Fetch the metrics of the pool
```typescript
import {getCurrentMarketCap, getCurrentSolInPool, getLastNDayVolume, getDayVolume, getWeekVolume, getMonthVolume} from "../meteora";

async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const currentMarketCap = await getCurrentMarketCap(tokenAddress); // to get the current market cap of the token
    const currentSolInPool = await getCurrentSolInPool(tokenAddress); // to get the current number of SOL in the pool
    const n = 14; // last 14 days
    const lastNDayVolume = await getLastNDayVolume(tokenAddress, n); // to get the volume of last n days
    const dayVolume = await getDayVolume(tokenAddress); // to get the volume of last 24 hours
    const weekVolume = await getWeekVolume(tokenAddress); // to get the volume of last 7 days
    const monthVolume = await getMonthVolume(tokenAddress); // to get the volume of last 30 days

}
```


