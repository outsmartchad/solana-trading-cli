# *Geyser grpc Rug Detection Bot (Still in development, don't use it)*

## How it works

- It uses the Geyser gRPC plugin to subscribe to all the latest slots received from the gRPC server.
- It monitors token addresses and checks for suspicious inflows to specific wallet addresses.
- If the inflow to a wallet address exceeds a defined threshold, it logs a warning indicating potential rug pull activity.

## Prerequisites

- Ensure you have the necessary environment variables set up in the `.env` file.
- Install the required dependencies by running `npm install` or `yarn install`.

## Code usage

- **constants/constants.ts**: Retrieves variables from the `.env` file.
- **streaming/stream-token.ts**: Contains the main logic for subscribing to token transactions and detecting suspicious inflows.
- **utils.ts**: Utility functions for handling gRPC subscriptions and other common tasks.
- **grpc-requests-type.ts**: Defines different gRPC request types for monitoring token transactions.
- **logger.ts**: Configures the logging mechanism for the project.

## Running the Bot

1. **Start the Rug Detection Bot**:
   - Run the following command to start monitoring a specific token address:
     ```bash
     ts-node src/streaming/stream-token.ts --token-address <TOKEN_ADDRESS>
     ```

2. **Example Command**:
   - To monitor a token address and log suspicious inflows:
     ```bash
     ts-node src/streaming/stream-token.ts --token-address <TOKEN_ADDRESS>
     ```

## Configuration

- **Threshold**: You can configure the threshold for suspicious inflows in the `stream-token.ts` file.
- **Logging**: Adjust the logging level and format in the `logger.ts` file.

## Additional Information

- The bot uses the `@solana/web3.js` library to interact with the Solana blockchain.
- The gRPC client is configured to connect to the Geyser gRPC server for real-time transaction data.

## Troubleshooting

- Ensure your environment variables are correctly set in the `.env` file.
- Check the logs for any error messages and adjust the configuration as needed.
- Make sure you have a stable internet connection to receive real-time data from the gRPC server.
