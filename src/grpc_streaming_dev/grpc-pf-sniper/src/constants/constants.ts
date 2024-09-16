import { logger, retrieveEnvVariable } from "../../../../utils";
import {
    Commitment
  } from "@solana/web3.js";
export const NETWORK = 'mainnet-beta';
export const COMMITMENT_LEVEL: Commitment = retrieveEnvVariable('COMMITMENT_LEVEL', logger) as Commitment;
export const RPC_ENDPOINT = retrieveEnvVariable('MAINNET_ENDPOINT', logger);
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('WS_MAINNET_ENDPOINT', logger);
export const GRPC_XTOKEN = retrieveEnvVariable('GRPC_XTOKEN', logger);
console.log('GRPC_XTOKEN: ', GRPC_XTOKEN);
export const GRPC_URL = retrieveEnvVariable('GRPC_URL', logger);
export const LOG_LEVEL = retrieveEnvVariable('LOG_LEVEL', logger);
export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger);
export const QUOTE_AMOUNT = retrieveEnvVariable('QUOTE_AMOUNT', logger);
export const JITO_TIPS = retrieveEnvVariable('JITO_FEE', logger);
export const AUTO_SELL = retrieveEnvVariable('AUTO_SELL', logger) === 'true';
export const AUTO_SELL_TIMEOUT = retrieveEnvVariable('AUTO_SELL_TIMEOUT', logger);
export {ComputeBudgetProgram, Connection,
     Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, 
     TransactionMessage, VersionedTransaction, Transaction, 
     Commitment} from "@solana/web3.js";