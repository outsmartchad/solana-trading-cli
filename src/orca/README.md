# Orca DEX Usage Examples

### Buy token through cli
`
ts-node src/orca/buy.ts --token <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>
`

### Sell token through cli
`
ts-node src/orca/sell.ts --token <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>
`
### buy/sell token on Orca
```typescript
import {buy, sell} from "../orca";
import {wallet} from "../helpers/config";
async function main() {
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const sol = 1; // buy 1 SOL worth of token using WSOL
    const sellPercentage = 50; // sell 50% of the token
    await buy(tokenAddress, sol) // buy 1 SOL worth of token
    await sell(tokenAddress, sellPercentage); // sell 50% of the token
}
```

### Fetch the price from Orca whirpool
```typescript
import {getCurrentPriceInUSD, getCurrentPriceInSOL} from "../orca";

const currentPopcatPriceInSOL = await getCurrentPriceInSOL("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");
const currentPopcatPriceInUSD = await getCurrentPriceInUSD("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");

console.log(currentPopcatPriceInSOL);
console.log(currentPopcatPriceInUSD);
```

### Fetch the pool address for the target token
```typescript
import {fetchWhirlPoolId} from "../orca";

async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const poolId = await fetchWhirlPoolId(tokenAddress); // output Address: POPCAT/WSOL or WSOL/
    console.log(poolId);
}
```

### Fetch the metrics of the pool
```typescript
import {getCurrentMarketCap, getCurrentSolInPool} from "../orca";

async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const currentMarketCap = await getCurrentMarketCap(tokenAddress); // to get the current market cap of the token
    const currentSolInPool = await getCurrentSolInPool(tokenAddress); // to get the current number of SOL in the pool

}
```


