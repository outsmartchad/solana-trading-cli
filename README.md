[🔗doc](https://outsmartchad.github.io/solana-trading-cli/)
## High-Performance Solana trading Bot
A open-sourced, free, low-latency trading bot designed for developing your own trading bot. It provides swap functions of multiple dexes, and uses low-latency infrastructures like Jito and BloXroute to minimize the time it takes to execute trades, as well as the real-time metric of the liquidity pool.
  
## Main Features

- Create your own Solana **_SPL tokens_** on mainnet | Pump.fun
  
- Swap tokens on Jupiter, Raydium, Orca, Meteora, and pump.fun
  - how to use Jupiter cli & trading functions: [here](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/jupiter/README.md)
  - how to use Raydium cli & trading functions: [here](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/raydium/README.md)
  - how to use Orca cli & trading functions: [here](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/orca/README.md)
  - how to use Meteora cli & trading functions: [here](https://github.com/outsmartchad/solana-trading-cli/blob/typescript-main/src/meteora/README.md)
  
- land transactions faster using Jito/bloXroute

- Fetch the real-time price, lp-burn percentage, pool reserve and market cap of any liquidity pool

- fixed % tp/sl module

- First Open-Source gRPC pump.fun sniper bot (0.4-2 seconds latency) [here](https://github.com/outsmartchad/solana-trading-cli/tree/typescript-main/src/grpc_streaming_dev/grpc-pf-sniper)
  
- First Open-Source gRPC copy bot [here](https://github.com/outsmartchad/solana-trading-cli/tree/typescript-main/src/grpc_streaming_dev/grpc-copy-bot)

- Open-source gRPC Raydium sniper bot [here](https://github.com/outsmartchad/solana-trading-cli/tree/typescript-main/src/grpc_streaming_dev/grpc-raydium-sniper)

- **_Got everything needed to create your own trading bot_**

## Credits

- https://github.com/raydium-io/raydium-sdk-V2
- https://github.com/rckprtr/pumpdotfun-sdk
- https://github.com/Al366io/solana-transactions-wrapper

### Installation 🛠️

1. `git clone https://github.com/outsmartchad/solana-trading-cli.git`
2. `cd solana-trading-cli`
3. `nvm install`
4. `nvm use`
5. `npm install`
6. `ts-node test.ts` (**Remember to run this to test all the cli script**)

### Prerequisites 🚨

0. we have added a .env.copy file in src/helpers/.env.copy for you to follow and paste your keys to the code (specify the custom jito fee if you need).
1. Add your mainnet wallet secret key(must), devnet wallet secret key (optional), RPC endpoint(must) and shyft api key(optional)
2. rename the .env.copy file to .env

# Documentation

### Developer CLI:

- Check the balance of a token in your wallet
- wrap/unwrap solana
- Create a new SPL token or zk-compressed token (on SOL mainnet/devnet/zk-devnet) and it will automatically mint to your wallet
- boost volume of a token by creating buy and sell orders in just **one transaction**
- **Add or Remove liquidity** to a pool
- **Buy, Sell, and launch token in pump.fun**
- monitor real-time pump-fun's create, trade, and complete bonding curve events
  
### Trader CLI:

- integrates both **jito tips, bloXroute fee** that land transactions faster
- swap tokens on **Raydium, Meteora, and Orca**
- swap tokens using Jupiter API
- ws copy bot with auto-buy&sell
- geyser **grpc Pump.fun sniper bot** with 0.4-2 seconds latency
- geyser **grpc Copy bot** to copy trades from a target wallet address
- geyser **grpc Raydium sniper bot** 
- easy-to-use tp/sl module

## Features in Development 🚧:

- With user-defined Jito tips and priority Lamports supported for every command
- sniping tools on raydium using yellowstone geyser grpc
- **More Strategies** for Trading dev
- more features to come...

# Commands </>

1. Specify the token symbol, name, mint keypair(optional, will help u to generate), supply, decimals, path to metadata json file, path to image file, the cluster you want to use, and the file type(png, jpg, jpeg).

    ```sh
    ts-node create --payer <PATH_TO_SECRET_KEY> --symbol <TOKEN_SYMBOL> --token_name <TOKEN_NAME> --mint <PATH_TO_MINT_KEYPAIR> --supply <SUPPLY_OF_TOKEN> --decimals <DECIMALS> --metadata <PATH_METADATA_JSON> --image <PATH_TO_IMAGE> --cluster <CLUSTER> --priority-fee <PRIORITY_FEE> --file_type <FILE_TYPE>
    ```

2. Specify the token address, the percentage of the token you want to burn and the cluster you want to use.

    ```sh
    ts-node burn --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <BURN_PERCENTAGE> --cluster <CLUSTER>
    ```

3. Specify the token address and the cluster you want to use.

    ```sh
    ts-node revoke_authority --payer <PATH_TO_SECRET_KEY> --mint_address <ADDRESS_TOKEN> --cluster <CLUSTER> --mint --freeze
    ```

4. Specify the token address you want to query and the cluster for boosting the volume of the token.

    ```sh
    ts-node boost_volume --token_address <TOKEN_ADDRESS> --payer <PATH_TO_SECRET_KEY> --cluster <CLUSTER> --sol_per_order <SOL_PER_ORDER>
    ```

5. Specify the token address, the amount of Sol you want to swap, and the cluster you want to use.

    ```sh
    ts-node buy --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL> --cluster <CLUSTER>
    ```

6. Specify the token address, the percentage of the token you want to sell, and the cluster you want to use.

    ```sh
    ts-node sell --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE> --cluster <CLUSTER>
    ```

7. Specify the token address, the pool id(optional, will help to find the pool with the most liquidity using the given token address), the amount of Sol you want to add, and the cluster you want to use.

    ```sh
    ts-node add_pool --payer <PATH_WALLET> --token_address <ADDRESS_TOKEN> --pool_id <POOL_ID> --sol <NUMBER_OF_SOL> --cluster <CLUSTER> --priority_fee <PRIORITY_FEE>
    ```

8. Specify the token address, the percentage of the LP token you want to remove(1=1%), and the cluster you want to use.

    ```sh
    ts-node remove_pool --payer <PATH_PAYER> --token_address <TOKEN_ADDRESS> --percentage <LP_TOKEN_PERCENTAGE> --cluster <CLUSTER>
    ```

9. wrap your sol to wsol.

    ```sh
    ts-node wrap_sol.js --size <size>
    ```

10. unwrap your wsol to sol.

    ```sh
    ts-node unwrap_sol.js
    ```

### Pump.fun commands

9. Specify the path to your mint keypair, the amount of Sol you want to buy, the name of the token, the symbol of the token, the description of the token, the telegram link, the twitter link, the website link, and the image file path.

    ```sh
    ts-node createAndBuy --pathToMintKeypair <PATH_TO_MINT_KEYPAIR> --sol <NUMBER_OF_SOL> --name <TOKEN_NAME> --symbol <TOKEN_SYMBOL> --description <TOKEN_DESCRIPTION> --telegram <TELEGRAM_LINK> --twitter <TWITTER_LINK> --website <WEBSITE_LINK> --file <IMAGE_FILE_PATH>
    ```

10. Specify the token address, the sol you want to buy

    ```sh
    ts-node buy --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>
    ```

11. Specify the token address, the percentage of the token you want to sell

    ```sh
    ts-node sell --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>
    ```

# Code Usage </>

## Raydium/Orca/Meteora as dex:

- src/dex/sell_helper.ts: selling spl token to SOL using the dex swap function (use WSOL in Raydium, SOL in Orca/Meteora)

- src/dex/buy_helper.ts: buying spl token using SOL using dex swap function (use WSOL in Raydium, SOL in Orca/Meteora)

- src/dex/fetch-price.ts: fetch the current price of a token

- src/dex/Pool/swap.ts: swap function for buy/sell/swap token

- src/dex/Pool/fetch_pool.ts: fetch the current address of a liquidity pool

- src/dex/token-filters/lp-burn.ts: fetch current burn percentage of liquidity pool token

- src/dex/token-filters/marketcap.ts: fetch current market cap of a token

- src/dex/token-filters/pool-sol.ts: fetch current SOL reserver in a liquidity pool

- src/dex/token-filters/volume.ts: fetch current/historical volume of a liquidity pool

## Jupiter

- src/jupiter/swap/*.ts: helper functions for swap/sell/buy using Jupiter

- src/jupiter/buy.ts: buy a token using Jupiter (using SOL)

- src/jupiter/sell.ts: sell a token using Jupiter (using SOL)

- src/jupiter/fetch-price.ts: fetch the current price of a token

## gRPC bots

- src/grpc_streaming_dev/grpc-copy-bot: first grpc copy trading bot on Raydium

- src/grpc_streaming_dev/grpc-pf-sniper: first, fastest grpc sniper bot on Pump.fun

- src/grpc_streaming_dev/grpc-raydium-sniper: fastest grpc sniper bot on raydium for sniping pump.fun-migrated token or raydium-launched token

## gRPC projects for beginner: 

- src/grpc_intro_projects/grpc-pool-price: grpc bot for streaming the pool price on Raydium

- src/grpc_intro_projects/grpc-raydium-trades: grpc bot for streaming the trades on Raydium

- src/grpc_intro_projects/grpc-jupiter-trades: grpc bot for streaming the trades on Jupiter


## Transactions:

- src/transactions/jito_tips_tx_executor.ts: execute the transaction by sending the bundles to Jito validators, they help us to land the transaction to the Solana blockchain faster than just using priority fee.

- src/transactions/bloXroute_tips_tx_executor.ts: execute the transaction by sending the transaction to bloXroute node, they help us to prevent MEV and forward the transaction to current/next few block leaders for faster execution.

- src/transactions/simple_tx_executor.ts: execute the transaction by sending the request to the Solana blockchain with a given priority gas fee.

## token:

- src/token/create.ts: create a spl token on devnet or mainnet with a given name, symbol, token image(using irys decentralized storage), metadata json file, supply, decimals, the code by default revokes the mint authority and freeze authority after creating the token so that the token has a cap and no one can feeze the token of the token holder, it will then mint all the token to your wallet

- src/token/burn.ts: burn spl token with a given percentage of the token from your wallet

- src/token/revoke_authority.ts: revoke mint and freeze authority of a given token

## Helper methods:

- src/helpers/config.ts: configuration file for the code.

- src/helpers/util.ts: utility functions for the code, including: send transactions to Solana blockchain, dropped transactions handling, etc.

- src/helpers/check_balance.ts: check the balance of a given token in your wallet

## Contributing

- Contributions is wellcome!!!
- Fork it
- `git checkout -b feature/YourNewFeature`
- `git commit -m 'bug Fixed/added new feature'`
- `git push origin feature/YourNewFeature`
- And Please open a pull request

## Apply Latest Changes from remote repo

- `git stash -u  # Stash your changes`
- `git pull --rebase # Pull the latest changes`
- `git stash pop # Apply Your stashed changes`

## Disclaimer

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

**Use at your own risk.** The authors take no responsibility for any harm or damage caused by the use of this software. Users are responsible for ensuring the suitability and safety of this software for their specific use cases.

By using this software, you acknowledge that you have read, understood, and agree to this disclaimer.

### If you think this project is useful, please give us a star🌟, it will help us a lot.

### Discord channel: https://discord.gg/hFhQeBCqWX

### It is a work in progress, if you have any suggestions or any problems, please let us know!

### **_Stay tuned for the updates.🤖_**
