import { logger, retrieveEnvVariable } from "../../../../utils";
import {
    Commitment
  } from "@solana/web3.js";
export const NETWORK = 'mainnet-beta';
export const COMMITMENT_LEVEL: Commitment = retrieveEnvVariable('COMMITMENT_LEVEL', logger) as Commitment;
export const RPC_ENDPOINT = retrieveEnvVariable('MAINNET_ENDPOINT', logger);
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('WS_MAINNET_ENDPOINT', logger);
export const GRPC_XTOKEN = retrieveEnvVariable('GRPC_XTOKEN', logger);
export const GRPC_URL = retrieveEnvVariable('GRPC_URL', logger);
export const LOG_LEVEL = retrieveEnvVariable('LOG_LEVEL', logger);