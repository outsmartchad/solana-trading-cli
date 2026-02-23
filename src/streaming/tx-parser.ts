/**
 * Event Streaming Engine — Transaction Parser.
 *
 * Parses formatted transactions into typed stream events (NewPool, Swap, etc.)
 * Uses instruction discriminator matching + pre/post token balance diffing.
 *
 * Written fresh — inspired by patterns from 100x-algo-bots but no code porting.
 * All parsers are protocol-aware and handle both outer and inner (CPI) instructions.
 */

import { PublicKey } from "@solana/web3.js";
import type {
  FormattedTransaction,
  FormattedInstruction,
  TokenBalance,
} from "./tx-formatter";
import type {
  ParsedSwapData,
  ParsedNewPoolData,
  StreamEvent,
  SwapEvent,
  NewPoolEvent,
  BondingCompleteEvent,
} from "./types";
import {
  PROGRAM_TO_DEX,
  PUMP_SWAP_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_AMM_V4_PROGRAM_ID,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
  METEORA_DBC_PROGRAM_ID,
  METEORA_DAMM_V1_PROGRAM_ID,
  ORCA_WHIRLPOOLS_PROGRAM_ID,
  PANCAKE_SWAP_PROGRAM_ID,
  BYREAL_PROGRAM_ID,
  FUSION_AMM_PROGRAM_ID,
  FUTARCHY_AMM_PROGRAM_ID,
  JUP_SWAP_PROGRAM_ID,
  WSOL_MINT,
} from "./programs";
import {
  matchDiscriminator,
  getDiscriminatorHex,
  readU64LE,
  PUMPSWAP_BUY,
  PUMPSWAP_SELL,
  PUMPSWAP_CREATE_POOL_HEX,
  PUMPFUN_BUY,
  PUMPFUN_BUY_EXACT_SOL_IN,
  PUMPFUN_SELL,
  PUMPFUN_CREATE,
  PUMPFUN_CREATE_V2,
} from "./discriminators";

// ---------------------------------------------------------------------------
// Main parser entry point
// ---------------------------------------------------------------------------

/**
 * Parse a formatted transaction into zero or more stream events.
 *
 * A single transaction can produce multiple events (e.g., a Jupiter route
 * that swaps through multiple DEX programs).
 */
export function parseTransaction(tx: FormattedTransaction): StreamEvent[] {
  const events: StreamEvent[] = [];

  // Identify which DEX programs are involved
  const dexPrograms = new Set<string>();
  let isAggregated = false;

  for (const ix of tx.outerInstructions) {
    if (ix.programId in PROGRAM_TO_DEX) {
      dexPrograms.add(ix.programId);
    }
    if (ix.programId === JUP_SWAP_PROGRAM_ID) {
      isAggregated = true;
    }
  }

  // Also check inner instructions for CPI calls
  for (const group of tx.innerInstructions) {
    for (const ix of group.instructions) {
      if (ix.programId in PROGRAM_TO_DEX) {
        dexPrograms.add(ix.programId);
      }
      if (ix.programId === JUP_SWAP_PROGRAM_ID) {
        isAggregated = true;
      }
    }
  }

  // Parse each DEX program found in the transaction
  for (const programId of dexPrograms) {
    const parsed = parseDexInstructions(programId, tx, isAggregated);
    events.push(...parsed);
  }

  return events;
}

// ---------------------------------------------------------------------------
// Per-DEX instruction parsing dispatcher
// ---------------------------------------------------------------------------

function parseDexInstructions(
  programId: string,
  tx: FormattedTransaction,
  isAggregated: boolean,
): StreamEvent[] {
  switch (programId) {
    case PUMP_SWAP_PROGRAM_ID:
      return parsePumpSwapTx(tx, isAggregated);
    case PUMP_FUN_PROGRAM_ID:
      return parsePumpFunTx(tx);
    case RAYDIUM_CPMM_PROGRAM_ID:
    case RAYDIUM_CLMM_PROGRAM_ID:
    case RAYDIUM_AMM_V4_PROGRAM_ID:
    case RAYDIUM_LAUNCHLAB_PROGRAM_ID:
      return parseRaydiumTx(programId, tx, isAggregated);
    case METEORA_DAMM_V2_PROGRAM_ID:
    case METEORA_DLMM_PROGRAM_ID:
    case METEORA_DBC_PROGRAM_ID:
    case METEORA_DAMM_V1_PROGRAM_ID:
      return parseMeteoraTx(programId, tx, isAggregated);
    case ORCA_WHIRLPOOLS_PROGRAM_ID:
    case PANCAKE_SWAP_PROGRAM_ID:
    case BYREAL_PROGRAM_ID:
    case FUSION_AMM_PROGRAM_ID:
    case FUTARCHY_AMM_PROGRAM_ID:
      return parseGenericClmmTx(programId, tx, isAggregated);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// PumpSwap parser
// ---------------------------------------------------------------------------

function parsePumpSwapTx(tx: FormattedTransaction, isAggregated: boolean): StreamEvent[] {
  const events: StreamEvent[] = [];
  const dex = "pumpswap";

  // Determine instruction type from outer instructions first (native PumpSwap calls)
  let outerInstructionType: "buy" | "sell" | null = null;
  for (const ix of tx.outerInstructions) {
    if (ix.programId === PUMP_SWAP_PROGRAM_ID && ix.data.length >= 8) {
      if (matchDiscriminator(ix.data, PUMPSWAP_BUY)) outerInstructionType = "buy";
      else if (matchDiscriminator(ix.data, PUMPSWAP_SELL)) outerInstructionType = "sell";
    }
  }

  // Process inner instructions SEQUENTIALLY within each group.
  // Pattern: a short instruction (≥8 bytes, <300) with buy/sell discriminator
  // is followed by a long instruction (≥320 bytes) with the event data.
  // Each discriminator applies to the NEXT 320-byte event in the same group.
  for (const group of tx.innerInstructions) {
    // Track the most recently seen buy/sell discriminator within this group
    let currentDirection: "buy" | "sell" | null = outerInstructionType;

    for (const ix of group.instructions) {
      if (ix.programId !== PUMP_SWAP_PROGRAM_ID) continue;

      const hexPrefix = getDiscriminatorHex(ix.data);

      // CreatePool detection
      if (hexPrefix === PUMPSWAP_CREATE_POOL_HEX) {
        const poolEvent = parsePumpSwapCreatePool(ix, tx);
        if (poolEvent) events.push(poolEvent);
        continue;
      }

      // Short instruction with buy/sell discriminator — remember it for the next event
      if (ix.data.length >= 8 && ix.data.length < 300) {
        if (matchDiscriminator(ix.data, PUMPSWAP_BUY)) currentDirection = "buy";
        else if (matchDiscriminator(ix.data, PUMPSWAP_SELL)) currentDirection = "sell";
        continue;
      }

      // Long instruction (≥320 bytes) — this is the event data, pair with currentDirection
      if (ix.data.length >= 300) {
        const swapEvent = parsePumpSwapInnerSwap(ix, tx, dex, isAggregated, currentDirection ?? "buy");
        if (swapEvent) events.push(swapEvent);
        // Reset direction after consuming — next event needs its own discriminator
        // (unless it's a native call where outer ix applies to all)
        if (!outerInstructionType) currentDirection = null;
      }
    }
  }

  return events;
}

function parsePumpSwapCreatePool(
  ix: FormattedInstruction,
  tx: FormattedTransaction,
): NewPoolEvent | null {
  try {
    // PumpSwap CreatePool account layout:
    // [0] = pool, [3] = baseMint, [4] = quoteMint, [9] = baseVault, [10] = quoteVault
    const accountIndices = ix.accounts;
    if (accountIndices.length < 11) return null;

    const pool = tx.accountList[accountIndices[0]]?.toBase58() ?? "";
    const baseMint = tx.accountList[accountIndices[3]]?.toBase58() ?? "";
    const quoteMint = tx.accountList[accountIndices[4]]?.toBase58() ?? "";
    const baseVault = tx.accountList[accountIndices[9]]?.toBase58() ?? "";
    const quoteVault = tx.accountList[accountIndices[10]]?.toBase58() ?? "";

    // Get initial reserves from post token balances
    let reserveA = 0, reserveB = 0;
    for (const bal of tx.postTokenBalances) {
      const addr = tx.accountList[bal.accountIndex]?.toBase58();
      if (addr === baseVault) reserveA = bal.uiAmount;
      if (addr === quoteVault) reserveB = bal.uiAmount;
    }

    return {
      type: "NewPool",
      dex: "pumpswap",
      pool,
      tokenA: baseMint,
      tokenB: quoteMint,
      initialReserveA: reserveA,
      initialReserveB: reserveB,
      creator: tx.signer,
      signature: tx.signature,
      slot: tx.slot,
      timestamp: tx.timestamp,
    };
  } catch {
    return null;
  }
}

function parsePumpSwapInnerSwap(
  ix: FormattedInstruction,
  tx: FormattedTransaction,
  dex: string,
  isAggregated: boolean,
  direction: "buy" | "sell",
): SwapEvent | null {
  try {
    const data = ix.data;
    if (data.length < 300) return null;

    // Extract pool and trader from the event data pubkeys (these offsets are stable)
    let poolAddr = "";
    let trader = "";
    try {
      poolAddr = new PublicKey(data.slice(128, 160)).toBase58();
      trader = new PublicKey(data.slice(160, 192)).toBase58();
    } catch { /* fallback below */ }
    if (!poolAddr) poolAddr = "";
    if (!trader) trader = tx.signer;

    // ---------------------------------------------------------------------------
    // Use pre/post token balance diff approach (same as Meteora parser).
    // This is reliable regardless of instruction data layout variations because
    // uiAmount is already decimal-adjusted by the runtime.
    // ---------------------------------------------------------------------------

    // Build pre/post maps keyed by (owner, mint) → uiAmount
    const preByOwnerMint = new Map<string, number>();
    const postByOwnerMint = new Map<string, number>();
    const decimalsByMint = new Map<string, number>();

    for (const bal of tx.preTokenBalances) {
      if (bal.owner === poolAddr) {
        preByOwnerMint.set(bal.mint, bal.uiAmount);
        decimalsByMint.set(bal.mint, bal.decimals);
      }
    }
    for (const bal of tx.postTokenBalances) {
      if (bal.owner === poolAddr) {
        postByOwnerMint.set(bal.mint, bal.uiAmount);
        decimalsByMint.set(bal.mint, bal.decimals);
      }
    }

    // Find the non-WSOL mint (the "token" being traded) and compute diffs
    let mint = "";
    let solDiff = 0;   // positive = pool gained SOL
    let tokenDiff = 0; // positive = pool gained tokens
    let reserveQuote = 0;
    let reserveBase = 0;

    for (const m of new Set([...preByOwnerMint.keys(), ...postByOwnerMint.keys()])) {
      const pre = preByOwnerMint.get(m) ?? 0;
      const post = postByOwnerMint.get(m) ?? 0;
      const diff = post - pre;

      if (m === WSOL_MINT) {
        solDiff = diff;
        reserveQuote = post;
      } else {
        mint = m;
        tokenDiff = diff;
        reserveBase = post;
      }
    }

    // Determine direction from balance diffs (override discriminator if clear)
    // Pool gained tokens + lost SOL = SELL (user sold tokens for SOL)
    // Pool lost tokens + gained SOL = BUY (user bought tokens with SOL)
    if (tokenDiff > 0 && solDiff < 0) {
      direction = "sell";
    } else if (tokenDiff < 0 && solDiff > 0) {
      direction = "buy";
    }
    // If diffs are ambiguous (e.g., multi-swap same pool), keep discriminator-based direction

    const solAmount = Math.abs(solDiff);
    const tokenAmount = Math.abs(tokenDiff);

    // Skip if we couldn't determine the swap
    if (!mint || (solAmount === 0 && tokenAmount === 0)) return null;

    const priceAfter = reserveBase > 0 ? reserveQuote / reserveBase : 0;

    return {
      type: "Swap",
      dex,
      pool: poolAddr,
      trader,
      direction,
      mint,
      // BUY:  amountIn = SOL spent, amountOut = tokens received
      // SELL: amountIn = tokens spent, amountOut = SOL received
      amountIn: direction === "buy" ? solAmount : tokenAmount,
      amountOut: direction === "buy" ? tokenAmount : solAmount,
      priceAfter,
      reserveBase,
      reserveQuote,
      signature: tx.signature,
      slot: tx.slot,
      timestamp: tx.timestamp,
      isAggregated,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PumpFun bonding curve parser
// ---------------------------------------------------------------------------

function parsePumpFunTx(tx: FormattedTransaction): StreamEvent[] {
  const events: StreamEvent[] = [];
  const dex = "pumpfun";

  // Check log messages for "Program log: Complete" which indicates bonding curve graduation
  const hasComplete = tx.logMessages.some(
    (log) => log.includes("Program log: Complete") || log.includes("CompleteEvent"),
  );

  if (hasComplete) {
    let mint = "";
    let bondingCurve = "";
    let migrationPool = "";

    for (const ix of tx.outerInstructions) {
      if (ix.programId === PUMP_FUN_PROGRAM_ID && ix.accounts.length >= 4) {
        mint = tx.accountList[ix.accounts[2]]?.toBase58() ?? "";
        bondingCurve = tx.accountList[ix.accounts[3]]?.toBase58() ?? "";
      }
    }

    for (const group of tx.innerInstructions) {
      for (const ix of group.instructions) {
        if (
          ix.programId === RAYDIUM_AMM_V4_PROGRAM_ID ||
          ix.programId === RAYDIUM_CPMM_PROGRAM_ID
        ) {
          if (ix.accounts.length > 0) {
            migrationPool = tx.accountList[ix.accounts[0]]?.toBase58() ?? "";
          }
        }
      }
    }

    if (mint) {
      events.push({
        type: "BondingComplete",
        mint,
        bondingCurve,
        migrationPool,
        signature: tx.signature,
        slot: tx.slot,
        timestamp: tx.timestamp,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Parse PumpFun buy/sell swaps using balance-diff approach.
  // PumpFun bonding curve swaps: the bonding curve account owns the token vaults.
  // Detect direction from discriminator, amounts from pre/post token balance diffs.
  // ---------------------------------------------------------------------------

  // Collect all PumpFun instructions (outer + inner CPI)
  const allIxs = collectProgramInstructions(PUMP_FUN_PROGRAM_ID, tx);

  for (const ix of allIxs) {
    if (ix.data.length < 8) continue;

    const isBuy = matchDiscriminator(ix.data, PUMPFUN_BUY) || matchDiscriminator(ix.data, PUMPFUN_BUY_EXACT_SOL_IN);
    const isSell = matchDiscriminator(ix.data, PUMPFUN_SELL);
    const isCreate = matchDiscriminator(ix.data, PUMPFUN_CREATE) || matchDiscriminator(ix.data, PUMPFUN_CREATE_V2);

    // PumpFun Create / CreateV2 — new coin launched on bonding curve
    if (isCreate) {
      // CreateV2 account layout (16 accounts):
      //   [0] = mint, [1] = bondingCurve, [2] = bondingCurveTokenAccount,
      //   [3] = bondingCurveVaultAuthority, [4] = global, [5] = mplTokenMetadata,
      //   [6] = metadata, [7] = user (creator), ...
      // Legacy Create layout:
      //   [0] = mint, [1] = mintAuthority, [2] = bondingCurve,
      //   [3] = bondingCurveTokenAccount, ... [7] = user (creator)
      // Both have mint at [0] and creator at [7]
      if (ix.accounts.length >= 8) {
        const mintAddr = tx.accountList[ix.accounts[0]]?.toBase58() ?? "";
        // bondingCurve is at [1] for CreateV2, [2] for legacy Create
        const isV2 = matchDiscriminator(ix.data, PUMPFUN_CREATE_V2);
        const bondingCurve = tx.accountList[ix.accounts[isV2 ? 1 : 2]]?.toBase58() ?? "";
        const creator = tx.accountList[ix.accounts[7]]?.toBase58() ?? tx.signer;

        events.push({
          type: "NewPool",
          dex,
          pool: bondingCurve,
          tokenA: mintAddr,
          tokenB: WSOL_MINT,
          initialReserveA: 0,
          initialReserveB: 0,
          creator,
          signature: tx.signature,
          slot: tx.slot,
          timestamp: tx.timestamp,
        });
      }
      continue;
    }

    if (!isBuy && !isSell) continue;

    // PumpFun buy/sell account layout:
    //   [0] = global config, [1] = feeRecipient, [2] = mint, [3] = bondingCurve,
    //   [4] = bondingCurveTokenAccount, [5] = associatedUser, [6] = user, ...
    if (ix.accounts.length < 7) continue;

    const bondingCurveAddr = tx.accountList[ix.accounts[3]]?.toBase58() ?? "";
    const trader = tx.accountList[ix.accounts[6]]?.toBase58() ?? tx.signer;
    const mintAddr = tx.accountList[ix.accounts[2]]?.toBase58() ?? "";

    // Get bonding curve vault addresses for balance matching
    const bondingCurveTokenAcct = tx.accountList[ix.accounts[4]]?.toBase58() ?? "";

    // Diff pre/post balances for the bonding curve's vaults by account address
    let solBefore = 0, solAfter = 0, tokenBefore = 0, tokenAfter = 0;
    let reserveQuote = 0, reserveBase = 0;

    for (const bal of tx.preTokenBalances) {
      const acctAddr = tx.accountList[bal.accountIndex]?.toBase58() ?? "";
      if (acctAddr === bondingCurveTokenAcct) {
        tokenBefore = bal.uiAmount;
      }
    }
    for (const bal of tx.postTokenBalances) {
      const acctAddr = tx.accountList[bal.accountIndex]?.toBase58() ?? "";
      if (acctAddr === bondingCurveTokenAcct) {
        tokenAfter = bal.uiAmount;
        reserveBase = bal.uiAmount;
      }
    }

    // For SOL, use native lamport balances on the bonding curve account
    const bcIndex = ix.accounts[3];
    if (bcIndex < tx.preBalances.length) {
      solBefore = tx.preBalances[bcIndex] / 1e9;
      solAfter = tx.postBalances[bcIndex] / 1e9;
      reserveQuote = solAfter;
    }

    const tokenDiff = tokenAfter - tokenBefore; // negative = pool lost tokens (buy)
    const solDiff = solAfter - solBefore;         // positive = pool gained SOL (buy)

    // Determine direction from balance diffs (override discriminator if clear)
    let direction: "buy" | "sell" = isBuy ? "buy" : "sell";
    if (tokenDiff > 0 && solDiff < 0) direction = "sell";
    else if (tokenDiff < 0 && solDiff > 0) direction = "buy";

    const solAmount = Math.abs(solDiff);
    const tokenAmount = Math.abs(tokenDiff);

    if (solAmount === 0 && tokenAmount === 0) continue;

    const priceAfter = reserveBase > 0 ? reserveQuote / reserveBase : 0;

    events.push({
      type: "Swap",
      dex,
      pool: bondingCurveAddr,
      trader,
      direction,
      mint: mintAddr,
      amountIn: direction === "buy" ? solAmount : tokenAmount,
      amountOut: direction === "buy" ? tokenAmount : solAmount,
      priceAfter,
      reserveBase,
      reserveQuote,
      signature: tx.signature,
      slot: tx.slot,
      timestamp: tx.timestamp,
      isAggregated: false,
    });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Raydium parser (all 4 protocols)
// ---------------------------------------------------------------------------

function parseRaydiumTx(
  programId: string,
  tx: FormattedTransaction,
  isAggregated: boolean,
): StreamEvent[] {
  const events: StreamEvent[] = [];
  const dex = PROGRAM_TO_DEX[programId] ?? "raydium";

  // Scan all instructions (outer + inner) for this program
  const allIxs = collectProgramInstructions(programId, tx);

  for (const ix of allIxs) {
    const hexPrefix = getDiscriminatorHex(ix.data);

    // Create pool detection
    if (isCreatePoolInstruction(programId, ix, hexPrefix)) {
      const poolEvent = parseGenericCreatePool(dex, ix, tx);
      if (poolEvent) events.push(poolEvent);
      continue;
    }

    // Swap detection via pre/post balance diffing
    if (isSwapInstruction(programId, ix, hexPrefix)) {
      const swapEvent = parseSwapFromBalanceDiff(dex, ix, tx, isAggregated);
      if (swapEvent) events.push(swapEvent);
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Meteora parser (all 4 protocols)
// ---------------------------------------------------------------------------

function parseMeteoraTx(
  programId: string,
  tx: FormattedTransaction,
  isAggregated: boolean,
): StreamEvent[] {
  const events: StreamEvent[] = [];
  const dex = PROGRAM_TO_DEX[programId] ?? "meteora";

  const allIxs = collectProgramInstructions(programId, tx);

  for (const ix of allIxs) {
    const hexPrefix = getDiscriminatorHex(ix.data);

    if (isCreatePoolInstruction(programId, ix, hexPrefix)) {
      const poolEvent = parseGenericCreatePool(dex, ix, tx);
      if (poolEvent) events.push(poolEvent);
      continue;
    }

    if (isSwapInstruction(programId, ix, hexPrefix)) {
      const swapEvent = parseSwapFromBalanceDiff(dex, ix, tx, isAggregated);
      if (swapEvent) events.push(swapEvent);
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Generic CLMM parser (Orca, Pancakeswap, Byreal, Fusion, Futarchy)
// ---------------------------------------------------------------------------

function parseGenericClmmTx(
  programId: string,
  tx: FormattedTransaction,
  isAggregated: boolean,
): StreamEvent[] {
  const events: StreamEvent[] = [];
  const dex = PROGRAM_TO_DEX[programId] ?? "unknown";

  const allIxs = collectProgramInstructions(programId, tx);

  for (const ix of allIxs) {
    const hexPrefix = getDiscriminatorHex(ix.data);

    if (isCreatePoolInstruction(programId, ix, hexPrefix)) {
      const poolEvent = parseGenericCreatePool(dex, ix, tx);
      if (poolEvent) events.push(poolEvent);
      continue;
    }

    if (isSwapInstruction(programId, ix, hexPrefix)) {
      const swapEvent = parseSwapFromBalanceDiff(dex, ix, tx, isAggregated);
      if (swapEvent) events.push(swapEvent);
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Universal swap parser using pre/post token balance diffing
// ---------------------------------------------------------------------------

/**
 * Parse a swap from pre/post token balance differences.
 * This is the universal technique — works across all DEXes including CPI.
 */
function parseSwapFromBalanceDiff(
  dex: string,
  ix: FormattedInstruction,
  tx: FormattedTransaction,
  isAggregated: boolean,
): SwapEvent | null {
  try {
    // Get the pool address (usually accounts[0] or accounts[1] depending on DEX)
    const pool = ix.accounts.length > 0
      ? tx.accountList[ix.accounts[0]]?.toBase58() ?? ""
      : "";

    // Diff token balances for the pool's vaults
    // Find which token balances belong to the pool (owner == pool)
    const preByMint = new Map<string, number>();
    const postByMint = new Map<string, number>();

    for (const bal of tx.preTokenBalances) {
      if (bal.owner === pool) {
        preByMint.set(bal.mint, bal.uiAmount);
      }
    }
    for (const bal of tx.postTokenBalances) {
      if (bal.owner === pool) {
        postByMint.set(bal.mint, bal.uiAmount);
      }
    }

    // Find the non-WSOL mint (the "token" being traded)
    let mint = "";
    let direction: "buy" | "sell" = "buy";
    let amountBase = 0;
    let amountQuote = 0;
    let reserveBase = 0;
    let reserveQuote = 0;

    for (const [m, postAmount] of postByMint) {
      const preAmount = preByMint.get(m) ?? 0;
      const diff = postAmount - preAmount;

      if (m === WSOL_MINT) {
        amountQuote = Math.abs(diff);
        reserveQuote = postAmount;
      } else {
        mint = m;
        amountBase = Math.abs(diff);
        reserveBase = postAmount;
        // If pool gained tokens, someone sold (pool reserves increased)
        // If pool lost tokens, someone bought (pool reserves decreased)
        if (diff > 0) direction = "sell";
        else if (diff < 0) direction = "buy";
      }
    }

    // If no mint found from balance diff, try to get it from signer's balances
    if (!mint) {
      for (const bal of tx.postTokenBalances) {
        if (bal.owner === tx.signer && bal.mint !== WSOL_MINT) {
          mint = bal.mint;
          break;
        }
      }
    }

    // Skip if we couldn't determine the swap
    if (!mint || (amountBase === 0 && amountQuote === 0)) return null;

    const priceAfter = reserveBase > 0 ? reserveQuote / reserveBase : 0;

    return {
      type: "Swap",
      dex,
      pool,
      trader: tx.signer,
      direction,
      mint,
      amountIn: direction === "buy" ? amountQuote : amountBase,
      amountOut: direction === "buy" ? amountBase : amountQuote,
      priceAfter,
      reserveBase,
      reserveQuote,
      signature: tx.signature,
      slot: tx.slot,
      timestamp: tx.timestamp,
      isAggregated,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generic create pool parser
// ---------------------------------------------------------------------------

function parseGenericCreatePool(
  dex: string,
  ix: FormattedInstruction,
  tx: FormattedTransaction,
): NewPoolEvent | null {
  try {
    if (ix.accounts.length < 2) return null;

    // Pool is typically accounts[0], token mints vary by DEX
    const pool = tx.accountList[ix.accounts[0]]?.toBase58() ?? "";

    // Find the two token mints from post token balances where owner == pool
    const poolMints = new Set<string>();
    let reserveA = 0, reserveB = 0;
    const mintReserves: Record<string, number> = {};

    for (const bal of tx.postTokenBalances) {
      if (bal.owner === pool) {
        poolMints.add(bal.mint);
        mintReserves[bal.mint] = bal.uiAmount;
      }
    }

    const mints = Array.from(poolMints);
    const tokenA = mints[0] ?? "";
    const tokenB = mints[1] ?? "";
    reserveA = mintReserves[tokenA] ?? 0;
    reserveB = mintReserves[tokenB] ?? 0;

    // If we can't find mints from balances, try instruction accounts
    // (different DEXes put mints at different account positions)
    if (!tokenA && ix.accounts.length >= 5) {
      return {
        type: "NewPool",
        dex,
        pool,
        tokenA: tx.accountList[ix.accounts[3]]?.toBase58() ?? "",
        tokenB: tx.accountList[ix.accounts[4]]?.toBase58() ?? "",
        initialReserveA: 0,
        initialReserveB: 0,
        creator: tx.signer,
        signature: tx.signature,
        slot: tx.slot,
        timestamp: tx.timestamp,
      };
    }

    return {
      type: "NewPool",
      dex,
      pool,
      tokenA,
      tokenB,
      initialReserveA: reserveA,
      initialReserveB: reserveB,
      creator: tx.signer,
      signature: tx.signature,
      slot: tx.slot,
      timestamp: tx.timestamp,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Instruction classification helpers
// ---------------------------------------------------------------------------

/** Collect all instructions (outer + inner CPI) for a given program */
function collectProgramInstructions(
  programId: string,
  tx: FormattedTransaction,
): FormattedInstruction[] {
  const result: FormattedInstruction[] = [];

  for (const ix of tx.outerInstructions) {
    if (ix.programId === programId) result.push(ix);
  }
  for (const group of tx.innerInstructions) {
    for (const ix of group.instructions) {
      if (ix.programId === programId) result.push(ix);
    }
  }

  return result;
}

/** Check if an instruction is a swap based on discriminator */
function isSwapInstruction(
  programId: string,
  ix: FormattedInstruction,
  hexPrefix: string,
): boolean {
  // PumpSwap — handled separately via inner data
  if (programId === PUMP_SWAP_PROGRAM_ID) {
    return matchDiscriminator(ix.data, PUMPSWAP_BUY) || matchDiscriminator(ix.data, PUMPSWAP_SELL);
  }

  // Raydium AMM v4 — single-byte discriminator
  if (programId === RAYDIUM_AMM_V4_PROGRAM_ID) {
    return ix.data.length > 0 && ix.data[0] === 9; // swap
  }

  // Raydium CPMM
  if (programId === RAYDIUM_CPMM_PROGRAM_ID) {
    return hexPrefix === "8fbe5adac41e33de" || hexPrefix === "37d3073fbb8a32c1";
  }

  // Raydium CLMM
  if (programId === RAYDIUM_CLMM_PROGRAM_ID) {
    return hexPrefix === "f8c69e91e17587c8" || hexPrefix === "2b04ed0b1ac91e62";
  }

  // Raydium LaunchLab
  if (programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID) {
    return matchDiscriminator(ix.data, PUMPSWAP_BUY) || matchDiscriminator(ix.data, PUMPSWAP_SELL);
  }

  // Meteora DLMM
  if (programId === METEORA_DLMM_PROGRAM_ID) {
    return hexPrefix === "f8c69e91e17587c8";
  }

  // Meteora DAMM V2
  if (programId === METEORA_DAMM_V2_PROGRAM_ID) {
    return hexPrefix === "8fbe5adac41e33de";
  }

  // Meteora DBC
  if (programId === METEORA_DBC_PROGRAM_ID) {
    return hexPrefix === "f8c69e91e17587c8";
  }

  // Meteora DAMM V1 — uses AMM SDK, discriminator varies
  if (programId === METEORA_DAMM_V1_PROGRAM_ID) {
    return hexPrefix === "8fbe5adac41e33de";
  }

  // Generic CLMM (Orca, Pancakeswap, Byreal) — all use whirlpool-like swap discriminator
  if (
    programId === ORCA_WHIRLPOOLS_PROGRAM_ID ||
    programId === PANCAKE_SWAP_PROGRAM_ID ||
    programId === BYREAL_PROGRAM_ID
  ) {
    return hexPrefix === "f8c69e91e17587c8" || hexPrefix === "2b04ed0b1ac91e62";
  }

  // Fusion AMM
  if (programId === FUSION_AMM_PROGRAM_ID) {
    return hexPrefix === "8fbe5adac41e33de";
  }

  // Futarchy AMM
  if (programId === FUTARCHY_AMM_PROGRAM_ID) {
    return hexPrefix === "f8c69e91e17587c8";
  }

  return false;
}

/** Check if an instruction is a pool creation based on discriminator */
function isCreatePoolInstruction(
  programId: string,
  ix: FormattedInstruction,
  hexPrefix: string,
): boolean {
  // PumpSwap CreatePool
  if (programId === PUMP_SWAP_PROGRAM_ID) {
    return hexPrefix === PUMPSWAP_CREATE_POOL_HEX;
  }

  // Raydium CPMM — initialize
  if (programId === RAYDIUM_CPMM_PROGRAM_ID) {
    return hexPrefix === "e992d18ecf6840bc" || hexPrefix === "afaf6d1f0d989bed";
  }

  // Raydium AMM v4 — initialize2
  if (programId === RAYDIUM_AMM_V4_PROGRAM_ID) {
    return ix.data.length > 0 && ix.data[0] === 1;
  }

  // Raydium CLMM — createPool
  if (programId === RAYDIUM_CLMM_PROGRAM_ID) {
    return hexPrefix === "cf27e4bce23fb224";
  }

  // Raydium LaunchLab — createPool
  if (programId === RAYDIUM_LAUNCHLAB_PROGRAM_ID) {
    return hexPrefix === PUMPSWAP_CREATE_POOL_HEX;
  }

  // Meteora DAMM V2 — createPool
  if (programId === METEORA_DAMM_V2_PROGRAM_ID) {
    return hexPrefix === "e992d18ecf6840bc";
  }

  // Meteora DLMM — initializeCustomizablePermissionlessLbPair
  if (programId === METEORA_DLMM_PROGRAM_ID) {
    return hexPrefix === "afaf6d1f0d989bed";
  }

  // Meteora DBC — create
  if (programId === METEORA_DBC_PROGRAM_ID) {
    return hexPrefix === "e992d18ecf6840bc" || hexPrefix === "afaf6d1f0d989bed";
  }

  // Generic CLMM creates
  if (
    programId === ORCA_WHIRLPOOLS_PROGRAM_ID ||
    programId === PANCAKE_SWAP_PROGRAM_ID ||
    programId === BYREAL_PROGRAM_ID
  ) {
    return hexPrefix === "cf27e4bce23fb224" || hexPrefix === "afaf6d1f0d989bed";
  }

  return false;
}
