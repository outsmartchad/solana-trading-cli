/**
 * Shared CLMM (Concentrated Liquidity Market Maker) Base
 *
 * This module provides the common CLMM swap logic shared by:
 *   - byreal-clmm (program: REALQqNEomY6cQGZJUGwywTBD2UmDT32rZcNnfxQ5N2)
 *   - pancakeswap-clmm (program: HpNfyc2Saw7RKkQd8nEL4khUcuPhQ7WwY1B2qjx8jxFq)
 *
 * Both are forks of the Raydium CLMM program with identical:
 *   - Account layout (pool state, tick arrays, bitmap extension)
 *   - Instruction format (swap_v2 discriminator + args)
 *   - PDA derivation seeds
 *
 * The ONLY difference is the program ID. This base module is parameterized
 * by programId so each adapter just passes its own.
 *
 * Source: 100x-algo-bots/trading-modules/byreal-clmm/ and pancakeswap-clmm/
 */

import {
  PublicKey,
  TransactionInstruction,
  Connection,
  SystemProgram,
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import Decimal from "decimal.js";
import { MathUtil } from "@raydium-io/raydium-sdk-v2";

import { getWallet, getConnection } from "../../helpers/config";
import { landTransaction } from "../../transactions/landing";
import { sendAndConfirmVtx } from "../../transactions/send-rpc";
import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SnipeParams,
  SwapResult,
  PoolInfo,
  PriceInfo,
  BuildSwapIxsResult,
  UnsupportedOperationError,
  requireTokenMint,
  WSOL_MINT,
  USDC_MINT,
  USDT_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USD1_MINT_STR = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const SIX_DECIMAL_MINTS = new Set([USDC_MINT, USDT_MINT, USD1_MINT_STR]);

/** swap_v2 discriminator — identical across Raydium/Byreal/PancakeSwap CLMM forks */
const SWAP_V2_DISCRIMINATOR = Buffer.from([43, 4, 237, 11, 26, 201, 30, 98]);

/** Tick array constants */
const TICK_ARRAY_SIZE = 60;
const TICK_ARRAY_BITMAP_SIZE = 512;
const MAX_TICK = 443636;
const MIN_TICK = -443636;

const MIN_SQRT_PRICE_X64 = new BN("4295048016");
const MAX_SQRT_PRICE_X64 = new BN("79226673515401279992447579055");

// Extension bitmap constants
const EXTENSION_TICKARRAY_BITMAP_SIZE = 14;

// ---------------------------------------------------------------------------
// PDA derivation — CLMM pool accounts
// ---------------------------------------------------------------------------

/**
 * Convert i32 to 4-byte big-endian buffer.
 * Note: Byreal & PancakeSwap CLMM forks use big-endian for tick array
 * start index in PDA derivation (differs from Raydium CLMM which uses LE).
 */
function i32ToBytes(num: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(num, 0);
  return buf;
}

function deriveTickArray(
  programId: PublicKey,
  poolId: PublicKey,
  startIndex: number,
): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("tick_array"), poolId.toBuffer(), i32ToBytes(startIndex)],
    programId,
  );
  return addr;
}

function deriveTickArrayBitmapExtension(
  programId: PublicKey,
  poolId: PublicKey,
): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_tick_array_bitmap_extension"), poolId.toBuffer()],
    programId,
  );
  return addr;
}

function deriveObservationState(
  programId: PublicKey,
  poolId: PublicKey,
): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolId.toBuffer()],
    programId,
  );
  return addr;
}

// ---------------------------------------------------------------------------
// Pool state decoding
// ---------------------------------------------------------------------------

export interface ClmmPoolState {
  ammConfig: PublicKey;
  tokenMint0: PublicKey;
  tokenMint1: PublicKey;
  tokenVault0: PublicKey;
  tokenVault1: PublicKey;
  observationKey: PublicKey;
  mintDecimals0: number;
  mintDecimals1: number;
  tickSpacing: number;
  sqrtPriceX64: BN;
  tickCurrent: number;
  liquidity: BN;
  tickArrayBitmap: BN[];
}

function decodePoolState(data: Buffer): ClmmPoolState {
  let offset = 8; // skip discriminator

  // Bump [1 byte]
  offset += 1;

  // ammConfig [32 bytes]
  const ammConfig = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // owner [32 bytes]
  offset += 32;

  // tokenMint0 [32 bytes]
  const tokenMint0 = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // tokenMint1 [32 bytes]
  const tokenMint1 = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // tokenVault0 [32 bytes]
  const tokenVault0 = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // tokenVault1 [32 bytes]
  const tokenVault1 = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // observationKey [32 bytes]
  const observationKey = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // mintDecimals0 [1 byte]
  const mintDecimals0 = data.readUInt8(offset);
  offset += 1;

  // mintDecimals1 [1 byte]
  const mintDecimals1 = data.readUInt8(offset);
  offset += 1;

  // tickSpacing [2 bytes]
  const tickSpacing = data.readUInt16LE(offset);
  offset += 2;

  // liquidity [16 bytes]
  const liquidity = new BN(data.subarray(offset, offset + 16), "le");
  offset += 16;

  // sqrtPriceX64 [16 bytes]
  const sqrtPriceX64 = new BN(data.subarray(offset, offset + 16), "le");
  offset += 16;

  // tickCurrent [4 bytes]
  const tickCurrent = data.readInt32LE(offset);
  offset += 4;

  // padding [4 bytes]
  offset += 4;

  // feeGrowthGlobal0X64 [16]
  offset += 16;
  // feeGrowthGlobal1X64 [16]
  offset += 16;
  // protocolFeesToken0 [8]
  offset += 8;
  // protocolFeesToken1 [8]
  offset += 8;
  // swapInAmountToken0 [16]
  offset += 16;
  // swapOutAmountToken1 [16]
  offset += 16;
  // swapInAmountToken1 [16]
  offset += 16;
  // swapOutAmountToken0 [16]
  offset += 16;

  // status [1 byte]
  offset += 1;
  // padding [7 bytes]
  offset += 7;

  // rewardInfos [3 * 169 bytes = 507 bytes]
  offset += 507;

  // tickArrayBitmap [16 * u64 = 16 * 8 bytes = 128 bytes]
  // Note: This is [u64; 16], NOT [u128; 16]. Each element is 8 bytes.
  const tickArrayBitmap: BN[] = [];
  for (let i = 0; i < 16; i++) {
    tickArrayBitmap.push(new BN(data.subarray(offset, offset + 8), "le"));
    offset += 8;
  }

  return {
    ammConfig,
    tokenMint0,
    tokenMint1,
    tokenVault0,
    tokenVault1,
    observationKey,
    mintDecimals0,
    mintDecimals1,
    tickSpacing,
    sqrtPriceX64,
    tickCurrent,
    liquidity,
    tickArrayBitmap,
  };
}

async function fetchClmmPoolState(
  connection: Connection,
  poolId: PublicKey,
  programId: PublicKey,
): Promise<ClmmPoolState> {
  const accountInfo = await connection.getAccountInfo(poolId);
  if (!accountInfo) {
    throw new Error(`CLMM pool not found: ${poolId.toBase58()}`);
  }
  if (accountInfo.owner.toBase58() !== programId.toBase58()) {
    throw new Error(
      `Pool ${poolId.toBase58()} owner ${accountInfo.owner.toBase58()} does not match expected program ${programId.toBase58()}`,
    );
  }
  return decodePoolState(accountInfo.data);
}

// ---------------------------------------------------------------------------
// Tick array bitmap extension
// ---------------------------------------------------------------------------

interface ExBitmapInfo {
  poolId: PublicKey;
  exBitmapAddress: PublicKey;
  /** Whether the bitmap extension account exists on-chain */
  exists: boolean;
  positiveTickArrayBitmap: BN[][];
  negativeTickArrayBitmap: BN[][];
}

async function getTickArrayBitmapExtension(
  programId: PublicKey,
  poolId: PublicKey,
  connection: Connection,
): Promise<ExBitmapInfo> {
  const exBitmapAddress = deriveTickArrayBitmapExtension(programId, poolId);
  const accountInfo = await connection.getAccountInfo(exBitmapAddress);

  if (!accountInfo) {
    // Graceful fallback — return empty bitmaps (pancakeswap pattern)
    const emptyBitmaps: BN[][] = [];
    for (let i = 0; i < EXTENSION_TICKARRAY_BITMAP_SIZE; i++) {
      emptyBitmaps.push(Array(8).fill(new BN(0)));
    }
    return {
      poolId,
      exBitmapAddress,
      exists: false,
      positiveTickArrayBitmap: emptyBitmaps,
      negativeTickArrayBitmap: emptyBitmaps,
    };
  }

  const data = accountInfo.data;
  let offset = 8 + 32; // discriminator + poolId

  // positiveTickArrayBitmap [14 * 8 * 8 = 896 bytes]
  const positiveTickArrayBitmap: BN[][] = [];
  for (let i = 0; i < EXTENSION_TICKARRAY_BITMAP_SIZE; i++) {
    const row: BN[] = [];
    for (let j = 0; j < 8; j++) {
      row.push(new BN(data.subarray(offset, offset + 8), "le"));
      offset += 8;
    }
    positiveTickArrayBitmap.push(row);
  }

  // negativeTickArrayBitmap [14 * 8 * 8 = 896 bytes]
  const negativeTickArrayBitmap: BN[][] = [];
  for (let i = 0; i < EXTENSION_TICKARRAY_BITMAP_SIZE; i++) {
    const row: BN[] = [];
    for (let j = 0; j < 8; j++) {
      row.push(new BN(data.subarray(offset, offset + 8), "le"));
      offset += 8;
    }
    negativeTickArrayBitmap.push(row);
  }

  return {
    poolId,
    exBitmapAddress,
    exists: true,
    positiveTickArrayBitmap,
    negativeTickArrayBitmap,
  };
}

// ---------------------------------------------------------------------------
// Tick array bitmap search
// ---------------------------------------------------------------------------

function getNextTickArrayStartIndex(
  currentStartIndex: number,
  tickSpacing: number,
  zeroForOne: boolean,
): number {
  const ticksPerArray = tickSpacing * TICK_ARRAY_SIZE;
  return zeroForOne
    ? currentStartIndex - ticksPerArray
    : currentStartIndex + ticksPerArray;
}

function getTickArrayStartIndexForTick(
  tick: number,
  tickSpacing: number,
): number {
  const ticksPerArray = tickSpacing * TICK_ARRAY_SIZE;
  let startIndex = Math.floor(tick / ticksPerArray) * ticksPerArray;
  if (tick < 0 && tick % ticksPerArray !== 0) {
    startIndex -= ticksPerArray;
  }
  return startIndex;
}

/**
 * Merge an array of u64 BNs into a single large BN.
 * Matches the reference SDK: b = sum(bns[i] << (64 * i))
 */
function mergeTickArrayBitmapToSingleBN(bns: BN[]): BN {
  let b = new BN(0);
  for (let i = 0; i < bns.length; i++) {
    b = b.add(bns[i].shln(64 * i));
  }
  return b;
}

/**
 * Check if a tick array is initialized using the pool's default bitmap.
 * The default bitmap covers tick arrays within ±(tickSpacing * 60 * 512) of 0.
 *
 * Matches reference: compressed = floor(tick / multiplier) + 512
 *                     bitPos = abs(compressed)
 *                     isInit = bitmap.testn(bitPos)
 */
function checkTickArrayIsInitialized(
  bitmap: BN,
  tick: number,
  tickSpacing: number,
): { isInitialized: boolean; startIndex: number } {
  const multiplier = tickSpacing * TICK_ARRAY_SIZE;
  const compressed = Math.floor(tick / multiplier) + 512;
  const bitPos = Math.abs(compressed);
  return {
    isInitialized: bitmap.testn(bitPos),
    startIndex: (bitPos - 512) * multiplier,
  };
}

/**
 * Check if tick indices overflow the default bitmap range.
 * If so, the extension bitmap must be used.
 */
function isOverflowDefaultTickarrayBitmap(tickSpacing: number, tickIndices: number[]): boolean {
  const ticksInOneBitmap = tickSpacing * TICK_ARRAY_SIZE * TICK_ARRAY_BITMAP_SIZE;
  const maxTickBoundary = ticksInOneBitmap;
  const minTickBoundary = -maxTickBoundary;

  for (const tickIndex of tickIndices) {
    const tickArrayStartIndex = getTickArrayStartIndexForTick(tickIndex, tickSpacing);
    if (tickArrayStartIndex >= maxTickBoundary || tickArrayStartIndex < minTickBoundary) {
      return true;
    }
  }
  return false;
}

/**
 * Get the offset index into the extension bitmap array for a given tick index.
 */
function getBitmapOffset(tickIndex: number, tickSpacing: number): number {
  const ticksInOneBitmap = tickSpacing * TICK_ARRAY_SIZE * TICK_ARRAY_BITMAP_SIZE;
  let offset = Math.floor(Math.abs(tickIndex) / ticksInOneBitmap) - 1;
  if (tickIndex < 0 && Math.abs(tickIndex) % ticksInOneBitmap === 0) offset--;
  return offset;
}

/**
 * Check if a tick array is initialized using the extension bitmap.
 * Used for tick arrays outside the default bitmap range.
 */
function checkTickArrayIsInitInExtension(
  tickArrayStartIndex: number,
  tickSpacing: number,
  exBitmapInfo: { positiveTickArrayBitmap: BN[][]; negativeTickArrayBitmap: BN[][] },
): { isInitialized: boolean; startIndex: number } {
  const offset = getBitmapOffset(tickArrayStartIndex, tickSpacing);
  const tickarrayBitmap = tickArrayStartIndex < 0
    ? exBitmapInfo.negativeTickArrayBitmap[offset]
    : exBitmapInfo.positiveTickArrayBitmap[offset];

  if (!tickarrayBitmap) {
    return { isInitialized: false, startIndex: tickArrayStartIndex };
  }

  const ticksInOneBitmap = tickSpacing * TICK_ARRAY_SIZE * TICK_ARRAY_BITMAP_SIZE;
  const tickArrayOffsetInBitmap = Math.floor(
    (Math.abs(tickArrayStartIndex) % ticksInOneBitmap) / (tickSpacing * TICK_ARRAY_SIZE),
  );

  const merged = mergeTickArrayBitmapToSingleBN(tickarrayBitmap);
  return {
    isInitialized: merged.testn(tickArrayOffsetInBitmap),
    startIndex: tickArrayStartIndex,
  };
}

/**
 * Check if a specific tick array start index is initialized, using
 * either the default bitmap or extension bitmap depending on range.
 */
function isTickArrayInitialized(
  tickArrayStartIndex: number,
  tickSpacing: number,
  poolBitmap: BN[],
  exBitmapInfo: { positiveTickArrayBitmap: BN[][]; negativeTickArrayBitmap: BN[][] },
): boolean {
  const isOverflow = isOverflowDefaultTickarrayBitmap(tickSpacing, [tickArrayStartIndex]);

  if (isOverflow) {
    const result = checkTickArrayIsInitInExtension(
      tickArrayStartIndex,
      tickSpacing,
      exBitmapInfo,
    );
    return result.isInitialized;
  } else {
    const merged = mergeTickArrayBitmapToSingleBN(poolBitmap);
    const result = checkTickArrayIsInitialized(merged, tickArrayStartIndex, tickSpacing);
    return result.isInitialized;
  }
}

interface FirstTickArrayResult {
  isExist: boolean;
  startIndex: number;
  nextAccountMeta?: PublicKey;
}

/**
 * Find the first initialized tick array, starting from the current tick's array.
 *
 * Algorithm (matches reference tick-array-sdk.ts):
 * 1. Check if the current tick's tick array is initialized in the bitmap.
 * 2. If yes, verify it exists on-chain and return it.
 * 3. If no, walk in the swap direction to find the next initialized one.
 */
async function findFirstInitializedTickArrayFromBitmap(
  connection: Connection,
  programId: PublicKey,
  poolId: PublicKey,
  poolState: {
    tickCurrent: number;
    tickSpacing: number;
    tickArrayBitmap: BN[];
    exBitmapInfo: { positiveTickArrayBitmap: BN[][]; negativeTickArrayBitmap: BN[][] };
  },
  zeroForOne: boolean,
): Promise<FirstTickArrayResult> {
  const currentStartIndex = getTickArrayStartIndexForTick(
    poolState.tickCurrent,
    poolState.tickSpacing,
  );

  // Step 1: Check if the current tick's array is initialized
  const isOverflow = isOverflowDefaultTickarrayBitmap(poolState.tickSpacing, [poolState.tickCurrent]);

  let isInit = false;
  let startIndex = currentStartIndex;

  if (isOverflow) {
    const result = checkTickArrayIsInitInExtension(
      currentStartIndex,
      poolState.tickSpacing,
      poolState.exBitmapInfo,
    );
    isInit = result.isInitialized;
    startIndex = result.startIndex;
  } else {
    const merged = mergeTickArrayBitmapToSingleBN(poolState.tickArrayBitmap);
    const result = checkTickArrayIsInitialized(merged, poolState.tickCurrent, poolState.tickSpacing);
    isInit = result.isInitialized;
    startIndex = result.startIndex;
  }

  if (isInit) {
    // Verify on-chain before returning
    const tickArrayAddr = deriveTickArray(programId, poolId, startIndex);
    const info = await connection.getAccountInfo(tickArrayAddr);
    if (info && info.owner.equals(programId)) {
      return {
        isExist: true,
        startIndex,
        nextAccountMeta: tickArrayAddr,
      };
    }
  }

  // Step 2: Walk in the swap direction to find the next initialized tick array
  const ticksPerArray = poolState.tickSpacing * TICK_ARRAY_SIZE;
  const maxSearchDistance = 20;
  let searchIndex = currentStartIndex;

  for (let i = 0; i < maxSearchDistance; i++) {
    searchIndex = zeroForOne
      ? searchIndex - ticksPerArray
      : searchIndex + ticksPerArray;

    if (searchIndex < MIN_TICK || searchIndex > MAX_TICK) break;

    const initCheck = isTickArrayInitialized(
      searchIndex,
      poolState.tickSpacing,
      poolState.tickArrayBitmap,
      poolState.exBitmapInfo,
    );

    if (initCheck) {
      // Verify on-chain
      const tickArrayAddr = deriveTickArray(programId, poolId, searchIndex);
      const info = await connection.getAccountInfo(tickArrayAddr);
      if (info && info.owner.equals(programId)) {
        return {
          isExist: true,
          startIndex: searchIndex,
          nextAccountMeta: tickArrayAddr,
        };
      }
    }
  }

  return { isExist: false, startIndex: currentStartIndex };
}

// Brute-force fallback: check account existence directly
async function findFirstInitializedTickArrayBruteForce(
  connection: Connection,
  programId: PublicKey,
  poolId: PublicKey,
  tickCurrent: number,
  tickSpacing: number,
  zeroForOne: boolean,
): Promise<FirstTickArrayResult> {
  const currentStartIndex = getTickArrayStartIndexForTick(tickCurrent, tickSpacing);
  const maxSearch = 10;

  // Search in primary direction
  let searchIndex = currentStartIndex;
  for (let i = 0; i < maxSearch; i++) {
    const addr = deriveTickArray(programId, poolId, searchIndex);
    const info = await connection.getAccountInfo(addr);
    if (info && info.owner.equals(programId)) {
      return { isExist: true, startIndex: searchIndex, nextAccountMeta: addr };
    }
    searchIndex = getNextTickArrayStartIndex(searchIndex, tickSpacing, zeroForOne);
  }

  // Search in opposite direction
  searchIndex = getNextTickArrayStartIndex(currentStartIndex, tickSpacing, !zeroForOne);
  for (let i = 0; i < maxSearch; i++) {
    const addr = deriveTickArray(programId, poolId, searchIndex);
    const info = await connection.getAccountInfo(addr);
    if (info && info.owner.equals(programId)) {
      return { isExist: true, startIndex: searchIndex, nextAccountMeta: addr };
    }
    searchIndex = getNextTickArrayStartIndex(searchIndex, tickSpacing, !zeroForOne);
  }

  return { isExist: false, startIndex: currentStartIndex };
}

// ---------------------------------------------------------------------------
// Pool account derivation
// ---------------------------------------------------------------------------

interface ClmmPoolAccounts {
  poolId: PublicKey;
  ammConfig: PublicKey;
  poolState: PublicKey;
  observationState: PublicKey;
  tokenVault0: PublicKey;
  tokenVault1: PublicKey;
  tokenMint0: PublicKey;
  tokenMint1: PublicKey;
}

async function deriveClmmPoolAccounts(
  connection: Connection,
  poolId: PublicKey,
  programId: PublicKey,
): Promise<ClmmPoolAccounts> {
  const poolState = await fetchClmmPoolState(connection, poolId, programId);

  return {
    poolId,
    ammConfig: poolState.ammConfig,
    poolState: poolId,
    observationState: poolState.observationKey,
    tokenVault0: poolState.tokenVault0,
    tokenVault1: poolState.tokenVault1,
    tokenMint0: poolState.tokenMint0,
    tokenMint1: poolState.tokenMint1,
  };
}

// ---------------------------------------------------------------------------
// Swap IX builder
// ---------------------------------------------------------------------------

/**
 * Create a CLMM swap_v2 instruction.
 *
 * @param zeroForOne  - Swap direction: true = token0→token1, false = token1→token0.
 *                      Determines which vault is input/output.
 * @param isExactInput - true = `amount` is the exact input (typical case).
 *                       false = `amount` is the exact output desired.
 *                       For isExactInput=true,  otherAmountThreshold = min output (0 = unlimited).
 *                       For isExactInput=false, otherAmountThreshold = max input (u64::MAX = unlimited).
 */
function createClmmSwapIx(
  programId: PublicKey,
  poolAccounts: ClmmPoolAccounts,
  payer: PublicKey,
  inputTokenAccount: PublicKey,
  outputTokenAccount: PublicKey,
  amount: bigint,
  otherAmountThreshold: bigint,
  sqrtPriceLimitX64: BN,
  zeroForOne: boolean,
  isExactInput: boolean,
  tickArrays: PublicKey[],
  inputVaultMint: PublicKey,
  outputVaultMint: PublicKey,
  tickArrayBitmapExtension: PublicKey | null,
): TransactionInstruction {
  const inputVault = zeroForOne ? poolAccounts.tokenVault0 : poolAccounts.tokenVault1;
  const outputVault = zeroForOne ? poolAccounts.tokenVault1 : poolAccounts.tokenVault0;

  const accounts = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: poolAccounts.ammConfig, isSigner: false, isWritable: false },
    { pubkey: poolAccounts.poolState, isSigner: false, isWritable: true },
    { pubkey: inputTokenAccount, isSigner: false, isWritable: true },
    { pubkey: outputTokenAccount, isSigner: false, isWritable: true },
    { pubkey: inputVault, isSigner: false, isWritable: true },
    { pubkey: outputVault, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.observationState, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: inputVaultMint, isSigner: false, isWritable: false },
    { pubkey: outputVaultMint, isSigner: false, isWritable: false },
  ];

  // Remaining accounts: bitmap extension (only if exists on-chain) + tick arrays
  const remainingAccounts = [];
  if (tickArrayBitmapExtension) {
    remainingAccounts.push({
      pubkey: tickArrayBitmapExtension,
      isSigner: false,
      isWritable: true,
    });
  }
  for (const ta of tickArrays) {
    remainingAccounts.push({
      pubkey: ta,
      isSigner: false,
      isWritable: true,
    });
  }

  // Build instruction data (41 bytes)
  const data = Buffer.alloc(41);
  let off = 0;
  SWAP_V2_DISCRIMINATOR.copy(data, off);
  off += 8;
  data.writeBigUInt64LE(amount, off);
  off += 8;
  data.writeBigUInt64LE(otherAmountThreshold, off);
  off += 8;
  const sqrtPriceBytes = sqrtPriceLimitX64.toArrayLike(Buffer, "le", 16);
  sqrtPriceBytes.copy(data, off);
  off += 16;
  data.writeUInt8(isExactInput ? 1 : 0, off);

  return new TransactionInstruction({
    keys: [...accounts, ...remainingAccounts],
    programId,
    data,
  });
}

// ---------------------------------------------------------------------------
// Token program detection
// ---------------------------------------------------------------------------

async function getTokenProgramForMint(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  return info.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

// ---------------------------------------------------------------------------
// Price calculation
// ---------------------------------------------------------------------------

function sqrtPriceX64ToPrice(sqrtPriceX64: BN, decimalsA: number, decimalsB: number): Decimal {
  return MathUtil.x64ToDecimal(sqrtPriceX64)
    .pow(2)
    .mul(Decimal.pow(10, decimalsA - decimalsB));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the sqrt price limit for a swap.
 * zeroForOne=true (price decreasing): limit = MIN_SQRT_PRICE_X64 + 1
 * zeroForOne=false (price increasing): limit = MAX_SQRT_PRICE_X64 - 1
 */
function computeSqrtPriceLimit(currentSqrtPrice: BN, zeroForOne: boolean): BN {
  if (zeroForOne) {
    const minPlusOne = MIN_SQRT_PRICE_X64.add(new BN(1));
    if (minPlusOne.lt(currentSqrtPrice)) {
      return minPlusOne;
    }
    const fallback = currentSqrtPrice.sub(new BN(1));
    if (fallback.lte(MIN_SQRT_PRICE_X64)) {
      return MIN_SQRT_PRICE_X64.add(new BN(1));
    }
    return fallback;
  } else {
    const maxMinusOne = MAX_SQRT_PRICE_X64.sub(new BN(1));
    if (maxMinusOne.gt(currentSqrtPrice)) {
      return maxMinusOne;
    }
    const fallback = currentSqrtPrice.add(new BN(1));
    if (fallback.gte(MAX_SQRT_PRICE_X64)) {
      return MAX_SQRT_PRICE_X64.sub(new BN(1));
    }
    return fallback;
  }
}

function quoteDecimals(quoteMintStr: string): number {
  return SIX_DECIMAL_MINTS.has(quoteMintStr) ? 6 : 9;
}

function amountToSmallestUnit(amount: number, quoteMintStr: string): bigint {
  const decimals = quoteDecimals(quoteMintStr);
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

// ---------------------------------------------------------------------------
// CLMM Base Adapter
// ---------------------------------------------------------------------------

export interface ClmmAdapterConfig {
  name: string;
  protocol: string;
  programId: PublicKey;
}

export class ClmmBaseAdapter implements IDexAdapter {
  readonly name: string;
  readonly protocol: string;
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    canSnipe: true,
    canFindPool: false, // Requires off-chain indexing or Raydium API
    canGetPrice: true,
  });

  private readonly programId: PublicKey;

  constructor(config: ClmmAdapterConfig) {
    this.name = config.name;
    this.protocol = config.protocol;
    this.programId = config.programId;
  }

  // ---- Core: buy ----

  async buy(params: BuyParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    if (!poolAddress) {
      throw new Error(`${this.name}: poolAddress is required (auto-discovery not yet supported)`);
    }

    const allIxs = await this.buildFullSwapTx(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
      wallet,
      opts,
    );

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, allIxs, wallet);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress,
    };
  }

  // ---- Core: sell ----

  async sell(params: SellParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { percentage, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    if (!poolAddress) {
      throw new Error(`${this.name}: poolAddress is required (auto-discovery not yet supported)`);
    }

    // 1. Get balance of the token being sold
    const baseMintPk = new PublicKey(tokenMint);
    const baseMintTokenProgram = await getTokenProgramForMint(connection, baseMintPk);
    const baseAta = await getAssociatedTokenAddress(
      baseMintPk,
      wallet.publicKey,
      false,
      baseMintTokenProgram,
    );

    let balance: { amount: bigint; decimals: number };
    try {
      const res = await connection.getTokenAccountBalance(baseAta);
      balance = { amount: BigInt(res.value.amount), decimals: res.value.decimals };
    } catch {
      balance = { amount: 0n, decimals: 0 };
    }

    // 2. Calculate sell amount from percentage
    const sellAmount = (balance.amount * BigInt(Math.floor(percentage))) / 100n;
    if (sellAmount === 0n) {
      return {
        txSignature: "",
        confirmed: false,
        amountIn: 0,
        amountInToken: tokenMint,
        dex: this.name,
        poolAddress,
      };
    }

    // 3. Build swap IXs with reversed direction: tokenMint is now the input
    const allIxs = await this.buildFullSellTx(
      tokenMint,
      sellAmount,
      quoteMintStr,
      poolAddress,
      wallet,
      opts,
    );

    // 4. Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, allIxs, wallet);

    const humanSellAmount = Number(sellAmount) / 10 ** balance.decimals;
    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: humanSellAmount,
      amountInToken: tokenMint,
      dex: this.name,
      poolAddress,
    };
  }

  // ---- Snipe ----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, quoteMint: quoteMintParam, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    const allIxs = await this.buildFullSwapTx(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
      wallet,
      opts,
    );

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(allIxs, wallet, blockhash, {
      dex: this.name,
      operation: "snipe",
      tipSol,
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress,
    };
  }

  // ---- buildSwapIxs ----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    const tokenMint = requireTokenMint(params, this.name);
    if ("percentage" in params) {
      // Sell path
      const { percentage, quoteMint: quoteMintParam, poolAddress } = params;
      const quoteMintStr = quoteMintParam ?? WSOL_MINT;
      if (!poolAddress) {
        throw new Error(`${this.name}: poolAddress is required for buildSwapIxs`);
      }

      const connection = getConnection();
      const wallet = getWallet();
      const baseMintPk = new PublicKey(tokenMint);
      const baseMintTokenProgram = await getTokenProgramForMint(connection, baseMintPk);
      const baseAta = await getAssociatedTokenAddress(
        baseMintPk,
        wallet.publicKey,
        false,
        baseMintTokenProgram,
      );

      let balance: { amount: bigint; decimals: number };
      try {
        const res = await connection.getTokenAccountBalance(baseAta);
        balance = { amount: BigInt(res.value.amount), decimals: res.value.decimals };
      } catch {
        balance = { amount: 0n, decimals: 0 };
      }

      const sellAmount = (balance.amount * BigInt(Math.floor(percentage))) / 100n;
      const sellAmountHuman = Number(sellAmount) / 10 ** balance.decimals;

      // For sell: tokenMint is input, quoteMint is output
      // Pass tokenMint as "quoteMint" (input) and quoteMintStr as "tokenMint" (output)
      return this.doBuildSwapIxs(quoteMintStr, sellAmountHuman, tokenMint, poolAddress);
    }

    const { amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params as BuyParams;
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;
    if (!poolAddress) {
      throw new Error(`${this.name}: poolAddress is required for buildSwapIxs`);
    }

    return this.doBuildSwapIxs(tokenMint, amountSol, quoteMintStr, poolAddress);
  }

  // ---- findPool (stub) ----

  async findPool(baseMint: string, _quoteMint?: string): Promise<PoolInfo | null> {
    // CLMM pool discovery requires off-chain indexing or Raydium API.
    return null;
  }

  // ---- getPrice ----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolId = new PublicKey(poolAddress);
    const poolState = await fetchClmmPoolState(connection, poolId, this.programId);

    const price = sqrtPriceX64ToPrice(
      poolState.sqrtPriceX64,
      poolState.mintDecimals0,
      poolState.mintDecimals1,
    );
    let realPrice = Number(price.toString());
    if (realPrice > 1) realPrice = 1 / realPrice;

    return {
      price: realPrice,
      baseMint: poolState.tokenMint0.toBase58(),
      quoteMint: poolState.tokenMint1.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }

  // ---- Internal: resolve tick arrays for swap ----

  private async resolveTickArrays(
    connection: Connection,
    poolId: PublicKey,
    poolState: ClmmPoolState,
    exBitmapInfo: ExBitmapInfo,
    zeroForOne: boolean,
  ): Promise<{ tickArrays: PublicKey[]; firstResult: FirstTickArrayResult }> {
    let firstResult = await findFirstInitializedTickArrayFromBitmap(
      connection,
      this.programId,
      poolId,
      {
        tickCurrent: poolState.tickCurrent,
        tickSpacing: poolState.tickSpacing,
        tickArrayBitmap: poolState.tickArrayBitmap,
        exBitmapInfo: {
          positiveTickArrayBitmap: exBitmapInfo.positiveTickArrayBitmap,
          negativeTickArrayBitmap: exBitmapInfo.negativeTickArrayBitmap,
        },
      },
      zeroForOne,
    );

    // Brute-force fallback if bitmap search fails
    if (!firstResult.isExist) {
      firstResult = await findFirstInitializedTickArrayBruteForce(
        connection,
        this.programId,
        poolId,
        poolState.tickCurrent,
        poolState.tickSpacing,
        zeroForOne,
      );
    }

    if (!firstResult.isExist || !firstResult.nextAccountMeta) {
      throw new Error(
        `No initialized tick array found for pool ${poolId.toBase58()}. ` +
        `Current tick: ${poolState.tickCurrent}, Tick spacing: ${poolState.tickSpacing}`,
      );
    }

    // Build tick array list (up to 4)
    const tickArrays: PublicKey[] = [firstResult.nextAccountMeta];
    let currentStartIndex = firstResult.startIndex;
    for (let i = 1; i < 4; i++) {
      currentStartIndex = getNextTickArrayStartIndex(
        currentStartIndex,
        poolState.tickSpacing,
        zeroForOne,
      );
      const addr = deriveTickArray(this.programId, poolId, currentStartIndex);
      const info = await connection.getAccountInfo(addr);
      if (info && info.owner.equals(this.programId)) {
        tickArrays.push(addr);
      } else {
        break;
      }
    }

    return { tickArrays, firstResult };
  }

  // ---- Internal: build raw swap instructions ----

  private async doBuildSwapIxs(
    tokenMint: string,
    amountSol: number,
    quoteMintStr: string,
    poolAddress: string,
  ): Promise<BuildSwapIxsResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const poolId = new PublicKey(poolAddress);
    const baseMint = new PublicKey(tokenMint);
    const quoteMint = new PublicKey(quoteMintStr);

    // 1. Derive pool accounts
    const poolAccounts = await deriveClmmPoolAccounts(connection, poolId, this.programId);

    // 2. Fetch pool state
    const poolState = await fetchClmmPoolState(connection, poolId, this.programId);

    // 3. Determine swap direction
    // inputMint is what we're spending (quoteMint), outputMint is what we're receiving (baseMint)
    const inputMint = quoteMint;
    const outputMint = baseMint;
    // zeroForOne = true means token0→token1 (price decreasing)
    // zeroForOne = false means token1→token0 (price increasing)
    const zeroForOne = poolState.tokenMint0.equals(inputMint);

    // 4. Calculate amount
    const amountIn = amountToSmallestUnit(amountSol, quoteMintStr);

    // 5. Sqrt price limit
    const sqrtPriceLimitX64 = computeSqrtPriceLimit(poolState.sqrtPriceX64, zeroForOne);

    // 6. Get bitmap extension
    const exBitmapInfo = await getTickArrayBitmapExtension(
      this.programId,
      poolId,
      connection,
    );

    // 7. Find initialized tick arrays
    const { tickArrays } = await this.resolveTickArrays(
      connection,
      poolId,
      poolState,
      exBitmapInfo,
      zeroForOne,
    );

    // 8. Get user ATAs
    const inputMintTokenProgram = await getTokenProgramForMint(connection, inputMint);
    const outputMintTokenProgram = await getTokenProgramForMint(connection, outputMint);

    const inputAta = await getAssociatedTokenAddress(
      inputMint,
      wallet.publicKey,
      false,
      inputMintTokenProgram,
    );
    const outputAta = await getAssociatedTokenAddress(
      outputMint,
      wallet.publicKey,
      false,
      outputMintTokenProgram,
    );

    // 9. Build swap IX (always exact-input mode: is_base_input=true, threshold=0)
    const inputVaultMint = zeroForOne ? poolState.tokenMint0 : poolState.tokenMint1;
    const outputVaultMint = zeroForOne ? poolState.tokenMint1 : poolState.tokenMint0;

    const swapIx = createClmmSwapIx(
      this.programId,
      poolAccounts,
      wallet.publicKey,
      inputAta,
      outputAta,
      amountIn,
      BigInt(0), // min output = 0 (unlimited slippage)
      sqrtPriceLimitX64,
      zeroForOne,
      true, // isExactInput = true (amount is the input amount)
      tickArrays,
      inputVaultMint,
      outputVaultMint,
      exBitmapInfo.exists ? exBitmapInfo.exBitmapAddress : null,
    );

    // 10. Create ATA instructions
    const createInputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      inputAta,
      wallet.publicKey,
      inputMint,
      inputMintTokenProgram,
    );
    const createOutputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      outputAta,
      wallet.publicKey,
      outputMint,
      outputMintTokenProgram,
    );

    return {
      instructions: [createInputAtaIx, createOutputAtaIx, swapIx],
      signers: [],
    };
  }

  // ---- Internal: full transaction with WSOL wrapping + compute budget ----

  private async buildFullSwapTx(
    tokenMint: string,
    amountSol: number,
    quoteMintStr: string,
    poolAddress: string,
    wallet: Keypair,
    opts?: BuyParams["opts"],
  ): Promise<TransactionInstruction[]> {
    const { instructions: swapIxs } = await this.doBuildSwapIxs(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
    );

    const cuPrice = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const cuLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const isWSol = quoteMintStr === WSOL_MINT;

    const preIxs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
    ];

    if (isWSol) {
      const quoteMintPk = new PublicKey(quoteMintStr);
      const inputAta = await getAssociatedTokenAddress(
        quoteMintPk,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
      );
      const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

      preIxs.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: inputAta,
          lamports: amountLamports,
        }),
        createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID),
      );

      const closeIx = createCloseAccountInstruction(
        inputAta,
        wallet.publicKey,
        wallet.publicKey,
        [],
        TOKEN_PROGRAM_ID,
      );

      return [...preIxs, ...swapIxs, closeIx];
    }

    return [...preIxs, ...swapIxs];
  }

  // ---- Internal: full sell transaction with WSOL output handling + compute budget ----

  private async buildFullSellTx(
    tokenMint: string,
    sellAmount: bigint,
    quoteMintStr: string,
    poolAddress: string,
    wallet: Keypair,
    opts?: SellParams["opts"],
  ): Promise<TransactionInstruction[]> {
    // For sell, the input is tokenMint and the output is quoteMint.
    // We build swap IXs directly using the raw sell amount (bigint) to avoid
    // decimal rounding issues with quoteDecimals().
    const connection = getConnection();
    const poolId = new PublicKey(poolAddress);
    const baseMint = new PublicKey(tokenMint);
    const quoteMint = new PublicKey(quoteMintStr);

    // 1. Derive pool accounts
    const poolAccounts = await deriveClmmPoolAccounts(connection, poolId, this.programId);

    // 2. Fetch pool state
    const poolState = await fetchClmmPoolState(connection, poolId, this.programId);

    // 3. For sell: input is baseMint (token being sold), output is quoteMint
    const inputMint = baseMint;
    const outputMint = quoteMint;
    // zeroForOne = true means token0→token1. For sell, input is the token.
    const zeroForOne = poolState.tokenMint0.equals(inputMint);

    // 4. Sqrt price limit
    const sqrtPriceLimitX64 = computeSqrtPriceLimit(poolState.sqrtPriceX64, zeroForOne);

    // 5. Get bitmap extension
    const exBitmapInfo = await getTickArrayBitmapExtension(
      this.programId,
      poolId,
      connection,
    );

    // 6. Find initialized tick arrays
    const { tickArrays } = await this.resolveTickArrays(
      connection,
      poolId,
      poolState,
      exBitmapInfo,
      zeroForOne,
    );

    // 7. Get user ATAs
    const inputMintTokenProgram = await getTokenProgramForMint(connection, inputMint);
    const outputMintTokenProgram = await getTokenProgramForMint(connection, outputMint);

    const inputAta = await getAssociatedTokenAddress(
      inputMint,
      wallet.publicKey,
      false,
      inputMintTokenProgram,
    );
    const outputAta = await getAssociatedTokenAddress(
      outputMint,
      wallet.publicKey,
      false,
      outputMintTokenProgram,
    );

    // 8. Build swap IX (always exact-input mode: is_base_input=true, threshold=0)
    const inputVaultMint = zeroForOne ? poolState.tokenMint0 : poolState.tokenMint1;
    const outputVaultMint = zeroForOne ? poolState.tokenMint1 : poolState.tokenMint0;

    const swapIx = createClmmSwapIx(
      this.programId,
      poolAccounts,
      wallet.publicKey,
      inputAta,
      outputAta,
      BigInt(sellAmount.toString()),
      BigInt(0), // min output = 0 (unlimited slippage)
      sqrtPriceLimitX64,
      zeroForOne,
      true, // isExactInput = true (amount is the input amount)
      tickArrays,
      inputVaultMint,
      outputVaultMint,
      exBitmapInfo.exists ? exBitmapInfo.exBitmapAddress : null,
    );

    // 9. Compose full transaction
    const cuPrice = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const cuLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const isWsolOutput = quoteMintStr === WSOL_MINT;

    const preIxs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
    ];

    // Create ATAs idempotently
    const createInputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      inputAta,
      wallet.publicKey,
      inputMint,
      inputMintTokenProgram,
    );
    const createOutputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      outputAta,
      wallet.publicKey,
      outputMint,
      outputMintTokenProgram,
    );

    if (isWsolOutput) {
      // For sell to WSOL: create output WSOL ATA, swap, then close to unwrap SOL
      const closeIx = createCloseAccountInstruction(
        outputAta,
        wallet.publicKey,
        wallet.publicKey,
        [],
        TOKEN_PROGRAM_ID,
      );

      return [...preIxs, createInputAtaIx, createOutputAtaIx, swapIx, closeIx];
    }

    return [...preIxs, createInputAtaIx, createOutputAtaIx, swapIx];
  }
}
