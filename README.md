## SPL token ALL-IN-ONE Command line tool

- This is a CLI tool for creating and managing Solana SPL tokens. It is written in Javascript.
- The code is written in a modular way, so that it can be easily extended to support other Solana-based projects.
- We are only supporting Raydium Dex for now, but we will add more dex support in the future.
  
## Installation
1. git clone [https://github.com/ManofDiligence/Solana-Memecoin-CLI.git](https://github.com/ManofDiligence/Solana-Memecoin-CLI.git)
2. cd Solana-Memecoin-CLI
3. npm install
4. node help.js (to see commands or read CLI_Doc.txt file)

### Make sure you fully understand the code before running it, we are not responsible for any loss of your asset.

### TODO:
0. we have added a .env.copy file for you to follow and paste your keys to the code.
1. Add your mainnet wallet secret key, devnet wallet secret key (optional), RPC endpoint(must) and shyft api key(if you need to add/remove liquidity to liq pool on raydium)
2. change the .env.copy file to .env
## Completed Features ✅:

- Create a new SPL token
- Burn a percentage of a token
- Revoke mint and freeze authority of a token
- Add liquidity to a pool
- Remove liquidity from a pool
- Swap tokens in a raydium dex's AMM pool
- Query the most liquid pool in a raydium dex by just providing the token address
- Buy a token using SOL in a raydium dex
- Sell a token for SOL in a raydium dex
- Check the balance of a token in your wallet

## Features in Development 🚧:

- More dexes support, (Orca, Meteora, etc.)
- Auto trading bots powered by Jupiter aggregating protocol
- create a raydium dex pool (create market)
- airdrop tokens to a list of addresses
- phantom wallet integration
- more features to come...

### Usage:

## Token:

- src/Token/create.js: create a spl token on devnet or mainnet with a given name, symbol, token image(using irys decentralized storage), supply, decimals, the code by default revokes the mint authority and freeze authority after creating the token.

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

## ***Other dex functions is still in development, stay tuned for the updates.***
