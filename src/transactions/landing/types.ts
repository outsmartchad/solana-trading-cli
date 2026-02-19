/**
 * TX Landing Layer — Shared Types & Interfaces
 *
 * This module defines the provider interface and shared types used by
 * all 12+ TX landing providers (0slot, nozomi, helius-sender, blockrazor,
 * node1.me, bloXroute, astralane, stellium, flashblock, jito, nextblock, soyas).
 *
 * Each provider implements ILandingProvider. The orchestrator calls them
 * using a uniform interface — no provider-specific logic leaks out.
 */

import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Provider result
// ---------------------------------------------------------------------------

export interface LandingResult {
  /** Provider name (e.g. "0slot", "nozomi") */
  provider: string;
  /** Whether the submission was accepted by the provider (NOT on-chain confirmation) */
  accepted: boolean;
  /** Transaction signature (base58), if available */
  signature?: string;
  /** Bundle ID (jito), if applicable */
  bundleId?: string;
  /** Provider-specific error, if submission failed */
  error?: string;
  /** Round-trip latency in ms */
  latencyMs?: number;
}

// ---------------------------------------------------------------------------
// Submission options
// ---------------------------------------------------------------------------

export interface SubmitOptions {
  /** The DEX this transaction targets (e.g. "raydium-amm-v4", "meteora-dlmm") */
  dex: string;
  /** "buy" | "sell" | "snipe" | "create_account" | "create_damm_pool" */
  operation: string;
  /** Tip amount in SOL (overrides provider default if > 0) */
  tipSol?: number;
  /** Extra signers beyond the primary wallet (e.g. positionNft for DAMM pool creation) */
  extraSigners?: Keypair[];
  /** Address lookup table accounts for V0 message compilation */
  addressLookupTables?: AddressLookupTableAccount[];
  /**
   * Skip durable nonce for concurrent strategy.
   * WARNING: Without nonce, concurrent submission risks duplicate buys.
   * Only set this if you understand the risks.
   */
  skipNonce?: boolean;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface ILandingProvider {
  /** Unique name (e.g. "0slot", "nozomi") */
  readonly name: string;

  /**
   * Submit a transaction to this provider.
   *
   * @param ixs          - Instructions to include (tip instruction is appended by the provider)
   * @param signer       - Primary wallet keypair
   * @param blockhash    - Recent blockhash (string or { blockhash, lastValidBlockHeight })
   * @param opts         - Submission options
   * @returns            - Provider result
   */
  submit(
    ixs: TransactionInstruction[],
    signer: Keypair,
    blockhash: string | { blockhash: string; lastValidBlockHeight: number },
    opts: SubmitOptions,
  ): Promise<LandingResult>;

  /**
   * Optional health check / keep-alive ping.
   * Providers that support it (blockrazor, stellium, nextblock, soyas) implement this.
   */
  ping?(): Promise<void>;

  /**
   * Whether this provider is currently enabled (has required env vars / API keys).
   */
  isEnabled(): boolean;
}

// ---------------------------------------------------------------------------
// Orchestrator strategy
// ---------------------------------------------------------------------------

export type SubmissionStrategy =
  | "concurrent"       // Fire to all enabled providers in parallel (fire-and-forget)
  | "race"             // Fire to all, return first accepted result
  | "random"           // Pick 1-3 random providers + always include a fallback
  | "sequential";      // Try providers in order, stop on first success

export interface OrchestratorConfig {
  /** Which providers to use (by name). If empty, use all enabled providers. */
  providers?: string[];
  /** Submission strategy */
  strategy: SubmissionStrategy;
  /** Default tip in SOL if not specified per-call */
  defaultTipSol: number;
  /** Timeout per provider in ms (default 10000) */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Tip account entry
// ---------------------------------------------------------------------------

export interface TipAccount {
  /** Provider this tip account belongs to */
  provider: string;
  /** Base58 public key */
  address: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract blockhash string from various formats.
 */
export function extractBlockhash(
  bh: string | { blockhash: string; lastValidBlockHeight: number },
): string {
  return typeof bh === "string" ? bh : bh.blockhash;
}

/**
 * Pick a random element from an array.
 */
export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
