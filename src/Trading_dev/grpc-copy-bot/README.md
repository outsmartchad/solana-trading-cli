#*Geyser grpc Pump.fun Sniper Bot (Beta)*

## How it works

- It uses the geyser grpc plugin that subscribe all the latest slot that receive from the grpc server.
- It basically only consider the slot or block in "processed" commitment level to make sure the request can land in the next block or next few block(what we expected).

- Use a grpc subscription to subscribe the transactions that including the target smart wallet address and listen for the swap transactions.
- Once the swap event is detected, it calculate the how much token the trader bought or how much token the trader sold by considering the number of token and sol changes in the liquidity pool.
- The entry/exit price is calculated by the formula: entry/exit price = post SOL in Pool / post token in Pool

## Limitations
- It only works on raydium swap transactions now.
- It uses SOL for settlement, buy using SOL and sell for SOL.

## Prerequisites

- run `ts-node src/streaming/copy-trade.ts -h` to test the copy-trade command and see the available options
- to change the parameters, you can modify the .env file
- to have a try, run ```ts-node /Users/{your_path_to_this_dir}/src/streaming/copy-trade.ts --trader your_target_trader_address```

## Code usage

- constants/constants.ts: retriving the variable in .env

- src/streaming/copy-trade.ts: a cli interface to interact the whole dir

- streaming/stream-trader.ts: subscribing any trader's swap txns of newest block in processed level

- src/jito/bundle.ts: sending the bundle with tips to jito

- src/streaming/grpc-requests-type.ts: different grpc request types for monitoring the target trader

- src/raydium/*.ts: constructing the proper instructions of buy and sell on raydium