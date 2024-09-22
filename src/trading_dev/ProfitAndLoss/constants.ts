import { logger, retrieveEnvVariable } from "../../utils";
import {
    Currency,
    Token,
    TOKEN_PROGRAM_ID,
  } from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import path from "path";
export const path_To_bought_tokens = path.join(__dirname, "bought_tokens.json");
export const tp = retrieveEnvVariable("TAKE_PROFIT", logger);
export const sl = retrieveEnvVariable("STOP_LOSS", logger); 
export const order_size = retrieveEnvVariable("ORDER_SIZE", logger);
export const buyin_percentage = retrieveEnvVariable("BUYIN_PERCENTAGE", logger);
export const wsol = "So11111111111111111111111111111111111111112"
export const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
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