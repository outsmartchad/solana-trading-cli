import * as raydium from "@raydium-io/raydium-sdk";

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import bs58 from "bs58";
// connection.sendTransaction();
function loadKeypairFromFile(filename) {
  const secret = fs.readFileSync(filename, { encoding: "utf8" });
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
}
export const wallet = loadKeypairFromFile("<PATH_TO_SECRET_KEY_JSON_FILE>");
export const dev_endpoint = "<DEVNET_API_ENDPOINT>";
export const main_endpoint = "<MAINNET_API_ENDPOINT>";
export const connection = new Connection(main_endpoint);
export const dev_connection = new Connection(dev_endpoint, "confirmed");

export const ENDPOINT = raydium.ENDPOINT;
export const PROGRAMIDS = raydium.MAINNET_PROGRAM_ID;

export const RAYDIUM_MAINNET_API = raydium.RAYDIUM_MAINNET;

export const makeTxVersion = raydium.TxVersion.V0; // LEGACY

export const addLookupTableInfo = raydium.LOOKUP_TABLE_CACHE; // only mainnet. other = undefined

export const DEFAULT_TOKEN = {
  SOL: new raydium.Currency(9, "SOL", "SOL"),
  WSOL: new raydium.Token(
    raydium.TOKEN_PROGRAM_ID,
    new PublicKey("So11111111111111111111111111111111111111112"),
    9,
    "WSOL",
    "WSOL"
  ),
  USDC: new raydium.Token(
    raydium.TOKEN_PROGRAM_ID,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    6,
    "USDC",
    "USDC"
  ),
};
