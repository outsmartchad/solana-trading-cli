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

## Usage ✅:

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

# Commands </> (Please see the command examples in examples/ to get start~)

### payer options is by default use the private key in .env file, but you can also specify the path to the secret key if you want to use another wallet

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

## Token:

- src/Token/create.js: create a spl token on devnet or mainnet with a given name, symbol, token image(using irys decentralized storage), metadata json file, supply, decimals, the code by default revokes the mint authority and freeze authority after creating the token so that the token has a cap and no one can feeze the token of the token holder, it will then mint all the token to your wallet

- src/Token/burn.js: burn spl token with a given percentage of the token from your wallet

- src/Token/revoke_authority.js: revoke mint and freeze authority of a given token

## Trading:

- src/Trading/dex/raydium/sell.js: selling spl token for SOL in your wallet using raydium dex swap function

- src/Trading/dex/raydium/buy.js: buying spl token using SOL in your wallet using raydium dex swap function

- src/Trading/volume/boost_volume.js: boost the volume of a token by creating a buy and sell order in just one transaction in a way to avoid possible MEV

- src/Trading/memecoin_trading_strategies/copy-trading/copy-trade.js: copy trading program to follow a user-defined wallet address to auto-buy&sell

## Transactions:

- src/Transactions/jito_tips_tx_executor.js: execute the transaction by sending the bundles to Jito validators, they help us to land the transaction to the Solana blockchain faster than just using priority fee.

- src/Transactions/simple_tx_executor.js: execute the transaction by sending the request to the Solana blockchain with a given priority gas fee.

## Pool:

- src/Pool/add_pool.js: add liquidity to a pool in a given token address, the code find the most liquid pool (TOKEN_ADDRESS/SOL) in the raydium dex and add liquidity to it. You need to specify the amount of liquidity(sol) you want to add.

- src/Pool/remove_pool.js: remove liquidity from a pool in a given token address, the code find the most liquid pool (TOKEN_ADDRESS/SOL) in the raydium dex and remove liquidity from it. You need to specify the amount of percentage of liquidity you want to remove.

- src/Pool/swap.js: swap token for another token in the raydium dex, src/Trading/dex/raydium/buy.js and src/Trading/dex/raydium/sell.js are based on this code.

- src/Pool/query_pool.js: query the pool information of a given pool address in the raydium dex, it use shyft api to get the pool information. Please make sure you have your shyft api key inside the code before running this code.

## Helper methods:

- src/helpers/config.js: configuration file for the code.

- src/helpers/util.js: utility functions for the code, including: send transactions to Solana blockchain, dropped transactions handling, etc.

- src/helpers/check_balance.js: check the balance of a given token in your wallet

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
