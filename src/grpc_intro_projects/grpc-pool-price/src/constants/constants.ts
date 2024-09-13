import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { logger, retrieveEnvVariable } from "../../../../utils";
import {
  Currency,
  Token,
  TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
export const NETWORK = "mainnet-beta";
export const COMMITMENT_LEVEL: Commitment = retrieveEnvVariable(
  "COMMITMENT_LEVEL",
  logger
) as Commitment;
export const RPC_ENDPOINT = retrieveEnvVariable("MAINNET_ENDPOINT", logger);
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable(
  "WS_MAINNET_ENDPOINT",
  logger
);
export const GRPC_XTOKEN = retrieveEnvVariable("GRPC_XTOKEN", logger);
export const LOG_LEVEL = retrieveEnvVariable("LOG_LEVEL", logger);
export const GRPC_URL = retrieveEnvVariable("GRPC_URL", logger);
export const PRIVATE_KEY = retrieveEnvVariable("PRIVATE_KEY", logger);
export const JITO_TIPS = retrieveEnvVariable("JITO_FEE", logger);
export const connection = new Connection(RPC_ENDPOINT, "processed");
export const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
export const wsol = "So11111111111111111111111111111111111111112";
const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const quoteToken = [
  usdc, // USDC
  "SOL", // SOL
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  wsol, // WSOL
];
export const DEFAULT_TOKEN = {
  SOL: new Currency(9, "SOL", "SOL"),
  WSOL: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey("So11111111111111111111111111111111111111112"),
    9,
    "WSOL",
    "WSOL"
  ),
  USDC: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    6,
    "USDC",
    "USDC"
  ),
};
