# Jupiter DEX Aggregator Usage Examples

### Buy token through cli
`
ts-node src/jupiter/buy.ts --token <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>
`

### Sell token through cli
`
ts-node src/jupiter/sell.ts --token <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>
`

### swap token on Jupiter
```typescript
import {swap} from "../jupiter";
import {getSPLTokenBalance} from "../helpers/check_balance";
import {wallet, connection} from "../helpers/config";
import {usdc} from "../jupiter/constants";
async function main() {
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    await swap(tokenAddress, usdc, 5000, 1)  // swapping 5000 popcat to usdc, using 1% slippage
}

```
### buy/sell token on Jupiter
```typescript
import {buy, sell} from "../jupiter";
import {getSPLTokenBalance} from "../helpers/check_balance";
import {wallet, connection} from "../helpers/config";
async function main() {
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const sol = 1; // buy 1 SOL worth of token using WSOL
    const sellPercentage = 50; // sell 50% of the token
    await buy(tokenAddress, sol, 1) // buy 1 SOL worth of token, using 1% slippage
    const balance = await getSPLTokenBalance(connection, new PublicKey(tokenAddress), wallet.publicKey);
    await sell(tokenAddress, balance*sellPercentage/100, 1); // sell 50% of the token, using 1% slippage
}
```

### Fetch the price from Jupiter
```typescript
import {getCurrentPriceInSOL, getCurrentPriceInUSD} from "../jupiter";
async function main() {
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    const currentPopcatPriceInSOL = await getCurrentPriceInSOL(tokenAddress);
    const currentPopcatPriceInUSD = await getCurrentPriceInUSD(tokenAddress);
}

```



