# Raydium DEX Usage Examples

### Buy token through cli
`
ts-node src/raydium/buy.ts --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>
`

### Sell token through cli
`
ts-node src/raydium/sell.ts --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>
`
### buy/sell token on Raydium
```typescript
import {buy, sell} from "../raydium";
import {wallet} from "../helpers/config";
async function main() {
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const sol = 1; // buy 1 SOL worth of token using WSOL
    const sellPercentage = 50; // sell 50% of the token
    await buy("buy", tokenAddress, sol, wallet); // buy 1 SOL worth of POPCAT
    await sell("sell", tokenAddress, sellPercentage, wallet); // sell 50% of the POPCAT
}
```

### Fetch the price from Raydium pool
```typescript
import {getCurrentPriceInUSD, getCurrentPriceInSOL} from "../raydium";

const currentPopcatPriceInSOL = await getCurrentPriceInSOL("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");
const currentPopcatPriceInUSD = await getCurrentPriceInUSD("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");

console.log(currentPopcatPriceInSOL);
console.log(currentPopcatPriceInUSD);
```

### Fetch the pool address for the target token
```typescript
import {fetchAMMPoolId, fetchAMMPoolIdByMintPair} from "../raydium";

async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const poolId = await fetchAMMPoolId(tokenAddress); // output Address: POPCAT/WSOL or WSOL/POPCAT
    const poolIdByMintPair = await fetchAMMPoolIdByMintPair(tokenAddress, "YOUR_MINT_ADDRESS"); // output Address: POPCAT/YOUR_MINT_ADDRESS or YOUR_MINT_ADDRESS/POPCAT
    console.log(poolId);
    console.log(poolIdByMintPair);
}
```

### Fetch the metrics of the pool
```typescript
import {getLPBurnPercentage, getCurrentMarketCap, getCurrentSolInPool, getDayVolume, getWeekVolume, getMonthVolume} from "../raydium";

async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const LPBurnPercentage = await getLPBurnPercentage(tokenAddress); // to get the percentage of LP tokens burned
    const currentMarketCap = await getCurrentMarketCap(tokenAddress); // to get the current market cap of the token
    const currentSolInPool = await getCurrentSolInPool(tokenAddress); // to get the current number of SOL in the pool
    const dayVolume = await getDayVolume(tokenAddress); // to get the volume of the pool in the last 24 hours
    const weekVolume = await getWeekVolume(tokenAddress); // to get the volume of the pool in the last week
    const monthVolume = await getMonthVolume(tokenAddress); // to get the volume of the pool in the last month
    // output ...
}
```


