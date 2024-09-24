## Limit Order

- it depends on the buy in percentage from the .env file

### HOW TO USE

```typescript
import {
  setInitTokenObj,
  checkIfHitEntryPrice,
  path_To_bought_tokens,
  loadBoughtTokens,
  order_size
} from "./trading_dev/ProfitAndLoss";
import { wallet} from "./helpers/config";
import { buy } from "./raydium/buy_helper";

// create a limit order object locally when your searcher bot finds a token
async function searcherLogic() {

  // when your searcher bot finds a token, you can create a limit order object
  while(true){
    // logic to find a target token...
    // ...
    // ...
    const tokenAddress = "token address";
    await setInitTokenObj(tokenAddress, path_To_bought_tokens); // successfully create a limit order object in the bought_tokens.json file, 
    // before using it, please see the implementation of setInitTokenObj() in src/trading_dev/ProfitAndLoss/utils.ts
   
  }
}

// check if the token has hit the entry price, if so, buy the token
async function buy_checker(){
  while (true) {
    const bought_tokens = await loadBoughtTokens(path_To_bought_tokens);
    for (const token in bought_tokens) {
      const tokenObj = bought_tokens[token];
      if (checkIfHitEntryPrice(tokenObj, path_To_bought_tokens)) {
        // buy the token
        buy("buy", token, order_size, wallet);
      }
    }
  }
}

```

## take profit / stop-loss

- it depends on the tp/sl percentage from the .env file

### HOW TO USE

```shell
ts-node src/trading_dev/ProfitAndLoss/sell-checker.ts
```

### it will automatically sell the token from the bought_tokens.json if it hits the take profit or stop-loss price
