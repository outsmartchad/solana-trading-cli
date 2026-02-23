/**
 * PercolatorAdapter — Standalone adapter for Percolator perpetual futures protocol.
 *
 * Does NOT implement IDexAdapter — perps are fundamentally different from spot DEX operations.
 * Uses admin-oracle mode (agent wallet pushes prices) for full control.
 *
 * Lifecycle:
 *   1. createMarket()       — 10-step market creation (slab → init → oracle → crank → vAMM → LP)
 *   2. initUser()           — register a trader account
 *   3. deposit()            — deposit collateral
 *   4. trade()              — open/close/modify positions via TradeCpi
 *   5. withdraw()           — withdraw collateral
 *   6. closeAccount()       — close account and recover rent
 *   7. crank()              — permissionless keeper crank
 *   8. pushOraclePrice()    — update oracle price (admin only)
 *   9. liquidate()          — permissionless liquidation
 *  10. getMarketState()     — read full slab state
 *  11. getMyPosition()      — find user's account by owner pubkey
 *  12. discoverMarkets()    — find all markets on-chain
 *  13. createInsuranceMint() / depositInsuranceLP() / withdrawInsuranceLP()
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import { getWallet, getConnection, dev_connection } from "../../helpers/config";
/** Pick the right RPC connection based on network */
function getNetworkConnection(network?: "devnet" | "mainnet"): Connection {
  const net = network ?? (process.env.NETWORK as string) ?? "devnet";
  if (net === "devnet") {
    if (!dev_connection) {
      throw new Error("DEVNET_ENDPOINT not set. Add it to ~/.outsmart/config.env");
    }
    return dev_connection;
  }
  return getConnection(); // mainnet
}
import { sendAndConfirmVtx } from "../../transactions/send-rpc";
import type { SendRpcOptions } from "../../transactions/send-rpc";

/** Helper: send ixs and return tx signature string */
async function sendIxs(
  connection: Connection,
  ixs: TransactionInstruction[],
  wallet: Keypair,
  extraSigners?: Keypair[],
): Promise<string> {
  const opts: SendRpcOptions | undefined = extraSigners?.length
    ? { extraSigners }
    : undefined;
  const result = await sendAndConfirmVtx(connection, ixs, wallet, opts);
  if (result.error) throw new Error(`TX failed: ${result.error}`);
  return result.txSignature;
}

// Vendored SDK
import {
  encodeInitMarket,
  encodeInitUser,
  encodeInitLP,
  encodeDepositCollateral,
  encodeWithdrawCollateral,
  encodeTradeCpi,
  encodeKeeperCrank,
  encodeLiquidateAtOracle,
  encodeCloseAccount,
  encodeSetOracleAuthority,
  encodePushOraclePrice,
  encodeInitVamm,
  encodeCreateInsuranceMint,
  encodeDepositInsuranceLP,
  encodeWithdrawInsuranceLP,
  encodeCloseSlab,
  encodeAdminForceClose,
  encodeResolveMarket,
  encodeWithdrawInsurance,
  encodeSetPythOracle,
  parseFeedIdHex,
  type InitMarketArgs,
  type InitVammArgs,
} from "./core/abi/instructions";
import {
  buildAccountMetas,
  ACCOUNTS_INIT_MARKET,
  ACCOUNTS_INIT_USER,
  ACCOUNTS_INIT_LP,
  ACCOUNTS_DEPOSIT_COLLATERAL,
  ACCOUNTS_WITHDRAW_COLLATERAL,
  ACCOUNTS_TRADE_CPI,
  ACCOUNTS_KEEPER_CRANK,
  ACCOUNTS_LIQUIDATE_AT_ORACLE,
  ACCOUNTS_CLOSE_ACCOUNT,
  ACCOUNTS_SET_ORACLE_AUTHORITY,
  ACCOUNTS_PUSH_ORACLE_PRICE,
  ACCOUNTS_INIT_VAMM,
  ACCOUNTS_CREATE_INSURANCE_MINT,
  ACCOUNTS_DEPOSIT_INSURANCE_LP,
  ACCOUNTS_WITHDRAW_INSURANCE_LP,
  ACCOUNTS_CLOSE_SLAB,
  ACCOUNTS_ADMIN_FORCE_CLOSE,
  ACCOUNTS_RESOLVE_MARKET,
  ACCOUNTS_WITHDRAW_INSURANCE,
  WELL_KNOWN,
} from "./core/abi/accounts";
import { buildIx } from "./core/runtime/tx";
import {
  fetchSlab,
  parseHeader,
  parseConfig,
  parseEngine,
  parseParams,
  parseAllAccounts,
  parseUsedIndices,
  parseAccount,
  isAccountUsed,
  type SlabHeader,
  type MarketConfig,
  type EngineState,
  type RiskParams,
  type Account,
  AccountKind,
} from "./core/solana/slab";
import { deriveVaultAuthority, deriveInsuranceLpMint, deriveLpPda, derivePythPushOraclePDA, PYTH_PUSH_ORACLE_PROGRAM_ID } from "./core/solana/pda";
import { discoverMarkets as discoverMarketsCore, SLAB_TIERS, slabDataSize, type DiscoveredMarket, type SlabTierKey } from "./core/solana/discovery";
import { getProgramId, getMatcherProgramId, getCurrentNetwork, type Network, type SlabTier } from "./core/config/program-ids";

// Re-export types for consumer convenience
export type {
  SlabHeader, MarketConfig, EngineState, RiskParams, Account, DiscoveredMarket,
  InitMarketArgs, InitVammArgs, SlabTierKey, SlabTier, Network,
};
export { AccountKind, SLAB_TIERS, slabDataSize };
export { derivePythPushOraclePDA, PYTH_PUSH_ORACLE_PROGRAM_ID } from "./core/solana/pda";
export { parseFeedIdHex } from "./core/abi/instructions";

// Re-export math for consumers
export {
  computeMarkPnl,
  computeLiqPrice,
  computePreTradeLiqPrice,
  computeTradingFee,
  computePnlPercent,
  computeEstimatedEntryPrice,
  computeFundingRateAnnualized,
  computeRequiredMargin,
  computeMaxLeverage,
} from "./core/math/trading";

// Re-export vAMM quote
export { computeVammQuote, type VammMatcherParams } from "./core/abi/instructions";

// =============================================================================
// Types
// =============================================================================

export interface CreateMarketParams {
  /** Collateral token mint (e.g. BONK, SOL wrapped) */
  collateralMint: string;
  /** Initial oracle price in e6 format (1 USD = 1_000_000) */
  initialPriceE6: bigint;
  /** Slab tier: small (256 slots), medium (1024), large (4096). Default: small */
  tier?: SlabTierKey;
  /** Network override. Default: from env or devnet */
  network?: Network;
  /** Risk params overrides (sensible defaults provided) */
  riskParams?: Partial<MarketRiskParams>;
  /** vAMM params overrides (sensible defaults provided) */
  vammParams?: Partial<VammParams>;
  /** Initial LP collateral amount in native token units */
  lpCollateral: bigint;
  /**
   * Pyth feed ID hex string (64 hex chars, no 0x prefix).
   * If provided, creates a Pyth-pinned market — price reads come from Pyth on-chain.
   * If omitted, creates an admin-oracle (Hyperp) market — you push prices manually.
   *
   * Common feeds:
   *   SOL/USD: ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d
   *   BTC/USD: e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43
   *   ETH/USD: ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
   */
  pythFeedId?: string;
  /** Max Pyth price staleness in seconds (default: 60). Only used with pythFeedId. */
  pythMaxStalenessSecs?: bigint;
  /** Max Pyth confidence/price ratio in bps (default: 0 = no check). Only used with pythFeedId. */
  pythConfFilterBps?: number;
}

export interface MarketRiskParams {
  warmupPeriodSlots: bigint;
  maintenanceMarginBps: bigint;
  initialMarginBps: bigint;
  tradingFeeBps: bigint;
  newAccountFee: bigint;
  riskReductionThreshold: bigint;
  maintenanceFeePerSlot: bigint;
  maxCrankStalenessSlots: bigint;
  liquidationFeeBps: bigint;
  liquidationFeeCap: bigint;
  liquidationBufferBps: bigint;
  minLiquidationAbs: bigint;
}

export interface VammParams {
  mode: number;
  tradingFeeBps: number;
  baseSpreadBps: number;
  maxTotalBps: number;
  impactKBps: number;
  liquidityNotionalE6: bigint;
  maxFillAbs: bigint;
  maxInventoryAbs: bigint;
}

export interface CreateMarketResult {
  slabAddress: string;
  vaultAddress: string;
  matcherCtxAddress: string;
  lpIndex: number;
  signatures: string[];
}

export interface MarketState {
  slabAddress: string;
  header: SlabHeader;
  config: MarketConfig;
  engine: EngineState;
  params: RiskParams;
  accounts: { idx: number; account: Account }[];
}

export interface TradeParams {
  slabAddress: string;
  userIdx: number;
  lpIdx: number;
  /** Positive = long, negative = short. In i128 native token units. */
  size: bigint;
  network?: Network;
}

// =============================================================================
// Default risk params — conservative defaults for devnet testing
// =============================================================================

const DEFAULT_RISK_PARAMS: MarketRiskParams = {
  warmupPeriodSlots: 0n,
  maintenanceMarginBps: 500n,       // 5%
  initialMarginBps: 1000n,          // 10% (10x max leverage)
  tradingFeeBps: 30n,               // 0.3% (matches reference e2e test)
  newAccountFee: 0n,                // No fee for convenience (initUser sends feePayment: 0)
  riskReductionThreshold: 0n,
  maintenanceFeePerSlot: 0n,
  maxCrankStalenessSlots: 100n,     // matches reference e2e test
  liquidationFeeBps: 100n,          // 1%
  liquidationFeeCap: 0n,
  liquidationBufferBps: 50n,        // 0.5%
  minLiquidationAbs: 0n,
};

const DEFAULT_VAMM_PARAMS: VammParams = {
  mode: 0,                              // passive (0) — simpler pricing, no impact curve
  tradingFeeBps: 50,                    // 0.5% (matches production defaults)
  baseSpreadBps: 50,                    // 0.5% (matches production defaults)
  maxTotalBps: 200,                     // 2% max (matches production defaults)
  impactKBps: 0,                        // no impact (passive mode)
  liquidityNotionalE6: 10_000_000_000_000n, // $10M notional (matches production)
  maxFillAbs: 100_000_000_000_000_000n, // effectively unlimited (10^17, matches production)
  maxInventoryAbs: 0n,                  // 0 = unlimited inventory
};

// =============================================================================
// PercolatorAdapter
// =============================================================================

// =============================================================================
// Helper: resolve oracle account from slab state
// =============================================================================

const ALL_ZEROS_FEED = "0".repeat(64);

/** Determine the oracle account for crank/trade instructions.
 *  - Admin-oracle (Hyperp): indexFeedId is all zeros → oracle = slab itself
 *  - Pyth-pinned: indexFeedId is real feed → oracle = derivePythPushOraclePDA(feedId)
 *  Pass pre-fetched slabData to avoid an extra RPC call.
 */
function resolveOracleFromConfig(slab: PublicKey, config: MarketConfig): PublicKey {
  const feedHex = Buffer.from(config.indexFeedId.toBytes()).toString("hex");
  if (feedHex === ALL_ZEROS_FEED) {
    return slab; // admin-oracle: oracle = slab
  }
  return derivePythPushOraclePDA(feedHex)[0]; // Pyth PDA
}

async function resolveOracleAccount(
  connection: Connection,
  slab: PublicKey,
): Promise<PublicKey> {
  const slabData = await fetchSlab(connection, slab);
  const config = parseConfig(slabData);
  return resolveOracleFromConfig(slab, config);
}

export class PercolatorAdapter {
  // -------------------------------------------------------------------------
  // createMarket — full 10-step market lifecycle
  // -------------------------------------------------------------------------
  async createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
    const wallet = getWallet();
    const tier = params.tier ?? "small";
    const network = params.network ?? getCurrentNetwork();
    const connection = getNetworkConnection(network);
    const programId = getProgramId(network, tier);
    const matcherProgramId = getMatcherProgramId(network);
    const risk = { ...DEFAULT_RISK_PARAMS, ...params.riskParams };
    const vamm = { ...DEFAULT_VAMM_PARAMS, ...params.vammParams };
    const collateralMint = new PublicKey(params.collateralMint);
    const tierInfo = SLAB_TIERS[tier];
    const slabSize = tierInfo.dataSize;
    const isPyth = !!params.pythFeedId;
    const feedIdHex = params.pythFeedId ?? "0".repeat(64);

    const signatures: string[] = [];

    // Step 1: Create slab account
    const slabKeypair = Keypair.generate();
    const slabRent = await connection.getMinimumBalanceForRentExemption(slabSize);

    const createSlabIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: slabKeypair.publicKey,
      lamports: slabRent,
      space: slabSize,
      programId: programId,
    });

    // Step 2: Create vault ATA (owned by vault PDA)
    const [vaultAuthority] = deriveVaultAuthority(programId, slabKeypair.publicKey);
    const vaultAta = getAssociatedTokenAddressSync(collateralMint, vaultAuthority, true);
    const createVaultAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      vaultAta,
      vaultAuthority,
      collateralMint,
    );

    // Step 3: InitMarket
    // Pyth-pinned: pass real feed ID at init time. Admin-oracle: all zeros.
    const initMarketArgs: InitMarketArgs = {
      admin: wallet.publicKey,
      collateralMint: collateralMint,
      indexFeedId: feedIdHex,
      maxStalenessSecs: isPyth ? (params.pythMaxStalenessSecs ?? 60n) : 0n,
      confFilterBps: isPyth ? (params.pythConfFilterBps ?? 0) : 0,
      invert: 0,
      unitScale: 0,
      initialMarkPriceE6: params.initialPriceE6,
      warmupPeriodSlots: risk.warmupPeriodSlots,
      maintenanceMarginBps: risk.maintenanceMarginBps,
      initialMarginBps: risk.initialMarginBps,
      tradingFeeBps: risk.tradingFeeBps,
      maxAccounts: BigInt(tierInfo.maxAccounts),
      newAccountFee: risk.newAccountFee,
      riskReductionThreshold: risk.riskReductionThreshold,
      maintenanceFeePerSlot: risk.maintenanceFeePerSlot,
      maxCrankStalenessSlots: risk.maxCrankStalenessSlots,
      liquidationFeeBps: risk.liquidationFeeBps,
      liquidationFeeCap: risk.liquidationFeeCap,
      liquidationBufferBps: risk.liquidationBufferBps,
      minLiquidationAbs: risk.minLiquidationAbs,
    };

    // Need a dummy ATA for initMarket account layout (dummyAta slot)
    const dummyAta = getAssociatedTokenAddressSync(collateralMint, wallet.publicKey, false);

    const initMarketIx = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_INIT_MARKET, [
        wallet.publicKey,           // admin
        slabKeypair.publicKey,      // slab
        collateralMint,             // mint
        vaultAta,                   // vault
        TOKEN_PROGRAM_ID,           // tokenProgram
        SYSVAR_CLOCK_PUBKEY,        // clock
        SYSVAR_RENT_PUBKEY,         // rent
        dummyAta,                   // dummyAta
        SystemProgram.programId,    // systemProgram
      ]),
      data: encodeInitMarket(initMarketArgs),
    });

    // TX 1: createSlab + createVaultAta + initMarket
    const sig1 = await sendIxs(connection, [createSlabIx, createVaultAtaIx, initMarketIx], wallet, [slabKeypair]);
    signatures.push(sig1);

    // Oracle account for crank/trade instructions
    const oracleAccount = isPyth
      ? derivePythPushOraclePDA(feedIdHex)[0]
      : slabKeypair.publicKey; // admin-oracle: oracle = slab itself

    if (isPyth) {
      // Pyth-pinned: feedId already set at InitMarket. Just crank to initialize engine.
      // No SetOracleAuthority or PushOraclePrice needed — Pyth on-chain provides prices.
      const crankIx = buildIx({
        programId,
        keys: buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
          wallet.publicKey, slabKeypair.publicKey, SYSVAR_CLOCK_PUBKEY, oracleAccount,
        ]),
        data: encodeKeeperCrank({ callerIdx: 65535, allowPanic: false }),
      });

      // TX 2: crank only
      const sig2 = await sendIxs(connection, [crankIx], wallet);
      signatures.push(sig2);
    } else {
      // Admin-oracle (Hyperp): SetOracleAuthority → PushOraclePrice → Crank
      const setOracleIx = buildIx({
        programId,
        keys: buildAccountMetas(ACCOUNTS_SET_ORACLE_AUTHORITY, [
          wallet.publicKey,
          slabKeypair.publicKey,
        ]),
        data: encodeSetOracleAuthority({ newAuthority: wallet.publicKey }),
      });

      const pushPriceIx = buildIx({
        programId,
        keys: buildAccountMetas(ACCOUNTS_PUSH_ORACLE_PRICE, [
          wallet.publicKey,
          slabKeypair.publicKey,
        ]),
        data: encodePushOraclePrice({
          priceE6: params.initialPriceE6,
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
        }),
      });

      const crankIx = buildIx({
        programId,
        keys: buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
          wallet.publicKey, slabKeypair.publicKey, SYSVAR_CLOCK_PUBKEY, oracleAccount,
        ]),
        data: encodeKeeperCrank({ callerIdx: 65535, allowPanic: false }),
      });

      // TX 2: setOracle + pushPrice + crank
      const sig2 = await sendIxs(connection, [setOracleIx, pushPriceIx, crankIx], wallet);
      signatures.push(sig2);
    }

    // Step 7: Create matcher context account (320 bytes)
    const matcherCtxKeypair = Keypair.generate();
    const matcherCtxSize = 320;
    const matcherCtxRent = await connection.getMinimumBalanceForRentExemption(matcherCtxSize);

    const createMatcherCtxIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: matcherCtxKeypair.publicKey,
      lamports: matcherCtxRent,
      space: matcherCtxSize,
      programId: matcherProgramId,
    });

    // Step 7b: Init matcher context (send initVamm data directly to matcher program)
    const [lpPdaForInit] = deriveLpPda(programId, slabKeypair.publicKey, 0); // LP will be idx 0
    const initMatcherCtxIx = new TransactionInstruction({
      programId: matcherProgramId,
      keys: [
        { pubkey: lpPdaForInit, isSigner: false, isWritable: false },
        { pubkey: matcherCtxKeypair.publicKey, isSigner: false, isWritable: true },
      ],
      data: Buffer.from(encodeInitVamm({
        mode: vamm.mode,
        tradingFeeBps: vamm.tradingFeeBps,
        baseSpreadBps: vamm.baseSpreadBps,
        maxTotalBps: vamm.maxTotalBps,
        impactKBps: vamm.impactKBps,
        liquidityNotionalE6: vamm.liquidityNotionalE6,
        maxFillAbs: vamm.maxFillAbs,
        maxInventoryAbs: vamm.maxInventoryAbs,
      })),
    });

    // Step 8: InitLP (register LP account in slab, linked to matcher)
    const userAta = getAssociatedTokenAddressSync(collateralMint, wallet.publicKey, false);
    const createUserAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      userAta,
      wallet.publicKey,
      collateralMint,
    );

    const initLPIx = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_INIT_LP, [
        wallet.publicKey,           // user (LP owner)
        slabKeypair.publicKey,      // slab
        userAta,                    // userAta
        vaultAta,                   // vault
        TOKEN_PROGRAM_ID,           // tokenProgram
      ]),
      data: encodeInitLP({
        matcherProgram: matcherProgramId,
        matcherContext: matcherCtxKeypair.publicKey,
        feePayment: 0n,
      }),
    });

    // TX 3: createMatcherCtx + initMatcherCtx + createUserAta + initLP
    const sig3 = await sendIxs(connection, [createMatcherCtxIx, initMatcherCtxIx, createUserAtaIx, initLPIx], wallet, [matcherCtxKeypair]);
    signatures.push(sig3);

    // Read slab to find LP's assigned index
    const slabData = await fetchSlab(connection, slabKeypair.publicKey);
    const usedIndices = parseUsedIndices(slabData);
    // The LP is the first account registered
    const lpIdx = usedIndices[0] ?? 0;

    // Step 9: Deposit LP collateral
    const depositLPIx = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_DEPOSIT_COLLATERAL, [
        wallet.publicKey,
        slabKeypair.publicKey,
        userAta,
        vaultAta,
        TOKEN_PROGRAM_ID,
        SYSVAR_CLOCK_PUBKEY,
      ]),
      data: encodeDepositCollateral({ userIdx: lpIdx, amount: params.lpCollateral }),
    });

    // TX 4: depositLPCollateral
    const sig4 = await sendIxs(connection, [depositLPIx], wallet);
    signatures.push(sig4);

    return {
      slabAddress: slabKeypair.publicKey.toBase58(),
      vaultAddress: vaultAta.toBase58(),
      matcherCtxAddress: matcherCtxKeypair.publicKey.toBase58(),
      lpIndex: lpIdx,
      signatures,
    };
  }

  // -------------------------------------------------------------------------
  // initUser — register a trader account, returns assigned index
  // -------------------------------------------------------------------------
  async initUser(
    slabAddress: string,
    network?: Network,
    tier?: SlabTier,
  ): Promise<{ userIdx: number; signature: string }> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    // Read slab to get collateral mint and pre-state
    const slabDataBefore = await fetchSlab(connection, slab);
    const config = parseConfig(slabDataBefore);
    const usedBefore = new Set(parseUsedIndices(slabDataBefore));

    const userAta = getAssociatedTokenAddressSync(config.collateralMint, wallet.publicKey, false);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, userAta, wallet.publicKey, config.collateralMint,
    );

    const initUserIx = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_INIT_USER, [
        wallet.publicKey,
        slab,
        userAta,
        config.vaultPubkey,
        TOKEN_PROGRAM_ID,
      ]),
      data: encodeInitUser({ feePayment: 0n }),
    });

    const sig = await sendIxs(connection, [createAtaIx, initUserIx], wallet);

    // Read slab after to find newly assigned index
    const slabDataAfter = await fetchSlab(connection, slab);
    const usedAfter = parseUsedIndices(slabDataAfter);
    const newIdx = usedAfter.find(idx => !usedBefore.has(idx));
    if (newIdx === undefined) {
      throw new Error("Failed to find newly assigned user account index");
    }

    return { userIdx: newIdx, signature: sig };
  }

  // -------------------------------------------------------------------------
  // deposit — deposit collateral
  // -------------------------------------------------------------------------
  async deposit(
    slabAddress: string,
    userIdx: number,
    amount: bigint,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const slabData = await fetchSlab(connection, slab);
    const config = parseConfig(slabData);
    const userAta = getAssociatedTokenAddressSync(config.collateralMint, wallet.publicKey, false);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_DEPOSIT_COLLATERAL, [
        wallet.publicKey, slab, userAta, config.vaultPubkey, TOKEN_PROGRAM_ID, SYSVAR_CLOCK_PUBKEY,
      ]),
      data: encodeDepositCollateral({ userIdx, amount }),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // withdraw — withdraw collateral
  // -------------------------------------------------------------------------
  async withdraw(
    slabAddress: string,
    userIdx: number,
    amount: bigint,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const slabData = await fetchSlab(connection, slab);
    const config = parseConfig(slabData);
    const [vaultAuthority] = deriveVaultAuthority(programId, slab);
    const userAta = getAssociatedTokenAddressSync(config.collateralMint, wallet.publicKey, false);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_WITHDRAW_COLLATERAL, [
        wallet.publicKey, slab, config.vaultPubkey, userAta,
        vaultAuthority, TOKEN_PROGRAM_ID, SYSVAR_CLOCK_PUBKEY,
        slab, // oracle = slab for admin-oracle
      ]),
      data: encodeWithdrawCollateral({ userIdx, amount }),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // trade — TradeCpi (production path)
  // -------------------------------------------------------------------------
  async trade(params: TradeParams): Promise<string> {
    const wallet = getWallet();
    const network = params.network ?? getCurrentNetwork();
    const connection = getNetworkConnection(network);
    const slab = new PublicKey(params.slabAddress);
    const programId = getProgramId(network, "small"); // TODO: detect tier from slab

    // Read slab to get LP owner, matcher context, and oracle mode (single RPC call)
    const slabData = await fetchSlab(connection, slab);
    const lpAccount = parseAccount(slabData, params.lpIdx);
    const config = parseConfig(slabData);
    const oracle = resolveOracleFromConfig(slab, config);

    const [lpPda] = deriveLpPda(programId, slab, params.lpIdx);

    // Prepend permissionless crank (required before TradeCpi to update engine timestamps)
    const crankIx = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
        wallet.publicKey, slab, SYSVAR_CLOCK_PUBKEY, oracle,
      ]),
      data: encodeKeeperCrank({ callerIdx: 65535, allowPanic: false }),
    });

    const tradeIx = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_TRADE_CPI, [
        wallet.publicKey,                // user
        lpAccount.owner,                 // lpOwner
        slab,                            // slab
        SYSVAR_CLOCK_PUBKEY,             // clock
        oracle,                          // oracle (slab for admin, Pyth PDA for Pyth-pinned)
        lpAccount.matcherProgram,        // matcherProg (from slab account data)
        lpAccount.matcherContext,        // matcherCtx
        lpPda,                           // lpPda
      ]),
      data: encodeTradeCpi({
        lpIdx: params.lpIdx,
        userIdx: params.userIdx,
        size: params.size,
      }),
    });

    return sendIxs(connection, [crankIx, tradeIx], wallet);
  }

  // -------------------------------------------------------------------------
  // closeAccount — close after flat (recovers rent from slab account fee)
  // -------------------------------------------------------------------------
  async closeAccount(
    slabAddress: string,
    userIdx: number,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const slabData = await fetchSlab(connection, slab);
    const config = parseConfig(slabData);
    const [vaultAuthority] = deriveVaultAuthority(programId, slab);
    const userAta = getAssociatedTokenAddressSync(config.collateralMint, wallet.publicKey, false);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_CLOSE_ACCOUNT, [
        wallet.publicKey, slab, config.vaultPubkey, userAta,
        vaultAuthority, TOKEN_PROGRAM_ID, SYSVAR_CLOCK_PUBKEY,
        slab, // oracle = slab
      ]),
      data: encodeCloseAccount({ userIdx }),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // crank — permissionless keeper crank
  // -------------------------------------------------------------------------
  async crank(
    slabAddress: string,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");
    const oracle = await resolveOracleAccount(connection, slab);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
        wallet.publicKey, slab, SYSVAR_CLOCK_PUBKEY, oracle,
      ]),
      data: encodeKeeperCrank({ callerIdx: 65535, allowPanic: false }),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // pushOraclePrice — admin oracle price push
  // -------------------------------------------------------------------------
  async pushOraclePrice(
    slabAddress: string,
    priceE6: bigint,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_PUSH_ORACLE_PRICE, [
        wallet.publicKey, slab,
      ]),
      data: encodePushOraclePrice({
        priceE6,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      }),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // liquidate — permissionless liquidation
  // -------------------------------------------------------------------------
  async liquidate(
    slabAddress: string,
    targetIdx: number,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const oracle = await resolveOracleAccount(connection, slab);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_LIQUIDATE_AT_ORACLE, [
        wallet.publicKey, // unused but must be present
        slab, SYSVAR_CLOCK_PUBKEY, oracle,
      ]),
      data: encodeLiquidateAtOracle({ targetIdx }),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // createInsuranceMint — one-time insurance LP mint creation
  // -------------------------------------------------------------------------
  async createInsuranceMint(
    slabAddress: string,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const slabData = await fetchSlab(connection, slab);
    const config = parseConfig(slabData);
    const [vaultAuthority] = deriveVaultAuthority(programId, slab);
    const [insLpMint] = deriveInsuranceLpMint(programId, slab);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_CREATE_INSURANCE_MINT, [
        wallet.publicKey,       // admin
        slab,                   // slab
        insLpMint,              // insLpMint (PDA)
        vaultAuthority,         // vaultAuthority
        config.collateralMint,  // collateralMint
        SystemProgram.programId,// systemProgram
        TOKEN_PROGRAM_ID,       // tokenProgram
        SYSVAR_RENT_PUBKEY,     // rent
        wallet.publicKey,       // payer
      ]),
      data: encodeCreateInsuranceMint(),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // depositInsuranceLP — deposit collateral into insurance fund
  // -------------------------------------------------------------------------
  async depositInsuranceLP(
    slabAddress: string,
    amount: bigint,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const slabData = await fetchSlab(connection, slab);
    const config = parseConfig(slabData);
    const [vaultAuthority] = deriveVaultAuthority(programId, slab);
    const [insLpMint] = deriveInsuranceLpMint(programId, slab);
    const depositorAta = getAssociatedTokenAddressSync(config.collateralMint, wallet.publicKey, false);
    const depositorLpAta = getAssociatedTokenAddressSync(insLpMint, wallet.publicKey, false);

    const createLpAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, depositorLpAta, wallet.publicKey, insLpMint,
    );

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_DEPOSIT_INSURANCE_LP, [
        wallet.publicKey, slab, depositorAta, config.vaultPubkey,
        TOKEN_PROGRAM_ID, insLpMint, depositorLpAta, vaultAuthority,
      ]),
      data: encodeDepositInsuranceLP({ amount }),
    });

    return sendIxs(connection, [createLpAtaIx, ix], wallet);
  }

  // -------------------------------------------------------------------------
  // withdrawInsuranceLP — burn LP tokens, withdraw proportional share
  // -------------------------------------------------------------------------
  async withdrawInsuranceLP(
    slabAddress: string,
    lpAmount: bigint,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const slabData = await fetchSlab(connection, slab);
    const config = parseConfig(slabData);
    const [vaultAuthority] = deriveVaultAuthority(programId, slab);
    const [insLpMint] = deriveInsuranceLpMint(programId, slab);
    const withdrawerAta = getAssociatedTokenAddressSync(config.collateralMint, wallet.publicKey, false);
    const withdrawerLpAta = getAssociatedTokenAddressSync(insLpMint, wallet.publicKey, false);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_WITHDRAW_INSURANCE_LP, [
        wallet.publicKey, slab, withdrawerAta, config.vaultPubkey,
        TOKEN_PROGRAM_ID, insLpMint, withdrawerLpAta, vaultAuthority,
      ]),
      data: encodeWithdrawInsuranceLP({ lpAmount }),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // getMarketState — full slab readout
  // -------------------------------------------------------------------------
  async getMarketState(slabAddress: string, network?: Network): Promise<MarketState> {
    const connection = getNetworkConnection(network);
    const slab = new PublicKey(slabAddress);
    const data = await fetchSlab(connection, slab);

    return {
      slabAddress,
      header: parseHeader(data),
      config: parseConfig(data),
      engine: parseEngine(data),
      params: parseParams(data),
      accounts: parseAllAccounts(data),
    };
  }

  // -------------------------------------------------------------------------
  // getMyPosition — find user's account by owner pubkey
  // -------------------------------------------------------------------------
  async getMyPosition(
    slabAddress: string,
    network?: Network,
  ): Promise<{ idx: number; account: Account } | null> {
    const wallet = getWallet();
    const connection = getNetworkConnection(network);
    const slab = new PublicKey(slabAddress);
    const data = await fetchSlab(connection, slab);
    const accounts = parseAllAccounts(data);

    return accounts.find(a =>
      a.account.owner.equals(wallet.publicKey) && a.account.kind === AccountKind.User
    ) ?? null;
  }

  // -------------------------------------------------------------------------
  // discoverMarkets — find all markets across all program tiers
  // -------------------------------------------------------------------------
  async discoverMarkets(network?: Network): Promise<DiscoveredMarket[]> {
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);

    // Query all tier programs in parallel
    const tierKeys: SlabTier[] = ["small", "medium", "large"];
    const allMarkets: DiscoveredMarket[] = [];

    const results = await Promise.allSettled(
      tierKeys.map(async (tier) => {
        try {
          const programId = getProgramId(net, tier);
          return await discoverMarketsCore(connection, programId);
        } catch {
          return []; // Program not deployed for this tier/network
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allMarkets.push(...result.value);
      }
    }

    return allMarkets;
  }

  // -------------------------------------------------------------------------
  // adminForceClose — force-close any position at oracle price (admin only)
  // -------------------------------------------------------------------------
  async adminForceClose(
    slabAddress: string,
    targetIdx: number,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_ADMIN_FORCE_CLOSE, [
        wallet.publicKey, slab, SYSVAR_CLOCK_PUBKEY, slab,
      ]),
      data: encodeAdminForceClose({ targetIdx }),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // closeSlab — close slab account and recover all rent (admin only)
  // Requires: vault=0, insurance=0, numUsedAccounts=0
  // -------------------------------------------------------------------------
  async closeSlab(
    slabAddress: string,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_CLOSE_SLAB, [
        wallet.publicKey, slab,
      ]),
      data: encodeCloseSlab(),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // resolveMarket — set RESOLVED flag (admin only, enables insurance withdrawal)
  // -------------------------------------------------------------------------
  async resolveMarket(
    slabAddress: string,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_RESOLVE_MARKET, [
        wallet.publicKey, slab,
      ]),
      data: encodeResolveMarket(),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // withdrawInsurance — drain insurance fund to admin (requires RESOLVED)
  // -------------------------------------------------------------------------
  async withdrawInsurance(
    slabAddress: string,
    network?: Network,
    tier?: SlabTier,
  ): Promise<string> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");

    const slabData = await fetchSlab(connection, slab);
    const config = parseConfig(slabData);
    const [vaultAuthority] = deriveVaultAuthority(programId, slab);
    const adminAta = getAssociatedTokenAddressSync(config.collateralMint, wallet.publicKey, false);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_WITHDRAW_INSURANCE, [
        wallet.publicKey, slab, adminAta, config.vaultPubkey,
        TOKEN_PROGRAM_ID, vaultAuthority,
      ]),
      data: encodeWithdrawInsurance(),
    });

    return sendIxs(connection, [ix], wallet);
  }

  // -------------------------------------------------------------------------
  // teardownMarket — full cleanup: force-close all accounts, withdraw, close slab
  // Returns total lamports recovered from slab rent
  // -------------------------------------------------------------------------
  async teardownMarket(
    slabAddress: string,
    network?: Network,
    tier?: SlabTier,
  ): Promise<{ closedAccounts: number; slabClosed: boolean; signatures: string[] }> {
    const wallet = getWallet();
    const net = network ?? getCurrentNetwork();
    const connection = getNetworkConnection(net);
    const slab = new PublicKey(slabAddress);
    const programId = getProgramId(net, tier ?? "small");
    const signatures: string[] = [];
    let closedAccounts = 0;

    // Read slab state
    const slabData = await fetchSlab(connection, slab);
    const header = parseHeader(slabData);
    const config = parseConfig(slabData);
    const engine = parseEngine(slabData);

    // Verify we're the admin
    if (!header.admin.equals(wallet.publicKey)) {
      throw new Error(`Not admin. Admin: ${header.admin.toBase58()}, Wallet: ${wallet.publicKey.toBase58()}`);
    }

    const accounts = parseAllAccounts(slabData);
    const [vaultAuthority] = deriveVaultAuthority(programId, slab);
    const userAta = getAssociatedTokenAddressSync(config.collateralMint, wallet.publicKey, false);

    // Step 1: Force-close all accounts with open positions
    for (const { idx, account } of accounts) {
      if (account.positionSize !== 0n) {
        try {
          const sig = await this.adminForceClose(slabAddress, idx, net, tier);
          signatures.push(sig);
        } catch (e: any) {
          console.warn(`Failed to force-close idx ${idx}: ${e.message}`);
        }
      }
    }

    // Re-read slab after force-closes
    const slabData2 = await fetchSlab(connection, slab);
    const accounts2 = parseAllAccounts(slabData2);

    // Step 2: Close all accounts (withdraws remaining collateral)
    for (const { idx } of accounts2) {
      try {
        const sig = await this.closeAccount(slabAddress, idx, net, tier);
        signatures.push(sig);
        closedAccounts++;
      } catch (e: any) {
        // Try withdraw first, then close
        try {
          const acct = parseAccount(slabData2, idx);
          if (acct.capital > 0n) {
            await this.withdraw(slabAddress, idx, acct.capital, net, tier);
          }
          const sig = await this.closeAccount(slabAddress, idx, net, tier);
          signatures.push(sig);
          closedAccounts++;
        } catch (e2: any) {
          console.warn(`Failed to close idx ${idx}: ${e2.message}`);
        }
      }
    }

    // Step 3: Resolve market (enables insurance fund withdrawal)
    try {
      const sig = await this.resolveMarket(slabAddress, net, tier);
      signatures.push(sig);
    } catch (e: any) {
      // May already be resolved or may fail — non-fatal
      console.warn(`Failed to resolve market: ${e.message}`);
    }

    // Step 4: Withdraw insurance fund (drains fee revenue)
    try {
      const sig = await this.withdrawInsurance(slabAddress, net, tier);
      signatures.push(sig);
    } catch (e: any) {
      // Insurance may be zero — non-fatal
      console.warn(`Failed to withdraw insurance: ${e.message}`);
    }

    // Step 5: Close slab (recover rent — requires engine.vault=0, insurance=0, no accounts)
    // NOTE: Markets that had trades retain vault dust because WithdrawInsurance
    // drains the insurance fund balance but doesn't decrement engine.vault.
    // This makes closeSlab impossible for any market with fee revenue.
    // Slab rent (~0.44 SOL) is irrecoverable for these markets.
    let slabClosed = false;
    try {
      const sig = await this.closeSlab(slabAddress, net, tier);
      signatures.push(sig);
      slabClosed = true;
    } catch {
      // Expected for markets with trade history
    }

    return { closedAccounts, slabClosed, signatures };
  }
}
