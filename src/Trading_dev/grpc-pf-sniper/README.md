#*Geyser grpc Pump.fun Sniper Bot (Beta)*

## How it works

- It uses the geyser grpc plugin that subscribe all the latest slot that receive from the validators of your grpc endpoint.
- It basically only consider the slot or block in "processed" commitment level to make sure the request can land in the next block.
- Use a grpc subscription to subscribe the transactions that including the solana account of the Pump.fun Token Mint Authority and listen for the mint event (https://solscan.io/account/TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM).
- Once the mint event is detected, it will create a snipe transaction to snipe the token!


## Prerequisites

- run `npm install` to install all the dependencies
- run `ts-node src/streaming/snipe-create.ts -h` to test the snipe-create command and see the available options
- to change the parameters, you can modify the .env file
- to have a try, run ```ts-node src/streaming/snipe-create.ts --auto-sell --jito --n 3```

## Code usage

- constants/constants.ts: retriving the variable in .env

- streaming/pump.fun.ts: subscribing any pump.fun create token's txns of newest block in processed level

- src/jito/bundle.ts: sending the bundle with tips to jito

- src/transaction/transaction.ts: main functions of createAndBuy, buy, and sell

- src/pumpdotfun-sdk/*: constructing the proper instructions of create, buy, and sell

- src/streaming/snipe-create.ts: a cli interface to interact the whole dir

- src/streaming/grpc-requests-type.ts: different grpc request types for sniping on pump.fun