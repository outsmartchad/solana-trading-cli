# Raydium DEX Usage Examples

### Buy token through cli
`
ts-node ts-node src/raydium/buy.ts --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>
`

### Sell token through cli
`
ts-node src/raydium/sell.ts --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>
`

### Fetch the price
```typescript
import {getCurrentPriceInUSD, getCurrentPriceInSOL} from "../raydium";

const currentPopcatPriceInSOL = await getCurrentPriceInSOL("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");
const currentPopcatPriceInUSD = await getCurrentPriceInUSD("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");

console.log(currentPopcatPriceInSOL);
console.log(currentPopcatPriceInUSD);
```

