import {
  Currency,
  Token,
  ENDPOINT,
  MAINNET_PROGRAM_ID,
  RAYDIUM_MAINNET,
  TxVersion,
  LOOKUP_TABLE_CACHE,
  TOKEN_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import dotenv from "dotenv";
import bs58 from "bs58";
import path from "path";

// Config resolution order:
// 1. Environment variables (always override)
// 2. .env in current working directory
// 3. .env in src/helpers/ (legacy path)
// 4. ~/.outsmart/config.env (global config)
const homeConfigPath = path.join(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".outsmart",
  "config.env"
);
const legacyEnvPath = path.join(__dirname, ".env");
const cwdEnvPath = path.join(process.cwd(), ".env");

// Config loading strategy:
// dotenv.config() never overwrites already-set env vars, so we load
// highest-priority files FIRST. Later files only fill in missing vars.
//   Priority: env vars > cwd/.env > ~/.outsmart/config.env
if (fs.existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath });
}
if (fs.existsSync(homeConfigPath)) {
  dotenv.config({ path: homeConfigPath });
}
// Note: if no config files found, we proceed with environment variables only.
// This allows the CLI to run `outsmart init` without a pre-existing config.

export function loadKeypairFromFile(filename: string): Keypair {
  const secret = fs.readFileSync(filename, { encoding: "utf8" });
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
}

// --- Lazy wallet initialization ---
// The wallet is NOT decoded at import time. Use getWallet() to access it.
let _wallet: Keypair | null = null;

export function getWallet(): Keypair {
  if (!_wallet) {
    const key = process.env.PRIVATE_KEY;
    if (!key) {
      throw new Error(
        "PRIVATE_KEY not set. Run 'outsmart init' to configure, or set PRIVATE_KEY in your environment."
      );
    }
    try {
      _wallet = Keypair.fromSecretKey(bs58.decode(key));
    } catch (e) {
      throw new Error("Invalid PRIVATE_KEY. Must be a valid base58-encoded Solana secret key.");
    }
  }
  return _wallet;
}

// Backward compatibility: lazy getter that triggers on first access
// WARNING: Deprecated. Use getWallet() in new code.
let _walletProxy: Keypair | null = null;
Object.defineProperty(module.exports, "wallet", {
  get: () => {
    if (!_walletProxy) {
      _walletProxy = getWallet();
    }
    return _walletProxy;
  },
  enumerable: true,
});
// TypeScript consumers: use getWallet() directly.
// The defineProperty above provides `require("...").wallet` for JS callers.

// --- Validated config values ---
export const jito_fee: number = parseFloat(process.env.JITO_FEE || "0.0001");
export const shyft_api_key: string = process.env.SHYFT_API_KEY || "";
export const dev_endpoint: string = process.env.DEVNET_ENDPOINT || "";
export const main_endpoint: string = process.env.MAINNET_ENDPOINT || "";
export const bloXRoute_auth_header: string = process.env.BLOXROUTE_AUTH_HEADER || "";
export const bloXroute_fee: number = parseFloat(process.env.BLOXROUTE_FEE || "0.001");
export const smart_money_wallet: string = process.env.SMART_MONEY_WALLET || "";

// --- TX Landing config ---
export const DEFAULT_TIP_SOL: number = parseFloat(process.env.DEFAULT_TIP_SOL || "0.001");
export const DEFAULT_SLIPPAGE_BPS: number = parseInt(process.env.DEFAULT_SLIPPAGE_BPS || "300", 10);
export const TX_LANDING_MODE: string = process.env.TX_LANDING_MODE || "concurrent";

// --- Lazy connection initialization ---
let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    if (!main_endpoint) {
      throw new Error(
        "MAINNET_ENDPOINT not set. Run 'outsmart init' to configure, or set MAINNET_ENDPOINT in your environment."
      );
    }
    _connection = new Connection(main_endpoint, "confirmed");
  }
  return _connection;
}

// Backward compatibility: eager connection (will throw if no endpoint)
// WARNING: Deprecated. Use getConnection() in new code.
export const connection: Connection = main_endpoint
  ? new Connection(main_endpoint, "confirmed")
  : (null as unknown as Connection);

export const dev_connection: Connection = dev_endpoint
  ? new Connection(dev_endpoint, "confirmed")
  : (null as unknown as Connection);

// --- Raydium SDK re-exports ---
export const PROGRAMIDS = MAINNET_PROGRAM_ID;
export const RAYDIUM_MAINNET_API = RAYDIUM_MAINNET;
export const makeTxVersion = TxVersion.V0;
export const _ENDPOINT = ENDPOINT;
export const addLookupTableInfo = LOOKUP_TABLE_CACHE;

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

// --- Common constants ---
export const wsol = "So11111111111111111111111111111111111111112";
export const usdc = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const usdt = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";