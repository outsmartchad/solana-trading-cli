/**
 * Vendored from @percolator/core — slab parser for Percolator markets.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import { Connection, PublicKey } from "@solana/web3.js";

function dv(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}
function readU8(data: Uint8Array, off: number): number {
  return data[off];
}
function readU16LE(data: Uint8Array, off: number): number {
  return dv(data).getUint16(off, true);
}
function readU32LE(data: Uint8Array, off: number): number {
  return dv(data).getUint32(off, true);
}
function readU64LE(data: Uint8Array, off: number): bigint {
  return dv(data).getBigUint64(off, true);
}
function readI64LE(data: Uint8Array, off: number): bigint {
  return dv(data).getBigInt64(off, true);
}
function readI128LE(buf: Uint8Array, offset: number): bigint {
  const lo = readU64LE(buf, offset);
  const hi = readU64LE(buf, offset + 8);
  const unsigned = (hi << 64n) | lo;
  const SIGN_BIT = 1n << 127n;
  if (unsigned >= SIGN_BIT) return unsigned - (1n << 128n);
  return unsigned;
}
function readU128LE(buf: Uint8Array, offset: number): bigint {
  const lo = readU64LE(buf, offset);
  const hi = readU64LE(buf, offset + 8);
  return (hi << 64n) | lo;
}

const MAGIC: bigint = 0x504552434f4c4154n;
const HEADER_LEN = 72;
const CONFIG_OFFSET = HEADER_LEN;
const CONFIG_LEN = 320;
const RESERVED_OFF = 48;
const FLAG_RESOLVED = 1 << 0;

export interface SlabHeader {
  magic: bigint;
  version: number;
  bump: number;
  flags: number;
  resolved: boolean;
  paused: boolean;
  admin: PublicKey;
  nonce: bigint;
  lastThrUpdateSlot: bigint;
}

export interface MarketConfig {
  collateralMint: PublicKey;
  vaultPubkey: PublicKey;
  indexFeedId: PublicKey;
  maxStalenessSlots: bigint;
  confFilterBps: number;
  vaultAuthorityBump: number;
  invert: number;
  unitScale: number;
  fundingHorizonSlots: bigint;
  fundingKBps: bigint;
  fundingInvScaleNotionalE6: bigint;
  fundingMaxPremiumBps: bigint;
  fundingMaxBpsPerSlot: bigint;
  threshFloor: bigint;
  threshRiskBps: bigint;
  threshUpdateIntervalSlots: bigint;
  threshStepBps: bigint;
  threshAlphaBps: bigint;
  threshMin: bigint;
  threshMax: bigint;
  threshMinStep: bigint;
  oracleAuthority: PublicKey;
  authorityPriceE6: bigint;
  authorityTimestamp: bigint;
  oraclePriceCapE2bps: bigint;
  lastEffectivePriceE6: bigint;
}

export async function fetchSlab(
  connection: Connection,
  slabPubkey: PublicKey
): Promise<Uint8Array> {
  const info = await connection.getAccountInfo(slabPubkey);
  if (!info) throw new Error(`Slab account not found: ${slabPubkey.toBase58()}`);
  return new Uint8Array(info.data);
}

export function parseHeader(data: Uint8Array): SlabHeader {
  if (data.length < HEADER_LEN) throw new Error(`Slab data too short for header: ${data.length} < ${HEADER_LEN}`);
  const magic = readU64LE(data, 0);
  if (magic !== MAGIC) throw new Error(`Invalid slab magic: expected ${MAGIC.toString(16)}, got ${magic.toString(16)}`);
  const version = readU32LE(data, 8);
  const bump = readU8(data, 12);
  const flags = readU8(data, 13);
  const admin = new PublicKey(data.subarray(16, 48));
  const nonce = readU64LE(data, RESERVED_OFF);
  const lastThrUpdateSlot = readU64LE(data, RESERVED_OFF + 8);
  return { magic, version, bump, flags, resolved: (flags & FLAG_RESOLVED) !== 0, paused: (flags & 0x02) !== 0, admin, nonce, lastThrUpdateSlot };
}

export function parseConfig(data: Uint8Array): MarketConfig {
  const minLen = CONFIG_OFFSET + CONFIG_LEN;
  if (data.length < minLen) throw new Error(`Slab data too short for config: ${data.length} < ${minLen}`);
  let off = CONFIG_OFFSET;
  const collateralMint = new PublicKey(data.subarray(off, off + 32)); off += 32;
  const vaultPubkey = new PublicKey(data.subarray(off, off + 32)); off += 32;
  const indexFeedId = new PublicKey(data.subarray(off, off + 32)); off += 32;
  const maxStalenessSlots = readU64LE(data, off); off += 8;
  const confFilterBps = readU16LE(data, off); off += 2;
  const vaultAuthorityBump = readU8(data, off); off += 1;
  const invert = readU8(data, off); off += 1;
  const unitScale = readU32LE(data, off); off += 4;
  const fundingHorizonSlots = readU64LE(data, off); off += 8;
  const fundingKBps = readU64LE(data, off); off += 8;
  const fundingInvScaleNotionalE6 = readU128LE(data, off); off += 16;
  const fundingMaxPremiumBps = readI64LE(data, off); off += 8;
  const fundingMaxBpsPerSlot = readI64LE(data, off); off += 8;
  const threshFloor = readU128LE(data, off); off += 16;
  const threshRiskBps = readU64LE(data, off); off += 8;
  const threshUpdateIntervalSlots = readU64LE(data, off); off += 8;
  const threshStepBps = readU64LE(data, off); off += 8;
  const threshAlphaBps = readU64LE(data, off); off += 8;
  const threshMin = readU128LE(data, off); off += 16;
  const threshMax = readU128LE(data, off); off += 16;
  const threshMinStep = readU128LE(data, off); off += 16;
  const oracleAuthority = new PublicKey(data.subarray(off, off + 32)); off += 32;
  const authorityPriceE6 = readU64LE(data, off); off += 8;
  const authorityTimestamp = readI64LE(data, off); off += 8;
  const oraclePriceCapE2bps = readU64LE(data, off); off += 8;
  const lastEffectivePriceE6 = readU64LE(data, off);
  return {
    collateralMint, vaultPubkey, indexFeedId, maxStalenessSlots, confFilterBps, vaultAuthorityBump,
    invert, unitScale, fundingHorizonSlots, fundingKBps, fundingInvScaleNotionalE6,
    fundingMaxPremiumBps, fundingMaxBpsPerSlot, threshFloor, threshRiskBps,
    threshUpdateIntervalSlots, threshStepBps, threshAlphaBps, threshMin, threshMax,
    threshMinStep, oracleAuthority, authorityPriceE6, authorityTimestamp,
    oraclePriceCapE2bps, lastEffectivePriceE6,
  };
}

export function readNonce(data: Uint8Array): bigint {
  if (data.length < RESERVED_OFF + 8) throw new Error("Slab data too short for nonce");
  return readU64LE(data, RESERVED_OFF);
}

const ENGINE_OFF = 392;
const ENGINE_VAULT_OFF = 0;
const ENGINE_INSURANCE_OFF = 16;
const ENGINE_PARAMS_OFF = 48;
const ENGINE_CURRENT_SLOT_OFF = 192;
const ENGINE_FUNDING_INDEX_OFF = 200;
const ENGINE_LAST_FUNDING_SLOT_OFF = 216;
const ENGINE_FUNDING_RATE_BPS_OFF = 224;
const ENGINE_LAST_CRANK_SLOT_OFF = 232;
const ENGINE_MAX_CRANK_STALENESS_OFF = 240;
const ENGINE_TOTAL_OI_OFF = 248;
const ENGINE_C_TOT_OFF = 264;
const ENGINE_PNL_POS_TOT_OFF = 280;
const ENGINE_LIQ_CURSOR_OFF = 296;
const ENGINE_GC_CURSOR_OFF = 298;
const ENGINE_LAST_SWEEP_START_OFF = 304;
const ENGINE_LAST_SWEEP_COMPLETE_OFF = 312;
const ENGINE_CRANK_CURSOR_OFF = 320;
const ENGINE_SWEEP_START_IDX_OFF = 322;
const ENGINE_LIFETIME_LIQUIDATIONS_OFF = 328;
const ENGINE_LIFETIME_FORCE_CLOSES_OFF = 336;
const ENGINE_NET_LP_POS_OFF = 344;
const ENGINE_LP_SUM_ABS_OFF = 360;
const ENGINE_LP_MAX_ABS_OFF = 376;
const ENGINE_LP_MAX_ABS_SWEEP_OFF = 392;
const ENGINE_BITMAP_OFF = 408;
const ENGINE_ACCOUNTS_OFF = 9136;
const DEFAULT_BITMAP_WORDS = 64;
const DEFAULT_MAX_ACCOUNTS = 4096;
const ACCOUNT_SIZE = 240;

const PARAMS_WARMUP_PERIOD_OFF = 0;
const PARAMS_MAINTENANCE_MARGIN_OFF = 8;
const PARAMS_INITIAL_MARGIN_OFF = 16;
const PARAMS_TRADING_FEE_OFF = 24;
const PARAMS_MAX_ACCOUNTS_OFF = 32;
const PARAMS_NEW_ACCOUNT_FEE_OFF = 40;
const PARAMS_RISK_THRESHOLD_OFF = 56;
const PARAMS_MAINTENANCE_FEE_OFF = 72;
const PARAMS_MAX_CRANK_STALENESS_OFF = 88;
const PARAMS_LIQUIDATION_FEE_BPS_OFF = 96;
const PARAMS_LIQUIDATION_FEE_CAP_OFF = 104;
const PARAMS_LIQUIDATION_BUFFER_OFF = 120;
const PARAMS_MIN_LIQUIDATION_OFF = 128;

const ACCT_ACCOUNT_ID_OFF = 0;
const ACCT_CAPITAL_OFF = 8;
const ACCT_KIND_OFF = 24;
const ACCT_PNL_OFF = 32;
const ACCT_RESERVED_PNL_OFF = 48;
const ACCT_WARMUP_STARTED_OFF = 56;
const ACCT_WARMUP_SLOPE_OFF = 64;
const ACCT_POSITION_SIZE_OFF = 80;
const ACCT_ENTRY_PRICE_OFF = 96;
const ACCT_FUNDING_INDEX_OFF = 104;
const ACCT_MATCHER_PROGRAM_OFF = 120;
const ACCT_MATCHER_CONTEXT_OFF = 152;
const ACCT_OWNER_OFF = 184;
const ACCT_FEE_CREDITS_OFF = 216;
const ACCT_LAST_FEE_SLOT_OFF = 232;

export interface InsuranceFund { balance: bigint; feeRevenue: bigint; }

export interface RiskParams {
  warmupPeriodSlots: bigint;
  maintenanceMarginBps: bigint;
  initialMarginBps: bigint;
  tradingFeeBps: bigint;
  maxAccounts: bigint;
  newAccountFee: bigint;
  riskReductionThreshold: bigint;
  maintenanceFeePerSlot: bigint;
  maxCrankStalenessSlots: bigint;
  liquidationFeeBps: bigint;
  liquidationFeeCap: bigint;
  liquidationBufferBps: bigint;
  minLiquidationAbs: bigint;
}

export interface EngineState {
  vault: bigint;
  insuranceFund: InsuranceFund;
  currentSlot: bigint;
  fundingIndexQpbE6: bigint;
  lastFundingSlot: bigint;
  fundingRateBpsPerSlotLast: bigint;
  lastCrankSlot: bigint;
  maxCrankStalenessSlots: bigint;
  totalOpenInterest: bigint;
  cTot: bigint;
  pnlPosTot: bigint;
  liqCursor: number;
  gcCursor: number;
  lastSweepStartSlot: bigint;
  lastSweepCompleteSlot: bigint;
  crankCursor: number;
  sweepStartIdx: number;
  lifetimeLiquidations: bigint;
  lifetimeForceCloses: bigint;
  netLpPos: bigint;
  lpSumAbs: bigint;
  lpMaxAbs: bigint;
  lpMaxAbsSweep: bigint;
  numUsedAccounts: number;
  nextAccountId: bigint;
}

export enum AccountKind { User = 0, LP = 1 }

export interface Account {
  kind: AccountKind;
  accountId: bigint;
  capital: bigint;
  pnl: bigint;
  reservedPnl: bigint;
  warmupStartedAtSlot: bigint;
  warmupSlopePerStep: bigint;
  positionSize: bigint;
  entryPrice: bigint;
  fundingIndex: bigint;
  matcherProgram: PublicKey;
  matcherContext: PublicKey;
  owner: PublicKey;
  feeCredits: bigint;
  lastFeeSlot: bigint;
}

function slabLayout(maxAccounts: number) {
  const bitmapWords = Math.ceil(maxAccounts / 64);
  const bitmapBytes = bitmapWords * 8;
  const postBitmap = 24;
  const nextFreeBytes = maxAccounts * 2;
  const preAccountsLen = 408 + bitmapBytes + postBitmap + nextFreeBytes;
  const accountsOff = Math.ceil(preAccountsLen / 16) * 16;
  return { bitmapWords, accountsOff, maxAccounts };
}

export function detectLayout(dataLen: number) {
  for (const n of [64, 256, 1024, 4096]) {
    const layout = slabLayout(n);
    const expectedLen = ENGINE_OFF + layout.accountsOff + n * ACCOUNT_SIZE;
    if (dataLen === expectedLen) return layout;
  }
  for (const n of [64, 256, 1024, 4096]) {
    const bitmapWords = Math.ceil(n / 64);
    const bitmapBytes = bitmapWords * 8;
    const postBitmap = 24;
    const nextFreeBytes = n * 2;
    const accountsOff = 408 + bitmapBytes + postBitmap + nextFreeBytes;
    const expectedLen = ENGINE_OFF + accountsOff + n * ACCOUNT_SIZE;
    if (dataLen === expectedLen) return { bitmapWords, accountsOff, maxAccounts: n };
  }
  return null;
}

export function parseParams(data: Uint8Array): RiskParams {
  const base = ENGINE_OFF + ENGINE_PARAMS_OFF;
  if (data.length < base + 144) throw new Error("Slab data too short for RiskParams");
  return {
    warmupPeriodSlots: readU64LE(data, base + PARAMS_WARMUP_PERIOD_OFF),
    maintenanceMarginBps: readU64LE(data, base + PARAMS_MAINTENANCE_MARGIN_OFF),
    initialMarginBps: readU64LE(data, base + PARAMS_INITIAL_MARGIN_OFF),
    tradingFeeBps: readU64LE(data, base + PARAMS_TRADING_FEE_OFF),
    maxAccounts: readU64LE(data, base + PARAMS_MAX_ACCOUNTS_OFF),
    newAccountFee: readU128LE(data, base + PARAMS_NEW_ACCOUNT_FEE_OFF),
    riskReductionThreshold: readU128LE(data, base + PARAMS_RISK_THRESHOLD_OFF),
    maintenanceFeePerSlot: readU128LE(data, base + PARAMS_MAINTENANCE_FEE_OFF),
    maxCrankStalenessSlots: readU64LE(data, base + PARAMS_MAX_CRANK_STALENESS_OFF),
    liquidationFeeBps: readU64LE(data, base + PARAMS_LIQUIDATION_FEE_BPS_OFF),
    liquidationFeeCap: readU128LE(data, base + PARAMS_LIQUIDATION_FEE_CAP_OFF),
    liquidationBufferBps: readU64LE(data, base + PARAMS_LIQUIDATION_BUFFER_OFF),
    minLiquidationAbs: readU128LE(data, base + PARAMS_MIN_LIQUIDATION_OFF),
  };
}

export function parseEngine(data: Uint8Array): EngineState {
  const base = ENGINE_OFF;
  const layout = detectLayout(data.length);
  const minLen = layout ? layout.accountsOff : ENGINE_ACCOUNTS_OFF;
  if (data.length < base + minLen) throw new Error("Slab data too short for RiskEngine");
  return {
    vault: readU128LE(data, base + ENGINE_VAULT_OFF),
    insuranceFund: {
      balance: readU128LE(data, base + ENGINE_INSURANCE_OFF),
      feeRevenue: readU128LE(data, base + ENGINE_INSURANCE_OFF + 16),
    },
    currentSlot: readU64LE(data, base + ENGINE_CURRENT_SLOT_OFF),
    fundingIndexQpbE6: readI128LE(data, base + ENGINE_FUNDING_INDEX_OFF),
    lastFundingSlot: readU64LE(data, base + ENGINE_LAST_FUNDING_SLOT_OFF),
    fundingRateBpsPerSlotLast: readI64LE(data, base + ENGINE_FUNDING_RATE_BPS_OFF),
    lastCrankSlot: readU64LE(data, base + ENGINE_LAST_CRANK_SLOT_OFF),
    maxCrankStalenessSlots: readU64LE(data, base + ENGINE_MAX_CRANK_STALENESS_OFF),
    totalOpenInterest: readU128LE(data, base + ENGINE_TOTAL_OI_OFF),
    cTot: readU128LE(data, base + ENGINE_C_TOT_OFF),
    pnlPosTot: readU128LE(data, base + ENGINE_PNL_POS_TOT_OFF),
    liqCursor: readU16LE(data, base + ENGINE_LIQ_CURSOR_OFF),
    gcCursor: readU16LE(data, base + ENGINE_GC_CURSOR_OFF),
    lastSweepStartSlot: readU64LE(data, base + ENGINE_LAST_SWEEP_START_OFF),
    lastSweepCompleteSlot: readU64LE(data, base + ENGINE_LAST_SWEEP_COMPLETE_OFF),
    crankCursor: readU16LE(data, base + ENGINE_CRANK_CURSOR_OFF),
    sweepStartIdx: readU16LE(data, base + ENGINE_SWEEP_START_IDX_OFF),
    lifetimeLiquidations: readU64LE(data, base + ENGINE_LIFETIME_LIQUIDATIONS_OFF),
    lifetimeForceCloses: readU64LE(data, base + ENGINE_LIFETIME_FORCE_CLOSES_OFF),
    netLpPos: readI128LE(data, base + ENGINE_NET_LP_POS_OFF),
    lpSumAbs: readU128LE(data, base + ENGINE_LP_SUM_ABS_OFF),
    lpMaxAbs: readU128LE(data, base + ENGINE_LP_MAX_ABS_OFF),
    lpMaxAbsSweep: readU128LE(data, base + ENGINE_LP_MAX_ABS_SWEEP_OFF),
    numUsedAccounts: (() => {
      const bw = layout ? layout.bitmapWords : DEFAULT_BITMAP_WORDS;
      return readU16LE(data, base + ENGINE_BITMAP_OFF + bw * 8);
    })(),
    nextAccountId: (() => {
      const bw = layout ? layout.bitmapWords : DEFAULT_BITMAP_WORDS;
      const numUsedOff = ENGINE_BITMAP_OFF + bw * 8;
      return readU64LE(data, base + Math.ceil((numUsedOff + 2) / 8) * 8);
    })(),
  };
}

export function parseUsedIndices(data: Uint8Array): number[] {
  const layout = detectLayout(data.length);
  const bitmapWords = layout ? layout.bitmapWords : DEFAULT_BITMAP_WORDS;
  const base = ENGINE_OFF + ENGINE_BITMAP_OFF;
  if (data.length < base + bitmapWords * 8) throw new Error("Slab data too short for bitmap");
  const used: number[] = [];
  for (let word = 0; word < bitmapWords; word++) {
    const bits = readU64LE(data, base + word * 8);
    if (bits === 0n) continue;
    for (let bit = 0; bit < 64; bit++) {
      if ((bits >> BigInt(bit)) & 1n) used.push(word * 64 + bit);
    }
  }
  return used;
}

export function isAccountUsed(data: Uint8Array, idx: number): boolean {
  const layout = detectLayout(data.length);
  const maxAcc = layout ? layout.maxAccounts : DEFAULT_MAX_ACCOUNTS;
  if (idx < 0 || idx >= maxAcc) return false;
  const base = ENGINE_OFF + ENGINE_BITMAP_OFF;
  const word = Math.floor(idx / 64);
  const bit = idx % 64;
  const bits = readU64LE(data, base + word * 8);
  return ((bits >> BigInt(bit)) & 1n) !== 0n;
}

export function maxAccountIndex(dataLen: number): number {
  const layout = detectLayout(dataLen);
  const accOff = layout ? layout.accountsOff : ENGINE_ACCOUNTS_OFF;
  const accountsEnd = dataLen - ENGINE_OFF - accOff;
  if (accountsEnd <= 0) return 0;
  return Math.floor(accountsEnd / ACCOUNT_SIZE);
}

export function parseAccount(data: Uint8Array, idx: number): Account {
  const maxIdx = maxAccountIndex(data.length);
  if (idx < 0 || idx >= maxIdx) throw new Error(`Account index out of range: ${idx} (max: ${maxIdx - 1})`);
  const layout = detectLayout(data.length);
  const accOff = layout ? layout.accountsOff : ENGINE_ACCOUNTS_OFF;
  const base = ENGINE_OFF + accOff + idx * ACCOUNT_SIZE;
  if (data.length < base + ACCOUNT_SIZE) throw new Error("Slab data too short for account");
  const kindByte = readU8(data, base + ACCT_KIND_OFF);
  const kind = kindByte === 1 ? AccountKind.LP : AccountKind.User;
  return {
    kind,
    accountId: readU64LE(data, base + ACCT_ACCOUNT_ID_OFF),
    capital: readU128LE(data, base + ACCT_CAPITAL_OFF),
    pnl: readI128LE(data, base + ACCT_PNL_OFF),
    reservedPnl: readU64LE(data, base + ACCT_RESERVED_PNL_OFF),
    warmupStartedAtSlot: readU64LE(data, base + ACCT_WARMUP_STARTED_OFF),
    warmupSlopePerStep: readU128LE(data, base + ACCT_WARMUP_SLOPE_OFF),
    positionSize: readI128LE(data, base + ACCT_POSITION_SIZE_OFF),
    entryPrice: readU64LE(data, base + ACCT_ENTRY_PRICE_OFF),
    fundingIndex: readI128LE(data, base + ACCT_FUNDING_INDEX_OFF),
    matcherProgram: new PublicKey(data.subarray(base + ACCT_MATCHER_PROGRAM_OFF, base + ACCT_MATCHER_PROGRAM_OFF + 32)),
    matcherContext: new PublicKey(data.subarray(base + ACCT_MATCHER_CONTEXT_OFF, base + ACCT_MATCHER_CONTEXT_OFF + 32)),
    owner: new PublicKey(data.subarray(base + ACCT_OWNER_OFF, base + ACCT_OWNER_OFF + 32)),
    feeCredits: readI128LE(data, base + ACCT_FEE_CREDITS_OFF),
    lastFeeSlot: readU64LE(data, base + ACCT_LAST_FEE_SLOT_OFF),
  };
}

export function parseAllAccounts(data: Uint8Array): { idx: number; account: Account }[] {
  const indices = parseUsedIndices(data);
  const maxIdx = maxAccountIndex(data.length);
  const validIndices = indices.filter(idx => idx < maxIdx);
  return validIndices.map(idx => ({ idx, account: parseAccount(data, idx) }));
}
