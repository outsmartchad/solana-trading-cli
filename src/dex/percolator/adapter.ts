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
import { deriveVaultAuthority, deriveInsuranceLpMint, deriveLpPda } from "./core/solana/pda";
import { discoverMarkets as discoverMarketsCore, SLAB_TIERS, slabDataSize, type DiscoveredMarket, type SlabTierKey } from "./core/solana/discovery";
import { getProgramId, getMatcherProgramId, getCurrentNetwork, type Network, type SlabTier } from "./core/config/program-ids";

// Re-export types for consumer convenience
export type {
  SlabHeader, MarketConfig, EngineState, RiskParams, Account, DiscoveredMarket,
  InitMarketArgs, InitVammArgs, SlabTierKey, SlabTier, Network,
};
export { AccountKind, SLAB_TIERS, slabDataSize };

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
  tradingFeeBps: 10n,               // 0.1%
  newAccountFee: 0n,
  riskReductionThreshold: 0n,
  maintenanceFeePerSlot: 0n,
  maxCrankStalenessSlots: 1000n,
  liquidationFeeBps: 100n,          // 1%
  liquidationFeeCap: 0n,
  liquidationBufferBps: 50n,        // 0.5%
  minLiquidationAbs: 0n,
};

const DEFAULT_VAMM_PARAMS: VammParams = {
  mode: 1,                           // vAMM mode
  tradingFeeBps: 5,                  // 0.05%
  baseSpreadBps: 10,                 // 0.10%
  maxTotalBps: 100,                  // 1% max
  impactKBps: 50,
  liquidityNotionalE6: 1_000_000_000_000n,  // $1M notional
  maxFillAbs: 0n,                    // unlimited
  maxInventoryAbs: 0n,               // unlimited
};

// =============================================================================
// PercolatorAdapter
// =============================================================================

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
    const initMarketArgs: InitMarketArgs = {
      admin: wallet.publicKey,
      collateralMint: collateralMint,
      indexFeedId: "0".repeat(64), // All zeros = Hyperp mode (admin oracle)
      maxStalenessSecs: 0n,
      confFilterBps: 0,
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

    // Step 4: SetOracleAuthority (set admin wallet as oracle authority)
    const setOracleIx = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_SET_ORACLE_AUTHORITY, [
        wallet.publicKey,
        slabKeypair.publicKey,
      ]),
      data: encodeSetOracleAuthority({ newAuthority: wallet.publicKey }),
    });

    // Step 5: PushOraclePrice (seed initial price)
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

    // Step 6: KeeperCrank (first crank to initialize engine timestamps)
    // Admin-oracle mode: oracle account = slab itself
    const crankIx = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
        wallet.publicKey,           // caller
        slabKeypair.publicKey,      // slab
        SYSVAR_CLOCK_PUBKEY,        // clock
        slabKeypair.publicKey,      // oracle (=slab for admin-oracle)
      ]),
      data: encodeKeeperCrank({ callerIdx: 65535, allowPanic: false }),
    });

    // TX 2: setOracle + pushPrice + crank
    const sig2 = await sendIxs(connection, [setOracleIx, pushPriceIx, crankIx], wallet);
    signatures.push(sig2);

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

    // TX 3: createMatcherCtx + createUserAta + initLP
    const sig3 = await sendIxs(connection, [createMatcherCtxIx, createUserAtaIx, initLPIx], wallet, [matcherCtxKeypair]);
    signatures.push(sig3);

    // Read slab to find LP's assigned index
    const slabData = await fetchSlab(connection, slabKeypair.publicKey);
    const usedIndices = parseUsedIndices(slabData);
    // The LP is the first account registered
    const lpIdx = usedIndices[0] ?? 0;

    // Step 9: InitVamm (configure vAMM on matcher program)
    const [lpPda] = deriveLpPda(programId, slabKeypair.publicKey, lpIdx);

    const initVammIx = buildIx({
      programId: matcherProgramId,
      keys: buildAccountMetas(ACCOUNTS_INIT_VAMM, [
        wallet.publicKey,           // lpOwner
        matcherCtxKeypair.publicKey, // matcherCtx
        slabKeypair.publicKey,      // slab
        lpPda,                      // lpPda
      ]),
      data: encodeInitVamm({
        mode: vamm.mode,
        tradingFeeBps: vamm.tradingFeeBps,
        baseSpreadBps: vamm.baseSpreadBps,
        maxTotalBps: vamm.maxTotalBps,
        impactKBps: vamm.impactKBps,
        liquidityNotionalE6: vamm.liquidityNotionalE6,
        maxFillAbs: vamm.maxFillAbs,
        maxInventoryAbs: vamm.maxInventoryAbs,
      }),
    });

    // Step 10: Deposit LP collateral
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

    // TX 4: initVamm + depositLPCollateral
    const sig4 = await sendIxs(connection, [initVammIx, depositLPIx], wallet);
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
    const matcherProgramId = getMatcherProgramId(network);

    // Read slab to get LP owner and matcher context
    const slabData = await fetchSlab(connection, slab);
    const lpAccount = parseAccount(slabData, params.lpIdx);

    const [lpPda] = deriveLpPda(programId, slab, params.lpIdx);

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_TRADE_CPI, [
        wallet.publicKey,           // user
        lpAccount.owner,            // lpOwner
        slab,                       // slab
        SYSVAR_CLOCK_PUBKEY,        // clock
        slab,                       // oracle (=slab for admin-oracle)
        matcherProgramId,           // matcherProg
        lpAccount.matcherContext,   // matcherCtx
        lpPda,                      // lpPda
      ]),
      data: encodeTradeCpi({
        lpIdx: params.lpIdx,
        userIdx: params.userIdx,
        size: params.size,
      }),
    });

    return sendIxs(connection, [ix], wallet);
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

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
        wallet.publicKey, slab, SYSVAR_CLOCK_PUBKEY, slab,
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

    const ix = buildIx({
      programId,
      keys: buildAccountMetas(ACCOUNTS_LIQUIDATE_AT_ORACLE, [
        wallet.publicKey, // unused but must be present
        slab, SYSVAR_CLOCK_PUBKEY, slab,
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
}
