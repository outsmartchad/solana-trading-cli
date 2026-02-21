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
   * Pool address to trade on.
   *
   * Required for on-chain DEX adapters. Not needed for aggregators
   * (jupiter-ultra, dflow) which find the best route automatically.
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

  /** Position address (for LP operations that create/modify positions) */
  positionAddress?: string;

  /** Pool address (for LP operations) */
  poolAddress?: string;

  /** Which DEX adapter executed this operation */
  dex?: string;
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
// Pool creation parameters (DAMM v2 custom pool)
// ---------------------------------------------------------------------------

/**
 * Fee schedule configuration for DAMM v2 custom pools.
 *
 * Controls how fees decay over time after pool activation.
 * Two modes:
 *   - Linear (feeSchedulerMode=0): fees drop linearly from max to min
 *   - Exponential (feeSchedulerMode=1): fees drop exponentially from max to min
 */
export interface PoolFeeConfig {
  /** Maximum base fee in basis points (e.g. 9900 = 99%) — charged at pool activation */
  maxBaseFeeBps: number;

  /** Minimum base fee in basis points (e.g. 200 = 2%) — reached after totalDuration */
  minBaseFeeBps: number;

  /** Number of fee decay periods */
  numberOfPeriod: number;

  /** Total duration in seconds for fee schedule (activationType=1/timestamp) */
  totalDuration: number;

  /** 0 = Linear decay, 1 = Exponential decay */
  feeSchedulerMode: number;

  /** Whether to enable dynamic fee on top of base fee (adds ~20% of minBaseFeeBps) */
  useDynamicFee: boolean;

  /** Custom dynamic fee params (if null, auto-calculated from minBaseFeeBps) */
  dynamicFeeConfig?: {
    filterPeriod: number;
    decayPeriod: number;
    reductionFactor: number;
    variableFeeControl: number;
    maxVolatilityAccumulator: number;
  } | null;
}

/**
 * Parameters for creating a DAMM v2 custom pool (full fee config, custom price range).
 *
 * Uses `cpAmm.createCustomPool()` — the most flexible pool creation method.
 * This is what production systems use for token launches.
 */
export interface CreateCustomPoolParams {
  /** Base token mint address (base58) */
  baseMint: string;

  /** Quote token mint address (base58, default: WSOL) */
  quoteMint?: string;

  /** Amount of base token to seed (human-readable, e.g. 1000000) */
  baseAmount: number;

  /** Amount of quote token to seed (human-readable, e.g. 0.5 SOL) */
  quoteAmount: number;

  /**
   * Initial price in quote/base units (e.g. 0.0000001 SOL per token).
   * If omitted, calculated from quoteAmount / baseAmount.
   */
  initPrice?: number;

  /** Fee schedule configuration */
  poolFees: PoolFeeConfig;

  /** 0 = collect fees in both tokens, 1 = collect fees in quote token only */
  collectFeeMode?: number;

  /** 0 = Slot-based activation, 1 = Timestamp-based activation (default: 1) */
  activationType?: number;

  /** Activation point (slot number or unix timestamp). null = activate immediately */
  activationPoint?: number | null;

  /** Whether to create an alpha vault after pool creation (default: false) */
  hasAlphaVault?: boolean;

  /** Swap options (priority fee, compute limit, etc.) */
  opts?: SwapOpts;
}

/**
 * Parameters for creating a DAMM v2 pool using a pre-existing config.
 *
 * Uses `cpAmm.createPool()` — simpler, less customizable.
 * The config address determines the fee schedule and price range.
 */
export interface CreateConfigPoolParams {
  /** Base token mint address (base58) */
  baseMint: string;

  /** Quote token mint address (base58, default: WSOL) */
  quoteMint?: string;

  /** Amount of base token to seed (human-readable) */
  baseAmount: number;

  /** Amount of quote token to seed (human-readable) */
  quoteAmount: number;

  /**
   * Initial price in quote/base units.
   * If omitted, calculated from quoteAmount / baseAmount.
   */
  initPrice?: number;

  /** On-chain config address (base58). Known configs:
   *  - 2yAJha5NVgq5mEitTUvdWSUKrcYvxAAc2H6rPDbEQqSu
   *  - EcfqEkLSeGzDtZrTJWcbDxptfR2nWfX6cjJLFkgttwY6
   */
  configAddress: string;

  /** Activation point (slot number or unix timestamp). null = activate immediately */
  activationPoint?: number | null;

  /** Whether to lock the initial liquidity permanently (default: false) */
  lockLiquidity?: boolean;

  /** Swap options (priority fee, compute limit, etc.) */
  opts?: SwapOpts;
}

// ---------------------------------------------------------------------------
// LP strategy (for DLMM-style concentrated liquidity)
// ---------------------------------------------------------------------------

/**
 * Liquidity distribution strategy for concentrated liquidity pools.
 *
 * - spot:    Uniform distribution across bins (most common)
 * - curve:   Bell-curve distribution, concentrated near active bin
 * - bid-ask: Skewed distribution — heavier on one side (DCA-in or DCA-out)
 */
export type LpStrategy = "spot" | "curve" | "bid-ask";

// ---------------------------------------------------------------------------
// Liquidity parameters
// ---------------------------------------------------------------------------

export interface AddLiquidityParams {
  /** Pool address to add liquidity to */
  poolAddress: string;

  /**
   * Amount of SOL to deposit, human-readable units.
   * For one-sided SOL positions, only this is needed.
   */
  amountSol?: number;

  /**
   * Amount of the non-SOL token to deposit, human-readable units.
   * For one-sided token positions, only this is needed.
   */
  amountToken?: number;

  /**
   * Token mint address (required for single-sided token deposits).
   * For SOL-only deposits this can be omitted — the adapter reads it from pool state.
   */
  tokenMint?: string;

  /**
   * Liquidity distribution strategy (default: "spot").
   * Only applicable to concentrated liquidity pools (DLMM).
   */
  strategy?: LpStrategy;

  /**
   * Number of bins to spread liquidity across (default: 50, max: 70).
   * Only applicable to concentrated liquidity pools (DLMM).
   */
  bins?: number;

  // Legacy fields — kept for backward compatibility with non-DLMM adapters
  /** @deprecated Use amountSol instead */
  amountA?: number;
  /** @deprecated Use amountToken instead */
  amountB?: number;

  /** Swap options (slippage, priority fee, etc.) */
  opts?: SwapOpts;
}

export interface RemoveLiquidityParams {
  /** Pool address to remove liquidity from */
  poolAddress: string;

  /** Percentage of LP position to remove (0-100) */
  percentage: number;

  /**
   * Specific position address to remove from (base58).
   * If omitted, the adapter removes from the first position found.
   */
  positionAddress?: string;

  /** Swap options */
  opts?: SwapOpts;
}

// ---------------------------------------------------------------------------
// LP Position info (for listPositions)
// ---------------------------------------------------------------------------

export interface LpPositionInfo {
  /** Position account address (base58) */
  positionAddress: string;

  /** Pool address this position belongs to (base58) */
  poolAddress: string;

  /** DEX adapter name */
  dex: string;

  /** Lower bin ID of the position range */
  lowerBinId: number;

  /** Upper bin ID of the position range */
  upperBinId: number;

  /** Amount of token X in the position (human-readable) */
  amountX: number;

  /** Amount of token Y in the position (human-readable) */
  amountY: number;

  /** Token X mint (base58) */
  tokenXMint: string;

  /** Token Y mint (base58) */
  tokenYMint: string;

  /** Unclaimed fee for token X (human-readable) */
  feeX: number;

  /** Unclaimed fee for token Y (human-readable) */
  feeY: number;

  /** Whether the active bin is within this position's range */
  inRange: boolean;
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

  /** Can claim LP swap fees from positions */
  canClaimFees: boolean;

  /** Can list user's LP positions */
  canListPositions: boolean;

  /** Can create new pools (e.g. DAMM v2 createCustomPool / createPool) */
  canCreatePool: boolean;

  /**
   * Whether this adapter is a swap aggregator (e.g. Jupiter, DFlow).
   *
   * Aggregators route trades across multiple DEXes — the user only needs to
   * specify the token mint, not a pool address. The aggregator finds the best
   * route automatically.
   *
   * On-chain adapters (isAggregator=false) require a pool address. The adapter
   * reads the pool's base/quote mints and determines the swap direction. The
   * user does NOT need to specify a token mint — it's derived from pool state.
   */
  isAggregator: boolean;
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
    canClaimFees: false,
    canListPositions: false,
    canCreatePool: false,
    isAggregator: false,
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

  /**
   * Claim accumulated swap fees from LP positions.
   *
   * @param poolAddress - Pool to claim fees from (base58)
   * @param positionAddress - Specific position to claim from (base58). If omitted, claims from first position.
   * @throws UnsupportedOperationError if capabilities.canClaimFees is false
   */
  claimFees?(poolAddress: string, positionAddress?: string): Promise<TxResult>;

  /**
   * List user's LP positions in a pool.
   *
   * @param poolAddress - Pool to list positions for (base58)
   * @throws UnsupportedOperationError if capabilities.canListPositions is false
   */
  listPositions?(poolAddress: string): Promise<LpPositionInfo[]>;

  /**
   * Create a new pool with full fee configuration (custom pool).
   *
   * Only supported by DAMM v2 adapters. Uses the SDK's createCustomPool()
   * method which allows setting fee schedule, price range, activation params.
   *
   * @throws UnsupportedOperationError if capabilities.canCreatePool is false
   */
  createCustomPool?(params: CreateCustomPoolParams): Promise<TxResult>;

  /**
   * Create a new pool using a pre-existing config address.
   *
   * Uses the SDK's createPool() method which inherits fee schedule and price
   * range from the config. Simpler but less customizable.
   *
   * @throws UnsupportedOperationError if capabilities.canCreatePool is false
   */
  createConfigPool?(params: CreateConfigPoolParams): Promise<TxResult>;
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
export const DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS = 100_000;

/** Default compute unit limit */
export const DEFAULT_COMPUTE_UNIT_LIMIT = 400_000;
