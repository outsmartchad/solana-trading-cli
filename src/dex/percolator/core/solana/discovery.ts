/**
 * Vendored from @percolator/core — market discovery for Percolator.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  parseHeader,
  parseConfig,
  parseParams,
  type SlabHeader,
  type MarketConfig,
  type EngineState,
  type RiskParams,
} from "./slab";

const ENGINE_OFF = 392;
const ENGINE_BITMAP_OFF = 408;

export interface DiscoveredMarket {
  slabAddress: PublicKey;
  programId: PublicKey;
  header: SlabHeader;
  config: MarketConfig;
  engine: EngineState;
  params: RiskParams;
}

const MAGIC_BYTES = new Uint8Array([0x54, 0x41, 0x4c, 0x4f, 0x43, 0x52, 0x45, 0x50]);

export const SLAB_TIERS = {
  small:  { maxAccounts: 256,  dataSize: 62_808,   label: "Small",  description: "256 slots · ~0.44 SOL" },
  medium: { maxAccounts: 1024, dataSize: 248_760,  label: "Medium", description: "1,024 slots · ~1.73 SOL" },
  large:  { maxAccounts: 4096, dataSize: 992_568,  label: "Large",  description: "4,096 slots · ~6.91 SOL" },
} as const;

export type SlabTierKey = keyof typeof SLAB_TIERS;

export function slabDataSize(maxAccounts: number): number {
  const ENGINE_OFF_LOCAL = 392;
  const ACCOUNT_SIZE = 240;
  const bitmapBytes = Math.ceil(maxAccounts / 64) * 8;
  const postBitmap = 24;
  const nextFreeBytes = maxAccounts * 2;
  const preAccountsLen = 408 + bitmapBytes + postBitmap + nextFreeBytes;
  const accountsOff = Math.ceil(preAccountsLen / 16) * 16;
  return ENGINE_OFF_LOCAL + accountsOff + maxAccounts * ACCOUNT_SIZE;
}

const HEADER_SLICE_LENGTH = 1400;

function dv(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}
function readU16LE(data: Uint8Array, off: number): number {
  return dv(data).getUint16(off, true);
}
function readU64LE(data: Uint8Array, off: number): bigint {
  return dv(data).getBigUint64(off, true);
}
function readI64LE(data: Uint8Array, off: number): bigint {
  return dv(data).getBigInt64(off, true);
}
function readU128LE(buf: Uint8Array, offset: number): bigint {
  const lo = readU64LE(buf, offset);
  const hi = readU64LE(buf, offset + 8);
  return (hi << 64n) | lo;
}
function readI128LE(buf: Uint8Array, offset: number): bigint {
  const lo = readU64LE(buf, offset);
  const hi = readU64LE(buf, offset + 8);
  const unsigned = (hi << 64n) | lo;
  const SIGN_BIT = 1n << 127n;
  if (unsigned >= SIGN_BIT) return unsigned - (1n << 128n);
  return unsigned;
}

function parseEngineLight(data: Uint8Array, maxAccounts: number = 4096): EngineState {
  const base = ENGINE_OFF;
  const minLen = base + ENGINE_BITMAP_OFF;
  if (data.length < minLen) throw new Error(`Slab data too short for engine light parse: ${data.length} < ${minLen}`);
  const bitmapWords = Math.ceil(maxAccounts / 64);
  const numUsedOff = ENGINE_BITMAP_OFF + bitmapWords * 8;
  const nextAccountIdOff = Math.ceil((numUsedOff + 2) / 8) * 8;
  const canReadNumUsed = data.length >= base + numUsedOff + 2;
  const canReadNextId = data.length >= base + nextAccountIdOff + 8;
  return {
    vault: readU128LE(data, base + 0),
    insuranceFund: { balance: readU128LE(data, base + 16), feeRevenue: readU128LE(data, base + 32) },
    currentSlot: readU64LE(data, base + 192),
    fundingIndexQpbE6: readI128LE(data, base + 200),
    lastFundingSlot: readU64LE(data, base + 216),
    fundingRateBpsPerSlotLast: readI64LE(data, base + 224),
    lastCrankSlot: readU64LE(data, base + 232),
    maxCrankStalenessSlots: readU64LE(data, base + 240),
    totalOpenInterest: readU128LE(data, base + 248),
    cTot: readU128LE(data, base + 264),
    pnlPosTot: readU128LE(data, base + 280),
    liqCursor: readU16LE(data, base + 296),
    gcCursor: readU16LE(data, base + 298),
    lastSweepStartSlot: readU64LE(data, base + 304),
    lastSweepCompleteSlot: readU64LE(data, base + 312),
    crankCursor: readU16LE(data, base + 320),
    sweepStartIdx: readU16LE(data, base + 322),
    lifetimeLiquidations: readU64LE(data, base + 328),
    lifetimeForceCloses: readU64LE(data, base + 336),
    netLpPos: readI128LE(data, base + 344),
    lpSumAbs: readU128LE(data, base + 360),
    lpMaxAbs: readU128LE(data, base + 376),
    lpMaxAbsSweep: readU128LE(data, base + 392),
    numUsedAccounts: canReadNumUsed ? readU16LE(data, base + numUsedOff) : 0,
    nextAccountId: canReadNextId ? readU64LE(data, base + nextAccountIdOff) : 0n,
  };
}

export async function discoverMarkets(
  connection: Connection,
  programId: PublicKey,
): Promise<DiscoveredMarket[]> {
  const ALL_TIERS = Object.values(SLAB_TIERS);
  let rawAccounts: { pubkey: PublicKey; account: { data: Buffer | Uint8Array }; maxAccounts: number }[] = [];
  try {
    const queries = ALL_TIERS.map(tier =>
      connection.getProgramAccounts(programId, {
        filters: [{ dataSize: tier.dataSize }],
        dataSlice: { offset: 0, length: HEADER_SLICE_LENGTH },
      }).then(results => results.map(entry => ({ ...entry, maxAccounts: tier.maxAccounts })))
    );
    const results = await Promise.allSettled(queries);
    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const entry of result.value) {
          rawAccounts.push(entry as { pubkey: PublicKey; account: { data: Buffer | Uint8Array }; maxAccounts: number });
        }
      }
    }
  } catch (err) {
    const fallback = await connection.getProgramAccounts(programId, {
      filters: [{ memcmp: { offset: 0, bytes: "F6P2QNqpQV5" } }],
      dataSlice: { offset: 0, length: HEADER_SLICE_LENGTH },
    });
    rawAccounts = [...fallback].map(e => ({ ...e, maxAccounts: 4096 })) as typeof rawAccounts;
  }

  const markets: DiscoveredMarket[] = [];
  for (const { pubkey, account, maxAccounts } of rawAccounts) {
    const data = new Uint8Array(account.data);
    let valid = true;
    for (let i = 0; i < MAGIC_BYTES.length; i++) {
      if (data[i] !== MAGIC_BYTES[i]) { valid = false; break; }
    }
    if (!valid) continue;
    try {
      const header = parseHeader(data);
      const config = parseConfig(data);
      const engine = parseEngineLight(data, maxAccounts);
      const params = parseParams(data);
      markets.push({ slabAddress: pubkey, programId, header, config, engine, params });
    } catch {
      // Skip unparseable accounts
    }
  }
  return markets;
}
