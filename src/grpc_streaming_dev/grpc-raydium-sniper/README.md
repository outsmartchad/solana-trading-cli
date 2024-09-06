# Geyser gRPC Raydium Sniper (Still testing, don't use it plz)

## Overview

A sniper bot that uses gRPC streaming to monitor and interact with Raydium and Openbook markets. It's designed to quickly detect and trade new tokens or specific target tokens on the Solana blockchain.

## How It Works

1. Streams Openbook market data and stores it in a queue.
2. Monitors Raydium liquidity pools for new token events.
3. When a target token is detected, it attempts to execute a buy transaction.
4. Optionally uses Jito leader schedule for transaction timing optimization.

## Usage

- run `ts-node src/grpc_streaming_dev/grpc-raydium-sniper/src/streaming/snipe-pump.ts -h` to test the snipe-pump command and see the available options
- run `ts-node src/grpc_streaming_dev/grpc-raydium-sniper/src/streaming/snipe-normal-raydium.ts -h` to test the snipe-raydium command and see the available options
- run `ts-node src/grpc_streaming_dev/grpc-raydium-sniper/src/streaming/snipe-pump.ts` to snipe any pump token that mirigating from pump.fun to raydium
- run `ts-node src/grpc_streaming_dev/grpc-raydium-sniper/src/streaming/snipe-normal-raydium.ts` to snipe any new created pool on raydium

- run `ts-node src/grpc_streaming_dev/grpc-raydium-sniper/src/streaming/pump-listeners.ts` to see the pump token which completed the bonding curve in real-time

## Features

- Real-time streaming of Openbook and Raydium data
- swap tokens in milliseconds
- snipe pump tokens that mirigating from pump.fun to raydium
- snipe normal new created pool on raydium
- Configurable for different token types (e.g., "pump" tokens)
- Integration with Jito leader schedule (optional)
- Customizable logging with Pino

## Contributing

Contributions are welcome. Please submit pull requests with any improvements or bug fixes.

## Disclaimer

This software is in beta and for educational purposes only. Use at your own risk. The authors are not responsible for any financial losses incurred while using this software.

## Note

The current implementation includes commented-out code for Jito leader schedule integration. Uncomment and configure as needed for advanced usage.
