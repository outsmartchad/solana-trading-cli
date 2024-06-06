# SPL token ALL-IN-ONE Command line tool 🚀

[🔗doc](https://manofdiligence.github.io/Solana-Memecoin-CLI/)

- We are only supporting Raydium Dex for now, Orca and Meteora integrations is still in development.
- A CLI tool for creating and trading Solana **_SPL tokens_**, performing **_On-chain AMM liquidity Pools operation_** of Raydium, Orca and Meteora.
- The code is written in a modular way, so that it can be easily extended to support other Solana-based projects.

## Installation 🛠️

1. `git clone https://github.com/ManofDiligence/Solana-Memecoin-CLI.git`
2. `cd Solana-Memecoin-CLI`
3. `nvm install v22.2.0`
4. `nvm use v22.2.0`
5. `npm install`
6. `node help.js `（to see commands or read cli_doc.txt file)
7. also see the command examples in examples/

### Prerequisites 🚨

0. we have added a .env.copy file in src/helpers/.env.copy for you to follow and paste your keys to the code.
1. Add your mainnet wallet secret key, devnet wallet secret key (optional), RPC endpoint(must) and shyft api key(if you need to add/remove liquidity to liq pool on raydium)
2. change the .env.copy file to .env
3. in src/helpers/config.js, please copy and fill in your .env path.

## Features ✅:

- Create a new SPL token and it will automatically mint to your wallet
- Burn a percentage of a token
- Revoke mint and freeze authority of a token
- **Add liquidity** to a pool
- **Remove liquidity** from a pool
- Swap tokens in a **raydium dex's AMM pool**
- Query the most liquid pool in a raydium dex by just providing the token address
- Buy a token using SOL using raydium
- Sell a token for SOL using raydium
- **Buy, Sell, and Create token and market in pump.fun**
- Check the balance of a token in your wallet

## Features in Development 🚧:

- A Website for anyone to do these thing with their browser-based wallet
- Function to **create a market for your token on raydium**
- **More dexes support**, (Orca, Meteora, etc.)
- **Phantom wallet integration**
- more features to come...

# Commands </> (Please see the command examples in examples/ to get start~)

### cluster options use devnet or mainnet

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

4. Specify the token address, the amount of token you want to transfer, the destination address, and the cluster you want to use.

```
node transfer --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --amount <AMOUNT> --destination <RECEIVE_ADDRESS>
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

# Code Usage </>

## Token:

- src/Token/create.js: create a spl token on devnet or mainnet with a given name, symbol, token image(using irys decentralized storage), metadata json file, supply, decimals, the code by default revokes the mint authority and freeze authority after creating the token so that the token has a cap and no one can feeze the token of the token holder, it will then mint all the token to your wallet

- src/Token/burn.js: burn spl token with a given percentage of the token from your wallet

- src/Token/revoke_authority.js: revoke mint and freeze authority of a given token

## Pool:

- src/Pool/add_pool.js: add liquidity to a pool in a given token address, the code find the most liquid pool (TOKEN_ADDRESS/SOL) in the raydium dex and add liquidity to it. You need to specify the amount of liquidity(sol) you want to add.

- src/Pool/remove_pool.js: remove liquidity from a pool in a given token address, the code find the most liquid pool (TOKEN_ADDRESS/SOL) in the raydium dex and remove liquidity from it. You need to specify the amount of percentage of liquidity you want to remove.

- src/Pool/swap.js: swap token for another token in the raydium dex, src/Trading/dex/raydium/buy.js and src/Trading/dex/raydium/sell.js are based on this code.

- src/Pool/query_pool.js: query the pool information of a given pool address in the raydium dex, it use shyft api to get the pool information. Please make sure you have your shyft api key inside the code before running this code.

## Trading:

- src/Trading/dex/raydium/sell.js: selling spl token for SOL in your wallet using raydium dex swap function

- src/Trading/dex/raydium/buy.js: buying spl token using SOL in your wallet using raydium dex swap function

## Helper methods:

- src/helpers/config.js: configuration file for the code.

- src/helpers/util.js: utility functions for the code, including: send transactions to Solana blockchain, dropped transactions handling, etc.

- src/helpers/check_balance.js: check the balance of a given token in your wallet

### if you think this project is useful, please give us a star🌟, it will help us a lot or consider to buy us a coffee 📚🎧☕,

### solana address: 8FV2wovZuac8ZFMYMpRJGEG1vpBQGwLYiU31eR86Bp3g

### it is a work in progress, we are still working on it, if you have any suggestions, please let us know.

### **_Other dex integration is still in development, stay tuned for the updates.🤖_**
