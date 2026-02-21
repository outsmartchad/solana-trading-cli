/**
 * Wallet management — multi-wallet storage for outsmart CLI.
 *
 * Wallets are stored in ~/.outsmart/wallets.json with structure:
 * {
 *   "active": "default",
 *   "wallets": {
 *     "default": { "privateKey": "<base58>", "publicKey": "<base58>" },
 *     "trading": { "privateKey": "<base58>", "publicKey": "<base58>" }
 *   }
 * }
 *
 * File permissions are set to 0o600 (owner-only read/write).
 */

import fs from "fs";
import path from "path";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WalletEntry {
  privateKey: string; // base58-encoded secret key
  publicKey: string; // base58-encoded public key
}

export interface WalletStore {
  active: string;
  wallets: Record<string, WalletEntry>;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function getOutsmartDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  return path.join(home, ".outsmart");
}

function getWalletsPath(): string {
  return path.join(getOutsmartDir(), "wallets.json");
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/**
 * Load the wallet store from disk. Returns empty store if file doesn't exist.
 */
export function loadWalletStore(): WalletStore {
  const filePath = getWalletsPath();
  if (!fs.existsSync(filePath)) {
    return { active: "", wallets: {} };
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as WalletStore;
  } catch {
    return { active: "", wallets: {} };
  }
}

/**
 * Save the wallet store to disk with owner-only permissions.
 */
export function saveWalletStore(store: WalletStore): void {
  const dir = getOutsmartDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = getWalletsPath();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2) + "\n", { mode: 0o600 });
}

/**
 * Migrate: if wallets.json doesn't exist but PRIVATE_KEY is set in env/config,
 * import it as the "default" wallet.
 */
export function migrateFromEnvIfNeeded(): WalletStore {
  let store = loadWalletStore();

  if (Object.keys(store.wallets).length === 0) {
    // Check for PRIVATE_KEY in environment (loaded from config.env by config.ts)
    const envKey = process.env.PRIVATE_KEY;
    if (envKey) {
      try {
        const kp = Keypair.fromSecretKey(bs58.decode(envKey));
        store.wallets["default"] = {
          privateKey: envKey,
          publicKey: kp.publicKey.toBase58(),
        };
        store.active = "default";
        saveWalletStore(store);
      } catch {
        // Invalid key, skip migration
      }
    }
  }

  return store;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * List all wallet labels.
 */
export function listWallets(): { label: string; publicKey: string; isActive: boolean }[] {
  const store = migrateFromEnvIfNeeded();
  return Object.entries(store.wallets).map(([label, entry]) => ({
    label,
    publicKey: entry.publicKey,
    isActive: label === store.active,
  }));
}

/**
 * Get the active wallet label and keypair.
 * Falls back to PRIVATE_KEY env var if no wallets.json exists.
 */
export function getActiveWallet(): { label: string; keypair: Keypair } | null {
  const store = migrateFromEnvIfNeeded();
  const entry = store.wallets[store.active];
  if (!entry) return null;

  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(entry.privateKey));
    return { label: store.active, keypair };
  } catch {
    return null;
  }
}

/**
 * Add a new wallet. Returns the public key.
 * Throws if label already exists.
 */
export function addWallet(label: string, privateKey: string): string {
  const store = migrateFromEnvIfNeeded();

  if (store.wallets[label]) {
    throw new Error(`Wallet "${label}" already exists. Use a different label or remove it first.`);
  }

  // Validate the key
  let kp: Keypair;
  try {
    kp = Keypair.fromSecretKey(bs58.decode(privateKey));
  } catch {
    throw new Error("Invalid private key. Must be a valid base58-encoded Solana secret key.");
  }

  store.wallets[label] = {
    privateKey,
    publicKey: kp.publicKey.toBase58(),
  };

  // If this is the first wallet, make it active
  if (!store.active || !store.wallets[store.active]) {
    store.active = label;
  }

  saveWalletStore(store);
  return kp.publicKey.toBase58();
}

/**
 * Switch the active wallet to the given label.
 * Throws if label doesn't exist.
 */
export function switchWallet(label: string): string {
  const store = migrateFromEnvIfNeeded();

  if (!store.wallets[label]) {
    const available = Object.keys(store.wallets);
    throw new Error(
      `Wallet "${label}" not found. Available wallets:\n` +
      available.map((l) => `    ${l}`).join("\n"),
    );
  }

  store.active = label;
  saveWalletStore(store);

  // Reset wallet cache so getWallet() picks up the new active wallet
  try {
    const { resetWalletCache } = require("./config");
    resetWalletCache();
  } catch {
    // config may not be loaded yet
  }

  return store.wallets[label].publicKey;
}

/**
 * Remove a wallet by label.
 * Throws if label doesn't exist or if trying to remove the active wallet
 * when it's the only one.
 */
export function removeWallet(label: string): void {
  const store = migrateFromEnvIfNeeded();

  if (!store.wallets[label]) {
    throw new Error(`Wallet "${label}" not found.`);
  }

  delete store.wallets[label];

  // If we removed the active wallet, switch to another one
  if (store.active === label) {
    const remaining = Object.keys(store.wallets);
    store.active = remaining.length > 0 ? remaining[0] : "";
  }

  saveWalletStore(store);
}
