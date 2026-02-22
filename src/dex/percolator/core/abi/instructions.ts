/**
 * Vendored from @percolator/core — instruction encoders for Percolator program.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import { PublicKey } from "@solana/web3.js";
import {
  encU8, encU16, encU32, encU64, encI64, encU128, encI128, encPubkey, concatBytes,
} from "./encode";

export const IX_TAG = {
  InitMarket: 0,
  InitUser: 1,
  InitLP: 2,
  DepositCollateral: 3,
  WithdrawCollateral: 4,
  KeeperCrank: 5,
  TradeNoCpi: 6,
  LiquidateAtOracle: 7,
  CloseAccount: 8,
  TopUpInsurance: 9,
  TradeCpi: 10,
  SetRiskThreshold: 11,
  UpdateAdmin: 12,
  CloseSlab: 13,
  UpdateConfig: 14,
  SetMaintenanceFee: 15,
  SetOracleAuthority: 16,
  PushOraclePrice: 17,
  SetOraclePriceCap: 18,
  ResolveMarket: 19,
  WithdrawInsurance: 20,
  AdminForceClose: 21,
  UpdateRiskParams: 22,
  RenounceAdmin: 23,
  CreateInsuranceMint: 24,
  DepositInsuranceLP: 25,
  WithdrawInsuranceLP: 26,
  PauseMarket: 27,
  UnpauseMarket: 28,
  SetPythOracle: 32,
} as const;

export interface InitMarketArgs {
  admin: PublicKey | string;
  collateralMint: PublicKey | string;
  indexFeedId: string;
  maxStalenessSecs: bigint | string;
  confFilterBps: number;
  invert: number;
  unitScale: number;
  initialMarkPriceE6: bigint | string;
  warmupPeriodSlots: bigint | string;
  maintenanceMarginBps: bigint | string;
  initialMarginBps: bigint | string;
  tradingFeeBps: bigint | string;
  maxAccounts: bigint | string;
  newAccountFee: bigint | string;
  riskReductionThreshold: bigint | string;
  maintenanceFeePerSlot: bigint | string;
  maxCrankStalenessSlots: bigint | string;
  liquidationFeeBps: bigint | string;
  liquidationFeeCap: bigint | string;
  liquidationBufferBps: bigint | string;
  minLiquidationAbs: bigint | string;
}

function encodeFeedId(feedId: string): Uint8Array {
  const hex = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
  if (hex.length !== 64) {
    throw new Error(`Invalid feed ID length: expected 64 hex chars, got ${hex.length}`);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 64; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function encodeInitMarket(args: InitMarketArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.InitMarket),
    encPubkey(args.admin),
    encPubkey(args.collateralMint),
    encodeFeedId(args.indexFeedId),
    encU64(args.maxStalenessSecs),
    encU16(args.confFilterBps),
    encU8(args.invert),
    encU32(args.unitScale),
    encU64(args.initialMarkPriceE6),
    encU64(args.warmupPeriodSlots),
    encU64(args.maintenanceMarginBps),
    encU64(args.initialMarginBps),
    encU64(args.tradingFeeBps),
    encU64(args.maxAccounts),
    encU128(args.newAccountFee),
    encU128(args.riskReductionThreshold),
    encU128(args.maintenanceFeePerSlot),
    encU64(args.maxCrankStalenessSlots),
    encU64(args.liquidationFeeBps),
    encU128(args.liquidationFeeCap),
    encU64(args.liquidationBufferBps),
    encU128(args.minLiquidationAbs),
  );
}

export interface InitUserArgs {
  feePayment: bigint | string;
}

export function encodeInitUser(args: InitUserArgs): Uint8Array {
  return concatBytes(encU8(IX_TAG.InitUser), encU64(args.feePayment));
}

export interface InitLPArgs {
  matcherProgram: PublicKey | string;
  matcherContext: PublicKey | string;
  feePayment: bigint | string;
}

export function encodeInitLP(args: InitLPArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.InitLP),
    encPubkey(args.matcherProgram),
    encPubkey(args.matcherContext),
    encU64(args.feePayment),
  );
}

export interface DepositCollateralArgs {
  userIdx: number;
  amount: bigint | string;
}

export function encodeDepositCollateral(args: DepositCollateralArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.DepositCollateral),
    encU16(args.userIdx),
    encU64(args.amount),
  );
}

export interface WithdrawCollateralArgs {
  userIdx: number;
  amount: bigint | string;
}

export function encodeWithdrawCollateral(args: WithdrawCollateralArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.WithdrawCollateral),
    encU16(args.userIdx),
    encU64(args.amount),
  );
}

export interface KeeperCrankArgs {
  callerIdx: number;
  allowPanic: boolean;
}

export function encodeKeeperCrank(args: KeeperCrankArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.KeeperCrank),
    encU16(args.callerIdx),
    encU8(args.allowPanic ? 1 : 0),
  );
}

export interface TradeNoCpiArgs {
  lpIdx: number;
  userIdx: number;
  size: bigint | string;
}

export function encodeTradeNoCpi(args: TradeNoCpiArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.TradeNoCpi),
    encU16(args.lpIdx),
    encU16(args.userIdx),
    encI128(args.size),
  );
}

export interface LiquidateAtOracleArgs {
  targetIdx: number;
}

export function encodeLiquidateAtOracle(args: LiquidateAtOracleArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.LiquidateAtOracle),
    encU16(args.targetIdx),
  );
}

export interface CloseAccountArgs {
  userIdx: number;
}

export function encodeCloseAccount(args: CloseAccountArgs): Uint8Array {
  return concatBytes(encU8(IX_TAG.CloseAccount), encU16(args.userIdx));
}

export interface TopUpInsuranceArgs {
  amount: bigint | string;
}

export function encodeTopUpInsurance(args: TopUpInsuranceArgs): Uint8Array {
  return concatBytes(encU8(IX_TAG.TopUpInsurance), encU64(args.amount));
}

export interface TradeCpiArgs {
  lpIdx: number;
  userIdx: number;
  size: bigint | string;
}

export function encodeTradeCpi(args: TradeCpiArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.TradeCpi),
    encU16(args.lpIdx),
    encU16(args.userIdx),
    encI128(args.size),
  );
}

export interface SetOracleAuthorityArgs {
  newAuthority: PublicKey | string;
}

export function encodeSetOracleAuthority(args: SetOracleAuthorityArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.SetOracleAuthority),
    encPubkey(args.newAuthority),
  );
}

export interface PushOraclePriceArgs {
  priceE6: bigint | string;
  timestamp: bigint | string;
}

export function encodePushOraclePrice(args: PushOraclePriceArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.PushOraclePrice),
    encU64(args.priceE6),
    encI64(args.timestamp),
  );
}

export function encodeCreateInsuranceMint(): Uint8Array {
  return encU8(IX_TAG.CreateInsuranceMint);
}

export interface DepositInsuranceLPArgs {
  amount: bigint | string;
}

export function encodeDepositInsuranceLP(args: DepositInsuranceLPArgs): Uint8Array {
  return concatBytes(encU8(IX_TAG.DepositInsuranceLP), encU64(args.amount));
}

export interface WithdrawInsuranceLPArgs {
  lpAmount: bigint | string;
}

export function encodeWithdrawInsuranceLP(args: WithdrawInsuranceLPArgs): Uint8Array {
  return concatBytes(encU8(IX_TAG.WithdrawInsuranceLP), encU64(args.lpAmount));
}

export function encodePauseMarket(): Uint8Array {
  return encU8(IX_TAG.PauseMarket);
}

export function encodeUnpauseMarket(): Uint8Array {
  return encU8(IX_TAG.UnpauseMarket);
}

// Matcher instructions
export const MATCHER_IX_TAG = {
  InitPassive: 0,
  InitCurve: 1,
  InitVamm: 2,
} as const;

export interface InitVammArgs {
  mode: number;
  tradingFeeBps: number;
  baseSpreadBps: number;
  maxTotalBps: number;
  impactKBps: number;
  liquidityNotionalE6: bigint | string;
  maxFillAbs: bigint | string;
  maxInventoryAbs: bigint | string;
}

export function encodeInitVamm(args: InitVammArgs): Uint8Array {
  return concatBytes(
    encU8(MATCHER_IX_TAG.InitVamm),
    encU8(args.mode),
    encU32(args.tradingFeeBps),
    encU32(args.baseSpreadBps),
    encU32(args.maxTotalBps),
    encU32(args.impactKBps),
    encU128(args.liquidityNotionalE6),
    encU128(args.maxFillAbs),
    encU128(args.maxInventoryAbs),
  );
}

export interface VammMatcherParams {
  mode: number;
  tradingFeeBps: number;
  baseSpreadBps: number;
  maxTotalBps: number;
  impactKBps: number;
  liquidityNotionalE6: bigint;
}

export const VAMM_MAGIC = 0x5045_5243_4d41_5443n;
export const CTX_VAMM_OFFSET = 64;

const BPS_DENOM = 10_000n;

export function computeVammQuote(
  params: VammMatcherParams,
  oraclePriceE6: bigint,
  tradeSize: bigint,
  isLong: boolean,
): bigint {
  const absSize = tradeSize < 0n ? -tradeSize : tradeSize;
  const absNotionalE6 = (absSize * oraclePriceE6) / 1_000_000n;

  let impactBps = 0n;
  if (params.mode === 1 && params.liquidityNotionalE6 > 0n) {
    impactBps = (absNotionalE6 * BigInt(params.impactKBps)) / params.liquidityNotionalE6;
  }

  const maxTotal = BigInt(params.maxTotalBps);
  const baseFee = BigInt(params.baseSpreadBps) + BigInt(params.tradingFeeBps);
  const maxImpact = maxTotal > baseFee ? maxTotal - baseFee : 0n;
  const clampedImpact = impactBps < maxImpact ? impactBps : maxImpact;
  let totalBps = baseFee + clampedImpact;
  if (totalBps > maxTotal) totalBps = maxTotal;

  if (isLong) {
    return (oraclePriceE6 * (BPS_DENOM + totalBps)) / BPS_DENOM;
  } else {
    if (totalBps >= BPS_DENOM) return 1n;
    return (oraclePriceE6 * (BPS_DENOM - totalBps)) / BPS_DENOM;
  }
}

// =============================================================================
// CloseSlab — transfer all slab lamports to admin (requires vault=0, no accounts)
// =============================================================================

export function encodeCloseSlab(): Uint8Array {
  return encU8(IX_TAG.CloseSlab);
}

// =============================================================================
// AdminForceClose — force-close any position at oracle price (admin only)
// =============================================================================

export interface AdminForceCloseArgs {
  targetIdx: number;
}

export function encodeAdminForceClose(args: AdminForceCloseArgs): Uint8Array {
  return concatBytes(
    encU8(IX_TAG.AdminForceClose),
    encU16(args.targetIdx),
  );
}

// =============================================================================
// ResolveMarket — set RESOLVED flag (admin only, requires oracle price set)
// =============================================================================

export function encodeResolveMarket(): Uint8Array {
  return encU8(IX_TAG.ResolveMarket);
}

// =============================================================================
// WithdrawInsurance — drain insurance fund to admin (requires RESOLVED, no positions)
// =============================================================================

export function encodeWithdrawInsurance(): Uint8Array {
  return encU8(IX_TAG.WithdrawInsurance);
}
