import { Commitment } from "@solana/web3.js";
import { logger, retrieveEnvVariable } from "../../../../utils";

export const NETWORK = 'mainnet-beta';
export const COMMITMENT_LEVEL: Commitment = retrieveEnvVariable('COMMITMENT_LEVEL', logger) as Commitment;
export const RPC_ENDPOINT = retrieveEnvVariable('MAINNET_ENDPOINT', logger);
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('WS_MAINNET_ENDPOINT', logger);
export const LOG_LEVEL = retrieveEnvVariable('LOG_LEVEL', logger);
export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger);
export const QUOTE_AMOUNT = retrieveEnvVariable('QUOTE_AMOUNT', logger);
export const GRPC_XTOKEN = retrieveEnvVariable('GRPC_XTOKEN', logger);
export const GRPC_URL = retrieveEnvVariable('GRPC_URL', logger);
export const QUOTE_MINT = retrieveEnvVariable('QUOTE_MINT', logger);