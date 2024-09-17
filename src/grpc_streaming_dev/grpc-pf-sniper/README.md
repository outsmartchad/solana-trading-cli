# *Geyser gRPC Pump.fun Sniper Bot (Beta)*

## Overview

A sniper bot uses gRPC to stream the new txns from mint authority of Pump.fun. It's designed to quickly detect and trade any new tokens or target new token on pump.fun

## How it works

- It uses the geyser grpc plugin that subscribe all the latest slot that receive from the grpc server.
- It basically only consider the slot or block in "processed" commitment level to make sure the request can land in the next block or next few block(what we expected).

- Use a grpc subscription to subscribe the transactions that includes the solana account of the Pump.fun Token Mint Authority and listen for the mint event (https://solscan.io/account/TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM).
- Once the mint event is detected, it will send a snipe transaction to snipe the token!
- it uses SOL for trading.

## Prerequisites

- run `ts-node src/streaming/snipe-create.ts -h` to test the snipe-create command and see the available options
- to change the parameters, you can modify the .env file
- to have a try, run ```ts-node src/streaming/snipe-create.ts --auto-sell --jito --n 3```

## Code usage

- constants/constants.ts: retriving the variable in .env

- streaming/pump.fun.ts: subscribing any pump.fun create token's txns of newest block in processed level

- src/jito/bundle.ts: sending the bundle with tips to jito blockengine

- src/transaction/transaction.ts: main functions of createAndBuy, buy, and sell

- src/pumpdotfun-sdk/*: constructing the proper instructions of create, buy, and sell

- src/streaming/snipe-create.ts: a cli interface to interact the whole dir

- src/streaming/grpc-requests-type.ts: different grpc request types for sniping on pump.fun

## Features

- Real-time streaming of Pump.fun's mint authority
- Fast sniping using pump.fun sdk in milliseconds
- Integration with Jito leader schedule (optional)
- Customizable logging with Pino

## Contributing

Contributions are welcome. Please submit pull requests with any improvements or bug fixes.

## Disclaimer

This software is in beta and for educational purposes only. Use at your own risk. The authors are not responsible for any financial losses incurred while using this software.

## Note

The current implementation includes commented-out code for Jito leader schedule integration. Uncomment and configure as needed for advanced usage.
