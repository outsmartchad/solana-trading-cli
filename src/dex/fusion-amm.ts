/**
 * Fusion AMM — IDexAdapter Implementation
 *
 * Wraps the @crypticdot/fusionamm-client and @crypticdot/fusionamm-core SDKs
 * for buy/snipe/findPool/getPrice/buildSwapIxs on Fusion AMM pools.
 *
 * Key details:
 * - Uses @solana/kit types (IInstruction, Address) — converted to @solana/web3.js
 *   TransactionInstruction via convertInstruction().
 * - Token-2022 transfer fee awareness — reads mint extensions to detect fees.
 * - Tick array handling — fetches or creates uninitialized tick arrays for swap quotes.
 * - WSOL wrapping/unwrapping handled automatically for SOL-based swaps.
 *
 * Source: 100x-algo-bots/trading-modules/fusion-amm/
 */

import {
  PublicKey,
  TransactionInstruction,
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

import type { Address, Account } from "@solana/kit";
// @ts-ignore — IInstruction type exists in @solana/kit
import type { IInstruction } from "@solana/kit";
import { AccountRole, createKeyPairSignerFromBytes, lamports } from "@solana/kit";
import { createSolanaRpc, address } from "@solana/kit";

// @ts-ignore — fusionamm-client may not be installed
import {
  AccountsType,
  fetchAllMaybeTickArray,
  fetchFusionPool,
  getSwapInstruction,
  getTickArrayAddress,
  type FusionPool,
  // @ts-ignore
} from "@crypticdot/fusionamm-client";
// @ts-ignore — fusionamm-core may not be installed
import {
  _TICK_ARRAY_SIZE,
  getTickArrayStartTickIndex,
  swapQuoteByInputToken,
  type TickArrayFacade,
  sqrtPriceToPrice,
  // @ts-ignore
} from "@crypticdot/fusionamm-core";
import { fetchAllMint } from "@solana-program/token-2022";
import { MEMO_PROGRAM_ADDRESS } from "@solana-program/memo";

import { getWallet, getConnection, main_endpoint } from "../helpers/config";
import { landTransaction } from "../transactions/landing";
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
  WSOL_MINT,
  USDC_MINT,
  USDT_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./types";
import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USD1_MINT = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB";

const SIX_DECIMAL_MINTS = new Set([
  USDC_MINT,
  USDT_MINT,
  USD1_MINT,
]);

// ---------------------------------------------------------------------------
// @solana/kit → @solana/web3.js instruction conversion
// ---------------------------------------------------------------------------

function convertInstruction(ix: IInstruction): TransactionInstruction {
  const accounts = ix.accounts.map((acc: any) => {
    const pubkey = new PublicKey(acc.address);
    let isWritable = false;
    let isSigner = false;

    if ("role" in acc) {
      isWritable =
        acc.role === AccountRole.WRITABLE ||
        acc.role === AccountRole.WRITABLE_SIGNER;
      isSigner =
        acc.role === AccountRole.READONLY_SIGNER ||
        acc.role === AccountRole.WRITABLE_SIGNER;
    } else if ("isWritable" in acc || "isSigner" in acc) {
      isWritable = acc.isWritable || false;
      isSigner = acc.isSigner || false;
    }

    return { pubkey, isSigner, isWritable };
  });

  return new TransactionInstruction({
    programId: new PublicKey(ix.programAddress),
    keys: accounts,
    data: Buffer.from(ix.data),
  });
}

function convertInstructions(ixs: IInstruction[]): TransactionInstruction[] {
  return ixs.map(convertInstruction);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function quoteDecimals(quoteMintStr: string): number {
  return SIX_DECIMAL_MINTS.has(quoteMintStr) ? 6 : 9;
}

function amountToSmallestUnit(amount: number, quoteMintStr: string): bigint {
  const decimals = quoteDecimals(quoteMintStr);
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

/** Retry RPC calls with bounded retries and exponential backoff. */
async function retryRpcCall<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  delayMs = 200,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error?.context?.statusCode === 429 ||
        error?.__code === 8100002 ||
        error?.message?.includes("429") ||
        error?.message?.includes("Too Many Requests");
      if (isRetryable && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Tick array helpers
// ---------------------------------------------------------------------------

function createUninitializedTickArray(
  addr: Address,
  startTickIndex: number,
  programAddress: Address,
): Account<TickArrayFacade> {
  return {
    address: addr,
    data: {
      startTickIndex,
      ticks: Array(_TICK_ARRAY_SIZE()).fill({
        initialized: false,
        liquidityNet: 0n,
        liquidityGross: 0n,
        feeGrowthOutsideA: 0n,
        feeGrowthOutsideB: 0n,
        age: 0n,
        openOrdersInput: 0n,
        partFilledOrdersInput: 0n,
        partFilledOrdersRemainingInput: 0n,
        fulfilledAToBOrdersInput: 0n,
        fulfilledBToAOrdersInput: 0n,
      }),
    },
    space: 0n,
    executable: false,
    lamports: lamports(0n),
    programAddress,
  };
}

async function fetchTickArrayOrDefault(
  rpc: any,
  fusionPool: Account<FusionPool>,
): Promise<Account<TickArrayFacade>[]> {
  const tickArrayStartIndex = getTickArrayStartTickIndex(
    fusionPool.data.tickCurrentIndex,
    fusionPool.data.tickSpacing,
  );
  const offset = fusionPool.data.tickSpacing * _TICK_ARRAY_SIZE();

  const tickArrayIndexes = [
    tickArrayStartIndex,
    tickArrayStartIndex + offset,
    tickArrayStartIndex + offset * 2,
    tickArrayStartIndex - offset,
    tickArrayStartIndex - offset * 2,
  ];

  const tickArrayAddresses = await Promise.all(
    tickArrayIndexes.map((startIndex) =>
      getTickArrayAddress(fusionPool.address, startIndex).then((x: any) => x[0]),
    ),
  );

  const maybeTickArrays = (await retryRpcCall(() =>
    fetchAllMaybeTickArray(rpc, tickArrayAddresses),
  )) as any[];

  const tickArrays: Account<TickArrayFacade>[] = [];
  for (let i = 0; i < maybeTickArrays.length; i++) {
    const maybe = maybeTickArrays[i];
    if (maybe.exists) {
      tickArrays.push(maybe);
    } else {
      tickArrays.push(
        createUninitializedTickArray(
          tickArrayAddresses[i],
          tickArrayIndexes[i],
          fusionPool.programAddress,
        ),
      );
    }
  }
  return tickArrays;
}

// ---------------------------------------------------------------------------
// Token-2022 transfer fee helper
// ---------------------------------------------------------------------------

function getCurrentTransferFee(mint: any, currentEpoch: bigint): any {
  if (
    mint == null ||
    ("exists" in mint && !mint.exists) ||
    mint.data.extensions?.__option === "None"
  ) {
    return undefined;
  }
  const feeConfig = mint.data.extensions?.value?.find(
    (x: any) => x.__kind === "TransferFeeConfig",
  );
  if (feeConfig == null) return undefined;

  const transferFee =
    currentEpoch >= feeConfig.newerTransferFee.epoch
      ? feeConfig.newerTransferFee
      : feeConfig.olderTransferFee;
  return {
    feeBps: transferFee.transferFeeBasisPoints,
    maxFee: transferFee.maximumFee,
  };
}

// ---------------------------------------------------------------------------
// Core: build swap instructions via FusionAMM SDK
// ---------------------------------------------------------------------------

async function buildFusionSwapInstructions(
  rpc: any,
  poolAddress: Address,
  inputAmount: bigint,
  quoteMint: Address,
  slippageToleranceBps: number,
  signer: any,
): Promise<IInstruction[]> {
  const fusionPool = (await retryRpcCall(() =>
    fetchFusionPool(rpc, poolAddress),
  )) as Account<FusionPool>;

  const [tokenA, tokenB] = await retryRpcCall(() =>
    fetchAllMint(rpc, [fusionPool.data.tokenMintA, fusionPool.data.tokenMintB]),
  );

  const specifiedTokenA = quoteMint === fusionPool.data.tokenMintA;
  const tickArrays = (await retryRpcCall(() =>
    fetchTickArrayOrDefault(rpc, fusionPool),
  )) as Account<TickArrayFacade>[];

  const currentEpoch = (await retryRpcCall(() =>
    rpc.getEpochInfo().send(),
  )) as { epoch: bigint };
  const transferFeeA = getCurrentTransferFee(tokenA, currentEpoch.epoch);
  const transferFeeB = getCurrentTransferFee(tokenB, currentEpoch.epoch);

  // Get swap quote
  const quote = swapQuoteByInputToken(
    inputAmount,
    specifiedTokenA,
    slippageToleranceBps,
    fusionPool.data,
    tickArrays.map((x: any) => x.data),
    transferFeeA,
    transferFeeB,
  );

  const aToB = specifiedTokenA;

  // Derive ATAs
  const { findAssociatedTokenPda } = await import("@solana-program/token");
  const tokenAccountAddresses: Record<Address, Address> = {};

  const tokenAccountA = await findAssociatedTokenPda({
    owner: signer.address,
    mint: fusionPool.data.tokenMintA,
    tokenProgram: tokenA.programAddress,
  });
  tokenAccountAddresses[fusionPool.data.tokenMintA] = tokenAccountA[0];

  const tokenAccountB = await findAssociatedTokenPda({
    owner: signer.address,
    mint: fusionPool.data.tokenMintB,
    tokenProgram: tokenB.programAddress,
  });
  tokenAccountAddresses[fusionPool.data.tokenMintB] = tokenAccountB[0];

  const swapInstruction = getSwapInstruction({
    tokenProgramA: tokenA.programAddress,
    tokenProgramB: tokenB.programAddress,
    memoProgram: MEMO_PROGRAM_ADDRESS,
    tokenAuthority: signer,
    fusionPool: fusionPool.address,
    tokenMintA: fusionPool.data.tokenMintA,
    tokenMintB: fusionPool.data.tokenMintB,
    tokenOwnerAccountA: tokenAccountAddresses[fusionPool.data.tokenMintA],
    tokenOwnerAccountB: tokenAccountAddresses[fusionPool.data.tokenMintB],
    tokenVaultA: fusionPool.data.tokenVaultA,
    tokenVaultB: fusionPool.data.tokenVaultB,
    tickArray0: tickArrays[0].address,
    tickArray1: tickArrays[1].address,
    tickArray2: tickArrays[2].address,
    amount: inputAmount,
    otherAmountThreshold: quote.tokenMinOut,
    sqrtPriceLimit: 0,
    amountSpecifiedIsInput: true,
    aToB,
    remainingAccountsInfo: {
      slices: [{ accountsType: AccountsType.SupplementalTickArrays, length: 2 }],
    },
  });

  // Append supplemental tick arrays
  swapInstruction.accounts.push(
    { address: tickArrays[3].address, role: AccountRole.WRITABLE },
    { address: tickArrays[4].address, role: AccountRole.WRITABLE },
  );

  return [swapInstruction];
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class FusionAmmAdapter implements IDexAdapter {
  readonly name = "fusion-amm";
  readonly protocol = "fusion-amm";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSnipe: true,
    canFindPool: true,
    canGetPrice: true,
  });

  // ---- Core: buy ----

  async buy(params: BuyParams): Promise<SwapResult> {
    const { tokenMint, amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    if (!poolAddress) {
      throw new Error("fusion-amm: poolAddress is required (auto-discovery not yet supported)");
    }

    const { instructions: swapIxs, signers } = await this.doBuildSwapIxs(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
      opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    );

    // Add WSOL wrapping instructions if needed
    const allIxs = await this.wrapInstructionsWithWSOL(
      swapIxs,
      quoteMintStr,
      amountSol,
      wallet,
      opts,
    );

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(allIxs, wallet, blockhash, {
      dex: this.name,
      operation: "buy",
      tipSol: opts?.tipSol,
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

  // ---- Core: sell (not supported) ----

  async sell(_params: SellParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(this.name, "sell");
  }

  // ---- Snipe ----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, quoteMint: quoteMintParam, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    const { instructions: swapIxs } = await this.doBuildSwapIxs(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
      opts?.slippageBps ?? 1000, // 10% slippage for sniping
    );

    // Add WSOL wrapping instructions if needed
    const allIxs = await this.wrapInstructionsWithWSOL(
      swapIxs,
      quoteMintStr,
      amountSol,
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
    if ("percentage" in params) {
      throw new UnsupportedOperationError(this.name, "buildSwapIxs(sell)");
    }
    const { tokenMint, amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;
    if (!poolAddress) {
      throw new Error("fusion-amm: poolAddress is required for buildSwapIxs");
    }
    return this.doBuildSwapIxs(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
      opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    );
  }

  // ---- findPool (stub — requires external discovery) ----

  async findPool(baseMint: string, quoteMint?: string): Promise<PoolInfo | null> {
    // Fusion AMM pool discovery requires off-chain indexing.
    // Return null — callers should provide poolAddress directly.
    return null;
  }

  // ---- getPrice ----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const rpc = createSolanaRpc(main_endpoint);
    const poolAddr = address(poolAddress);
    const fusionPool = (await retryRpcCall(() =>
      fetchFusionPool(rpc, poolAddr),
    )) as Account<FusionPool>;

    // We need mint decimals — fetch from on-chain
    const [tokenA, tokenB] = await retryRpcCall(() =>
      fetchAllMint(rpc, [fusionPool.data.tokenMintA, fusionPool.data.tokenMintB]),
    );

    const decimalsA = tokenA.data.decimals;
    const decimalsB = tokenB.data.decimals;
    let price = sqrtPriceToPrice(fusionPool.data.sqrtPrice, decimalsA, decimalsB);
    if (price > 1) price = 1 / price;

    return {
      price,
      baseMint: String(fusionPool.data.tokenMintA),
      quoteMint: String(fusionPool.data.tokenMintB),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }

  // ---- Internal helpers ----

  private async doBuildSwapIxs(
    tokenMint: string,
    amountSol: number,
    quoteMintStr: string,
    poolAddress: string,
    slippageBps: number,
  ): Promise<BuildSwapIxsResult> {
    const wallet = getWallet();
    const rpc = createSolanaRpc(main_endpoint);
    const poolAddr = address(poolAddress);
    const inputAmount = amountToSmallestUnit(amountSol, quoteMintStr);

    const signer = await createKeyPairSignerFromBytes(
      new Uint8Array(wallet.secretKey),
    );

    const kitInstructions = await buildFusionSwapInstructions(
      rpc,
      poolAddr,
      inputAmount,
      address(quoteMintStr),
      slippageBps,
      signer,
    );

    const web3Instructions = convertInstructions(kitInstructions);

    return {
      instructions: web3Instructions,
      signers: [],
    };
  }

  /**
   * Wrap swap instructions with WSOL create/transfer/sync/close if quote is SOL.
   * Also prepends compute budget instructions.
   */
  private async wrapInstructionsWithWSOL(
    swapIxs: TransactionInstruction[],
    quoteMintStr: string,
    amount: number,
    wallet: Keypair,
    opts?: BuyParams["opts"],
  ): Promise<TransactionInstruction[]> {
    const isWSol = quoteMintStr === WSOL_MINT;
    const cuLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const cuPrice = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const preIxs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
    ];

    if (isWSol) {
      const connection = getConnection();
      const quoteMintPk = new PublicKey(quoteMintStr);
      const inputAta = await getAssociatedTokenAddress(
        quoteMintPk,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
      );

      // Detect base token program for output ATA
      // (We don't have baseMint here, so the swap IX's ATAs are already correct
      // from buildFusionSwapInstructions. We only need WSOL wrapping.)
      preIxs.push(
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          inputAta,
          wallet.publicKey,
          quoteMintPk,
          TOKEN_PROGRAM_ID,
        ),
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: inputAta,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        }),
        createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID),
      );

      const postIxs = [
        createCloseAccountInstruction(
          inputAta,
          wallet.publicKey,
          wallet.publicKey,
          [],
          TOKEN_PROGRAM_ID,
        ),
      ];

      return [...preIxs, ...swapIxs, ...postIxs];
    }

    return [...preIxs, ...swapIxs];
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new FusionAmmAdapter());
