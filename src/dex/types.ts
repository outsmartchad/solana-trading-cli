/**
 * DEX Adapter Layer — Shared Types & Interfaces
 *
 * Every DEX module (raydium-amm-v4, meteora-dlmm, orca, jupiter, etc.)
 * implements IDexAdapter. The DexRegistry provides them to the CLI and
 * to external consumers (OpenClaw plugin, bots, etc.) via getDexAdapter().
 *
 * Design decisions:
 * - String mint addresses (not PublicKey) — matches Jupiter pattern, avoids
 *   forcing consumers to import @solana/web3.js. Adapters convert internally.
 * - buildSwapIxs() is separate from buy() — the nonce manager needs to
 *   prepend nonceAdvance before swap instructions. If buy() is monolithic
 *   (build+sign+send), there's no hook point.
 * - SnipeParams.poolAddress is required — you can't snipe without knowing
 *   the pool. Regular buy() can auto-discover.
 * - DexCapabilities object — extensible feature flags, one place to check
 *   what an adapter supports.
 */

import {
  TransactionInstruction,
  Keypair,
  AddressLookupTableAccount,
} from "@solana/web3.js";

import { SubmissionStrategy } from "../transactions/landing/types";

// ---------------------------------------------------------------------------
// Swap side
// ---------------------------------------------------------------------------

export type SwapSide = "buy" | "sell";

// ---------------------------------------------------------------------------
// Common swap options (shared across buy/sell/snipe)
// ---------------------------------------------------------------------------

export interface SwapOpts {
  /** Slippage tolerance in basis points (default: 300 = 3%) */
  slippageBps?: number;

  /** Priority fee in microLamports per compute unit (default: 4000) */
  priorityFeeMicroLamports?: number;

  /** MEV tip in SOL — appended as tip instruction to a tip account */
  tipSol?: number;

  /** Compute unit limit (default: adapter-specific, usually 200_000-400_000) */
  computeUnitLimit?: number;

  /** Use Jito bundle submission instead of standard landing */
  useJito?: boolean;

  /** TX landing strategy override (default: from env TX_LANDING_MODE) */
  landingStrategy?: SubmissionStrategy;

  /**
   * Address lookup table accounts for V0 message compilation.
   * Adapters may provide their own; this allows callers to add extras.
   */
  addressLookupTables?: AddressLookupTableAccount[];
}

// ---------------------------------------------------------------------------
// Buy parameters
// ---------------------------------------------------------------------------

export interface BuyParams {
  /** Token mint address to buy (base58 string) */
  tokenMint: string;

  /** Amount of SOL (or quote token) to spend, in human-readable units */
  amountSol: number;

  /**
   * Quote token mint address (default: WSOL).
   * Some pools pair tokens with USDC/USDT instead of SOL.
   */
  quoteMint?: string;

  /**
   * Pool address to trade on. If omitted, the adapter will attempt
   * auto-discovery via findPool().
   */
  poolAddress?: string;

  /** Swap options */
  opts?: SwapOpts;
}

// ---------------------------------------------------------------------------
// Sell parameters
// ---------------------------------------------------------------------------

export interface SellParams {
  /** Token mint address to sell (base58 string) */
  tokenMint: string;

  /**
   * Percentage of held token balance to sell (0-100).
   * 100 = sell all, 50 = sell half.
   */
  percentage: number;

  /**
   * Quote token mint to receive (default: WSOL).
   */
  quoteMint?: string;

  /**
   * Pool address. If omitted, adapter auto-discovers.
   */
  poolAddress?: string;

  /** Swap options */
  opts?: SwapOpts;
}

// ---------------------------------------------------------------------------
// Snipe parameters
// ---------------------------------------------------------------------------

export interface SnipeParams {
  /** Token mint address to snipe (base58 string) */
  tokenMint: string;

  /** Amount of SOL to spend, in human-readable units */
  amountSol: number;

  /**
   * Pool address — REQUIRED for sniping.
   * Unlike buy(), you must know the pool in advance (from gRPC stream, etc.)
   */
  poolAddress: string;

  /** Quote token mint (default: WSOL) */
  quoteMint?: string;

  /** MEV tip in SOL — required for competitive sniping */
  tipSol: number;

  /** Swap options (slippage, compute budget, etc.) */
  opts?: SwapOpts;
}

// ---------------------------------------------------------------------------
// Swap result
// ---------------------------------------------------------------------------

export interface SwapResult {
  /** Transaction signature (base58) */
  txSignature: string;

  /** Whether the transaction was confirmed on-chain */
  confirmed: boolean;

  /** Amount of input token spent (human-readable units) */
  amountIn: number;

  /** Input token symbol or mint */
  amountInToken: string;

  /** Amount of output token received (human-readable units), if known */
  amountOut?: number;

  /** Output token symbol or mint */
  amountOutToken?: string;

  /** Price impact percentage, if calculable */
  priceImpactPct?: number;

  /** Which DEX adapter executed this swap */
  dex: string;

  /** Pool address used */
  poolAddress?: string;
}

// ---------------------------------------------------------------------------
// Generic TX result (for LP operations, etc.)
// ---------------------------------------------------------------------------

export interface TxResult {
  /** Transaction signature (base58) */
  txSignature: string;

  /** Whether the transaction was confirmed on-chain */
  confirmed: boolean;

  /** Error message if the transaction failed */
  error?: string;
}

// ---------------------------------------------------------------------------
// Pool info
// ---------------------------------------------------------------------------

export interface PoolInfo {
  /** Pool address (base58) */
  address: string;

  /** DEX adapter name that found this pool */
  dex: string;

  /** Protocol type (e.g. "amm-v4", "cpmm", "clmm", "dlmm") */
  protocol: string;

  /** Base token mint (base58) */
  baseMint: string;

  /** Quote token mint (base58) */
  quoteMint: string;

  /** Base token decimals */
  baseDecimals: number;

  /** Quote token decimals */
  quoteDecimals: number;

  /** Pool liquidity in USD (if known) */
  liquidity?: number;

  /** Current price of base token in quote token units */
  price?: number;
}

// ---------------------------------------------------------------------------
// Price info
// ---------------------------------------------------------------------------

export interface PriceInfo {
  /** Price of base token in quote token units */
  price: number;

  /** Base token mint (base58) */
  baseMint: string;

  /** Quote token mint (base58) */
  quoteMint: string;

  /** Source of the price (e.g. "on-chain", "api") */
  source: string;

  /** Pool address used for price calculation */
  poolAddress: string;

  /** Timestamp of the price reading (ms since epoch) */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Liquidity parameters
// ---------------------------------------------------------------------------

export interface AddLiquidityParams {
  /** Pool address to add liquidity to */
  poolAddress: string;

  /** Amount of token A (or SOL) to deposit, human-readable units */
  amountA: number;

  /** Amount of token B to deposit (if required by the pool type) */
  amountB?: number;

  /** Swap options (slippage, priority fee, etc.) */
  opts?: SwapOpts;
}

export interface RemoveLiquidityParams {
  /** Pool address to remove liquidity from */
  poolAddress: string;

  /** Percentage of LP position to remove (0-100) */
  percentage: number;

  /** Swap options */
  opts?: SwapOpts;
}

// ---------------------------------------------------------------------------
// Adapter capabilities
// ---------------------------------------------------------------------------

export interface DexCapabilities {
  /** Can execute buy swaps */
  canBuy: boolean;

  /** Can execute sell swaps */
  canSell: boolean;

  /**
   * Can snipe (concurrent TX landing with pre-built instructions).
   * Adapters that support snipe MUST implement buildSwapIxs().
   */
  canSnipe: boolean;

  /** Can discover pools for a token pair */
  canFindPool: boolean;

  /** Can read on-chain price from a pool */
  canGetPrice: boolean;

  /** Can add liquidity */
  canAddLiquidity: boolean;

  /** Can remove liquidity */
  canRemoveLiquidity: boolean;
}

/**
 * Create a DexCapabilities with all flags defaulting to false,
 * then override the ones you support.
 */
export function defaultCapabilities(
  overrides: Partial<DexCapabilities> = {},
): DexCapabilities {
  return {
    canBuy: false,
    canSell: false,
    canSnipe: false,
    canFindPool: false,
    canGetPrice: false,
    canAddLiquidity: false,
    canRemoveLiquidity: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Adapter info (for registry listing)
// ---------------------------------------------------------------------------

export interface DexAdapterInfo {
  /** Unique adapter name */
  name: string;

  /** Protocol type */
  protocol: string;

  /** Feature flags */
  capabilities: DexCapabilities;
}

// ---------------------------------------------------------------------------
// Build instructions result (for snipe / nonce integration)
// ---------------------------------------------------------------------------

/**
 * Result of building swap instructions without executing.
 * Used by the orchestrator to prepend nonce + compute budget instructions,
 * then submit through the landing layer.
 */
export interface BuildSwapIxsResult {
  /** Swap instructions (WITHOUT compute budget or tip — orchestrator adds those) */
  instructions: TransactionInstruction[];

  /** Extra signers beyond the primary wallet */
  signers: Keypair[];

  /** Address lookup tables needed for V0 message compilation */
  addressLookupTables?: AddressLookupTableAccount[];
}

// ---------------------------------------------------------------------------
// Main adapter interface
// ---------------------------------------------------------------------------

/**
 * IDexAdapter — The contract every DEX module implements.
 *
 * Each adapter encapsulates:
 * - SDK initialization and lifecycle
 * - Pool account derivation / discovery
 * - Token program detection (SPL vs Token-2022)
 * - Instruction building
 * - Swap execution (via landing layer or direct RPC)
 *
 * Adapters are registered with the DexRegistry and accessed via
 * getDexAdapter("raydium-amm-v4"). No direct imports of DEX internals
 * should leak to CLI or external consumers.
 */
export interface IDexAdapter {
  /** Unique adapter name, e.g. "raydium-amm-v4", "meteora-dlmm" */
  readonly name: string;

  /** Protocol type, e.g. "amm-v4", "cpmm", "clmm", "dlmm", "whirlpool", "ultra" */
  readonly protocol: string;

  /** Feature flags — what this adapter supports */
  readonly capabilities: DexCapabilities;

  // ----- Core operations -----

  /**
   * Buy tokens with SOL (or other quote token).
   *
   * The adapter handles:
   * 1. Pool discovery (if poolAddress not provided)
   * 2. Token program detection (SPL vs Token-2022)
   * 3. Slippage calculation and minAmountOut
   * 4. Instruction building
   * 5. Transaction submission via landing layer
   *
   * @param params - Buy parameters
   * @returns Swap result with signature, amounts, and pool info
   */
  buy(params: BuyParams): Promise<SwapResult>;

  /**
   * Sell tokens for SOL (or other quote token).
   *
   * @param params - Sell parameters (percentage-based)
   * @returns Swap result
   * @throws UnsupportedOperationError if capabilities.canSell is false
   */
  sell(params: SellParams): Promise<SwapResult>;

  // ----- Optional capabilities -----

  /**
   * Snipe a token on a known pool with concurrent TX landing.
   *
   * Differs from buy() in that:
   * - poolAddress is required (known from gRPC stream)
   * - tipSol is required (competitive sniping needs tips)
   * - Uses durable nonce if available (via NonceManager)
   * - Instructions are sent through the LandingOrchestrator
   *
   * Adapters that support snipe SHOULD also implement buildSwapIxs().
   *
   * @throws UnsupportedOperationError if capabilities.canSnipe is false
   */
  snipe?(params: SnipeParams): Promise<SwapResult>;

  /**
   * Build swap instructions without executing.
   *
   * Used by the orchestrator / snipe flow to:
   * 1. Prepend NonceManager.buildAdvanceIx() as first instruction
   * 2. Add compute budget instructions
   * 3. Add tip instruction
   * 4. Submit through the landing layer with nonce blockhash
   *
   * Adapters that support snipe MUST implement this.
   */
  buildSwapIxs?(params: BuyParams | SellParams): Promise<BuildSwapIxsResult>;

  /**
   * Discover pools for a given token pair on this DEX.
   *
   * @param baseMint - Token to find pools for (base58)
   * @param quoteMint - Quote token (default: WSOL). Pass undefined for any quote.
   * @returns Pool info or null if no pool found on this DEX
   */
  findPool?(baseMint: string, quoteMint?: string): Promise<PoolInfo | null>;

  /**
   * Get the current on-chain price from a pool.
   *
   * Price is calculated directly from on-chain state (reserves, sqrtPriceX64, etc.)
   * — not from an API. This ensures accuracy for sniping decisions.
   *
   * @param poolAddress - Pool to read price from (base58)
   */
  getPrice?(poolAddress: string): Promise<PriceInfo>;

  /**
   * Add liquidity to a pool.
   * @throws UnsupportedOperationError if capabilities.canAddLiquidity is false
   */
  addLiquidity?(params: AddLiquidityParams): Promise<TxResult>;

  /**
   * Remove liquidity from a pool.
   * @throws UnsupportedOperationError if capabilities.canRemoveLiquidity is false
   */
  removeLiquidity?(params: RemoveLiquidityParams): Promise<TxResult>;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Thrown when an adapter is asked to perform an operation it doesn't support.
 * Check adapter.capabilities before calling optional methods.
 */
export class UnsupportedOperationError extends Error {
  public readonly adapterName: string;
  public readonly operation: string;

  constructor(adapterName: string, operation: string) {
    super(`${adapterName} does not support '${operation}'`);
    this.name = "UnsupportedOperationError";
    this.adapterName = adapterName;
    this.operation = operation;
  }
}

/**
 * Thrown when a pool cannot be found for the given token pair on a DEX.
 */
export class PoolNotFoundError extends Error {
  public readonly dex: string;
  public readonly baseMint: string;
  public readonly quoteMint?: string;

  constructor(dex: string, baseMint: string, quoteMint?: string) {
    const quoteStr = quoteMint ? ` / ${quoteMint}` : "";
    super(`No pool found for ${baseMint}${quoteStr} on ${dex}`);
    this.name = "PoolNotFoundError";
    this.dex = dex;
    this.baseMint = baseMint;
    this.quoteMint = quoteMint;
  }
}

// ---------------------------------------------------------------------------
// Common constants
// ---------------------------------------------------------------------------

/** Wrapped SOL mint address */
export const WSOL_MINT = "So11111111111111111111111111111111111111112";

/** USDC mint address */
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** USDT mint address */
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

/** Default slippage in basis points (3%) */
export const DEFAULT_SLIPPAGE_BPS = 300;

/** Default priority fee in microLamports per compute unit */
export const DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS = 4000;

/** Default compute unit limit */
export const DEFAULT_COMPUTE_UNIT_LIMIT = 200_000;
