# SPL token ALL-IN-ONE Command line tool 🚀

[🔗doc](https://outsmartchad.github.io/solana-memecoin-cli/)
## Main Features
- Trading any token using Jupiter API & Raydium swap function

- Create your own Solana **_SPL tokens_** on mainnet | Pump.fun

- Create your own zk-compressed token in your own zk-testnet
  
- Performing **_LP transactions_** On Raydium, Orca and Meteora
  
- Predefined Jito tips and Priority fee
  
- Volume Booster by bundling buy and sell in one transaction!

- Fastest Copy Trade Program

- **_Pump.fun sdk_** Integration

- **_Got everything needed for any developer to create their own trading bot_**

## Credits
- https://github.com/outsmartchad/raydium-sdk-V1-demo
- https://github.com/rckprtr/pumpdotfun-sdk
- https://github.com/Al366io/solana-transactions-wrapper


## Project Structure
```
.solana-memecoin-cli
├── data
|   ├── Image_file                     # store image file (jpeg, jpg,...)
|   ├── metadata_file                  # store .json file about the token metadata
|   ├── payer_keypair                  # store wallet keypair .json
|   └── token_keypair                  # store token keypair .json
├── examples (Screenshots of Commands) # all screenshot to show how we use the command line tool
|   ├── add_liquidity                  # see how to add liquidity to a pool on Raydium
|   ├── burn_token                     # see how to burn a token with WSOL using Raydium swap
|   ├── create_token                   # see how to create a SPL token on mainnet or devnet
|   ├── buy_token                      # buy a token using raydium with both jito bundles and priority fees
|   ├── create_token                   # create a token with 0% extra fees on solana (mainnet or devnet)
|   ├── remove_liquidity               # remove some liquidity from a pool on Raydium
|   ├── boost_volume                   # boost the volume of a token on raydium
|   ├── pump_createAndInitialBuy       # create and initial buy token on pump.fun
|   ├── pump_buy                       # buy token on pump.fun
|   ├── pump_sell                      # sell token on pump.fun
|   └── sell_token                     # sell the token with a percentage using Raydium swap
├── src
|   ├── helpers
|   |   ├── .env.copy                  # .env file to store your keys, rmb change to .env
|   |   ├── check_balance              
|   |   ├── config.js                  # get value from .env
|   |   └── util.js                    # useful functions
|   ├── Pool                           # Only Supporting Raydium right now
|   |   ├── add_pool.js                # adding liquidity to AMM pool on Raydium
|   |   ├── create_pool.js             # create pool/create open book market on Raydium (not done)
|   |   ├── check_pool.js              # check the pool's info (pool size, burn percentage of LP token...)
|   |   ├── formatAmmKeysById.js       # get well-informated info of pool
|   |   ├── query_pool.js              # query the pool's current info (not done)_
|   |   ├── remove_pool.js             # remove liquidity from AMM pool on Raydium
|   |   └── swap.js                    # swap on Raydium
|   ├── pumpfunsdk
|   |   ├── pump-keypair                      # store your new generated token keypair
|   |   ├── pumpdotfun-sdk
|   |   |   ├── example
|   |   |   ├── images                        # store your token image
|   |   |   ├── src
|   |   |   |   ├── IDL
|   |   |   |   ├── pump-events-listener
|   |   |   |   |   ├── listener.js           # listen to the create, trade, and complete bonding curve event
|   |   |   |   ├── amm.js 
|   |   |   |   ├── createAndBuy.js           # create token and initial buy it in pump.fun
|   |   |   |   ├── buy.js                    # buy token in pump.fun
|   |   |   |   ├── sell.js                   # sell token in pump.fun
|   |   |   |   ├── pumpfun.js                # the implementation of pump.fun sdk
|   |   |   |   ├── util.js                   # useful functions
|   |   |   |   └── tools.js                  # interact with pump.fun sdk
|   ├── Token
|   |   ├── create.js                  # create token with uploading token image and metadata to irys (storage provider)
|   |   ├── burn.js                    # burn a percentage of token
|   |   ├── query.js                   # query token's info (creator, price, metadata, holder...) (not done)
|   |   └── revoke_authority.js        # revoke token's freeze and mint authority
|   ├── Trading
|   |   ├── dex
|   |   |   ├── jupiter
|   |   |   |   ├── swap
|   |   |   |   |   ├── buy-helper.js         # buy token with sol using jup swap api
|   |   |   |   |   ├── sell-helper.js        # sell token to sol using jup swap api
|   |   |   |   |   └── swap-helper.js        # swap any to any token using jup swap api
|   |   |   |   ├── dca.js                    # create a dollar cost average program using jup api
|   |   |   |   └── limit_order.js            # create a limit order program using jup api
|   |   |   ├── meteora
|   |   |   ├── orca
|   |   |   └── raydium
|   |   |       ├── buy-helper.js             # buy token with WSOL using src\Pool\swap.js
|   |   |       ├── buy.js                   
|   |   |       ├── sell-helper.js            # sell token to WSOL using src\Pool\swap.js
|   |   |       └── sell.js
|   |   ├── volume
|   |   |   └── boost-volume.js               # boosting token's volume
|   |   |                                     # by doing one buy and one sell instruction in one transaction
|   |   |                                     # [buy(), sell()] (only losing your gas fee)
|   |   └── memecoin-trading-strategies
|   |       ├── copy_trading
|   |       |   ├── copy-buy.js               # copy trader's buy tx
|   |       |   ├── copy-sell.js              # copy trader's sell tx
|   |       |   └── copy-trade.js             # Use two core to both copy-buy and copy-sell
|   |       ├── Filters                       
|   |       ├── take-profit.js                # taking profits by setting a limit order
|   |       └── stop-loss.js                  # stop loss by setting a limit order
|   └── Transactions
|       ├── jito-tips-tx-executor.js          # sending bundles(list of instructions) to Jito validators
|                                             # validators help our tx land faster
|       ├── simple-tx-executor.js             # submitting ur tx to RPC provider with predefined priority fees
|       └── bloXroute-tips-tx-executor.js     
└── help.js
```
### Installation 🛠️

1. `git clone https://github.com/ManofDiligence/solana-memecoin-cli.git`
2. `cd solana-memecoin-cli`
3. `nvm install v22.2.0`
4. `nvm use v22.2.0`
5. `npm install`
6. `node help.js `（to see commands or read cli_doc.txt file)
7. also see the command examples in examples/

### Prerequisites 🚨

0. we have added a .env.copy file in src/helpers/.env.copy for you to follow and paste your keys to the code (specify the custom jito fee if you need).
1. Add your mainnet wallet secret key, devnet wallet secret key (optional), RPC endpoint(must) and shyft api key(must)
2. rename the .env.copy file to .env

## Features ✅:

### Developer CLI:
- Create a new SPL token or zk-compressed token (on SOL mainnet/devnet/zk-devnet) and it will automatically mint to your wallet
- Integrates both **user-defined priority fee and jito tips** that land transactions faster
- Burn a percentage of a token
- Revoke mint and freeze authority of a token
- boost volume of a token by creating buy and sell orders in just **one transaction**
- **Add or Remove liquidity** to a pool
- Swap tokens in a **raydium dex's AMM pool and JUP Swap API**
- Buy or sell a token using SOL using raydium and JUP
- **Buy, Sell, and launch token in pump.fun**
- Check the balance of a token in your wallet
- monitor real-time pump-fun's create, trade, and complete bonding curve events
  
### Trader CLI:
- Optimized Copy Trading Program with auto-buy&sell
- detecting-dips Program with auto-buy&sell

## Features in Development 🚧:

- With user-defined Jito tips and priority Lamports supported for every command
- A Website for anyone to do these thing with their browser-based wallet
- **More dexes support**, (Orca, Meteora, etc.)
- **More Profitable functions** for Trading dev
- **Phantom wallet integration**
- more features to come...

# Commands </> (Please see the command examples in examples/ to get start~)

### payer options is by default use the private key in .env file, but you can also specify the path to the secret key if you want to use another wallet

1. Specify the token symbol, name, mint keypair(optional, will help u to generate), supply, decimals, path to metadata json file, path to image file, the cluster you want to use, and the file type(png, jpg, jpeg).

```
node create --payer <PATH_TO_SECRET_KEY> --symbol <TOKEN_SYMBOL> --token_name <TOKEN_NAME> --mint <PATH_TO_MINT_KEYPAIR> --supply <SUPPLY_OF_TOKEN> --decimals <DECIMALS> --metadata <PATH_METADATA_JSON> --image <PATH_TO_IMAGE> --cluster <CLUSTER> --priority-fee <PRIORITY_FEE> --file_type <FILE_TYPE>
```

2. Specify the token address, the percentage of the token you want to burn and the cluster you want to use.

```
node burn --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <BURN_PERCENTAGE> --cluster <CLUSTER>
```

3. Specify the token address and the cluster you want to use.

```
node revoke_authority --payer <PATH_TO_SECRET_KEY> --mint_address <ADDRESS_TOKEN> --cluster <CLUSTER> --mint --freeze
```

4. Specify the token address you want to query and the cluster for boosting the volume of the token.

```
node boost_volume --token_address <TOKEN_ADDRESS> --payer <PATH_TO_SECRET_KEY> --cluster <CLUSTER> --sol_per_order <SOL_PER_ORDER>

```

5. Specify the token address, the amount of Sol you want to swap, and the cluster you want to use.

```
node buy --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL> --cluster <CLUSTER>
```

6. Specify the token address, the percentage of the token you want to sell, and the cluster you want to use.

```
node sell --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE> --cluster <CLUSTER>
```

7. Specify the token address, the pool id(optional, will help to find the pool with the most liquidity using the given token address), the amount of Sol you want to add, and the cluster you want to use.

```
node add_pool --payer <PATH_WALLET> --token_address <ADDRESS_TOKEN> --pool_id <POOL_ID> --sol <NUMBER_OF_SOL> --cluster <CLUSTER> --priority_fee <PRIORITY_FEE>
```

8. Specify the token address, the percentage of the LP token you want to remove(1=1%), and the cluster you want to use.

```
node remove_pool --payer <PATH_PAYER> --token_address <TOKEN_ADDRESS> --percentage <LP_TOKEN_PERCENTAGE> --cluster <CLUSTER>
```
### Pump.fun commands

9. Specify the path to your mint keypair, the amount of Sol you want to buy, the name of the token, the symbol of the token, the description of the token, the telegram link, the twitter link, the website link, and the image file path.

```
node createAndBuy --pathToMintKeypair <PATH_TO_MINT_KEYPAIR> --sol <NUMBER_OF_SOL> --name <TOKEN_NAME> --symbol <TOKEN_SYMBOL> --description <TOKEN_DESCRIPTION> --telegram <TELEGRAM_LINK> --twitter <TWITTER_LINK> --website <WEBSITE_LINK> --file <IMAGE_FILE_PATH>
```

10. Specify the token address, the sol you want to buy

```
node buy --token_address <ADDRESS_TOKEN> --sol <NUMBER_OF_SOL>
```

11. Specify the token address, the percentage of the token you want to sell

```
node sell --token_address <ADDRESS_TOKEN> --percentage <SELL_PERCENTAGE>
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
- ``` git checkout -b feature/YourNewFeature ```
- ``` git commit -m 'bug Fixed/added new feature' ```
- ``` git push origin feature/YourNewFeature ```
- And Please open a pull request

## Apply Latest Changes from remote repo
- ``` git stash -u  # Stash your changes``` 
- ``` git pull --rebase # Pull the latest changes```
- ``` git stash pop # Apply Your stashed changes```

### If you think this project is useful, please give us a star🌟, it will help us a lot.

### Discord channel: https://discord.gg/hFhQeBCqWX
### It is a work in progress, if you have any suggestions or any problems, please let us know!

### Stay tuned for the updates.🤖_**
