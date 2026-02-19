/**
 * Orca Whirlpools — IDexAdapter Implementation
 *
 * Wraps the @orca-so/whirlpools v5 SDK (which uses @solana/kit types) for
 * buy/snipe/findPool/getPrice/buildSwapIxs on Orca Whirlpool pools.
 *
 * Key details:
 * - Uses @orca-so/whirlpools swapInstructions() which returns @solana/kit
 *   IInstruction[] — converted to @solana/web3.js TransactionInstruction[].
 * - CRITICAL: Manually patches WSOL ATA references in swap instructions.
 *   Orca SDK creates its own WSOL ATA via system program transfer, but we
 *   want to use the user's WSOL ATA. We detect Orca's auto-created ATA from
 *   the system program transfer instruction and replace it in the swap IX.
 * - Lazy initialization of Orca SDK via initializeOrca() on first call.
 * - Whirlpool account layout decoded manually for getPrice().
 *
 * Source: 100x-algo-bots/trading-modules/orca/
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
import BN from "bn.js";

import type { Address } from "@solana/kit";
// @ts-ignore — IInstruction exists in @solana/kit
import type { IInstruction } from "@solana/kit";
import { AccountRole, createKeyPairSignerFromBytes, mainnet } from "@solana/kit";
import { createSolanaRpc, address } from "@solana/kit";

// @ts-ignore — @orca-so/whirlpools may not be installed
import {
  setWhirlpoolsConfig,
  swapInstructions,
  setRpc,
  setPayerFromBytes,
} from "@orca-so/whirlpools";

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

const WHIRLPOOL_PROGRAM_ID = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const USD1_MINT = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB";

const SIX_DECIMAL_MINTS = new Set([USDC_MINT, USDT_MINT, USD1_MINT]);

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
// Whirlpool account layout (manual decode for getPrice)
// ---------------------------------------------------------------------------

/**
 * Decode sqrtPrice from whirlpool account data.
 * Layout: 8-byte discriminator, then fields. sqrtPrice is a u128 at a
 * known offset within the struct.
 */
function decodeWhirlpoolSqrtPrice(data: Buffer): BN {
  // Whirlpool layout (after 8-byte discriminator):
  //   whirlpoolsConfig [32]
  //   whirlpoolBump [1]
  //   tickSpacing [2]
  //   feeTierIndexSeed [2]
  //   feeRate [2]
  //   protocolFeeRate [2]
  //   liquidity [16]
  //   sqrtPrice [16]    ← offset = 8 + 32 + 1 + 2 + 2 + 2 + 2 + 16 = 65
  const offset = 8 + 32 + 1 + 2 + 2 + 2 + 2 + 16; // = 65
  return new BN(data.subarray(offset, offset + 16), "le");
}

function decodeWhirlpoolMints(data: Buffer): { tokenMintA: PublicKey; tokenMintB: PublicKey } {
  // After sqrtPrice [16] comes:
  //   tickCurrentIndex [4]
  //   protocolFeeOwedA [8]
  //   protocolFeeOwedB [8]
  //   tokenMintA [32]
  // Offset = 65 + 16 + 4 + 8 + 8 = 101
  const mintAOffset = 65 + 16 + 4 + 8 + 8;
  const tokenMintA = new PublicKey(data.subarray(mintAOffset, mintAOffset + 32));

  // tokenVaultA [32], feeGrowthGlobalA [16], tokenMintB [32]
  const mintBOffset = mintAOffset + 32 + 32 + 16;
  const tokenMintB = new PublicKey(data.subarray(mintBOffset, mintBOffset + 32));

  return { tokenMintA, tokenMintB };
}

/** Convert sqrtPrice (Q64.64 fixed-point) to price. */
function sqrtPriceToPrice(
  sqrtPrice: BN,
  decimalsA: number,
  decimalsB: number,
): number {
  const Q64_RESOLUTION = 2 ** 64;
  const power = Math.pow(10, decimalsA - decimalsB);
  const sqrtPriceF64 = Number(sqrtPrice.toString());
  return Math.pow(sqrtPriceF64 / Q64_RESOLUTION, 2.0) * power;
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

/** Retry RPC calls with bounded retries. */
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
// Lazy Orca SDK initialization
// ---------------------------------------------------------------------------

let orcaInitialized = false;

async function initializeOrca(): Promise<void> {
  if (orcaInitialized) return;
  const wallet = getWallet();
  await setWhirlpoolsConfig("solanaMainnet");
  await setRpc(mainnet(main_endpoint));
  await setPayerFromBytes(new Uint8Array(wallet.secretKey));
  orcaInitialized = true;
}

// ---------------------------------------------------------------------------
// WSOL ATA patching
//
// Orca SDK's swapInstructions() creates its own WSOL ATA via a system
// program transfer. For sniping, we replace Orca's auto-created ATA with
// the user's standard WSOL ATA so that we can manage wrapping ourselves.
// ---------------------------------------------------------------------------

function patchOrcaWsolAta(
  web3Instructions: TransactionInstruction[],
  userWsolAta: PublicKey,
): {
  swapIxs: TransactionInstruction[];
  nonSwapIxs: TransactionInstruction[];
} {
  // Separate swap IXs (whirlpool program) from non-swap IXs
  const orcaSwapIxs = web3Instructions.filter(
    (ix) => ix.programId.toBase58() === WHIRLPOOL_PROGRAM_ID,
  );
  const systemIxs = web3Instructions.filter(
    (ix) => ix.programId.toBase58() === SYSTEM_PROGRAM_ID,
  );
  const nonSwapIxs = web3Instructions.filter(
    (ix) =>
      ix.programId.toBase58() !== WHIRLPOOL_PROGRAM_ID &&
      ix.programId.toBase58() !== SYSTEM_PROGRAM_ID,
  );

  // Detect Orca's auto-created WSOL ATA from the first system transfer IX
  let orcaWsolAta: PublicKey | undefined;
  if (systemIxs.length > 0) {
    const transferIx = systemIxs[0];
    if (transferIx.keys.length >= 2) {
      orcaWsolAta = transferIx.keys[1].pubkey;
    }
  }

  // Replace Orca's WSOL ATA with user's in swap instructions
  const patchedSwapIxs: TransactionInstruction[] = [];
  if (orcaWsolAta) {
    for (const swapIx of orcaSwapIxs) {
      const modifiedKeys = swapIx.keys.map((meta) => {
        if (orcaWsolAta && meta.pubkey.equals(orcaWsolAta)) {
          return {
            pubkey: userWsolAta,
            isSigner: meta.isSigner,
            isWritable: meta.isWritable,
          };
        }
        return meta;
      });
      patchedSwapIxs.push(
        new TransactionInstruction({
          programId: swapIx.programId,
          keys: modifiedKeys,
          data: swapIx.data,
        }),
      );
    }
  } else {
    patchedSwapIxs.push(...orcaSwapIxs);
  }

  return { swapIxs: patchedSwapIxs, nonSwapIxs };
}

// ---------------------------------------------------------------------------
// Token program detection
// ---------------------------------------------------------------------------

async function getTokenProgramForMint(
  mint: PublicKey,
): Promise<PublicKey> {
  const connection = getConnection();
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  return info.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OrcaAdapter implements IDexAdapter {
  readonly name = "orca";
  readonly protocol = "whirlpool";
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
      throw new Error("orca: poolAddress is required (auto-discovery not yet supported)");
    }

    await initializeOrca();

    const rpc = createSolanaRpc(main_endpoint);
    const walletSigner = await createKeyPairSignerFromBytes(
      new Uint8Array(wallet.secretKey),
    );

    const inputAmount = amountToSmallestUnit(amountSol, quoteMintStr);
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    const { instructions } = await swapInstructions(
      rpc,
      { inputAmount, mint: address(quoteMintStr) },
      address(poolAddress),
      slippageBps,
      walletSigner,
    );

    const web3Instructions = convertInstructions(instructions);

    // Build full TX with compute budget
    const cuLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const cuPrice = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const allIxs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
      ...web3Instructions,
    ];

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
    const isInputWSOL = quoteMintStr === WSOL_MINT;

    await initializeOrca();

    // Decode whirlpool to determine swap direction
    const whirlpoolAccountInfo = await connection.getAccountInfo(
      new PublicKey(poolAddress),
    );
    if (!whirlpoolAccountInfo) {
      throw new Error(`Whirlpool account not found: ${poolAddress}`);
    }

    const { tokenMintA, tokenMintB } = decodeWhirlpoolMints(whirlpoolAccountInfo.data);
    const quoteMintPk = new PublicKey(quoteMintStr);

    // Determine which pool token is the input
    let inputMint: PublicKey;
    if (quoteMintPk.equals(tokenMintA)) {
      inputMint = tokenMintA;
    } else if (quoteMintPk.equals(tokenMintB)) {
      inputMint = tokenMintB;
    } else {
      throw new Error(
        `Quote mint ${quoteMintStr} does not match either token in the pool. ` +
        `Pool has tokenA: ${tokenMintA.toBase58()}, tokenB: ${tokenMintB.toBase58()}`,
      );
    }

    const outputMint = inputMint.equals(tokenMintA) ? tokenMintB : tokenMintA;
    const inputAmount = amountToSmallestUnit(amountSol, quoteMintStr);

    const rpc = createSolanaRpc(main_endpoint);
    const walletSigner = await createKeyPairSignerFromBytes(
      new Uint8Array(wallet.secretKey),
    );

    const { instructions } = await swapInstructions(
      rpc,
      { inputAmount, mint: address(inputMint.toBase58()) },
      address(poolAddress),
      1000, // 10% slippage for sniping
      walletSigner,
    );

    const web3Instructions = convertInstructions(instructions);

    // Detect token programs
    const outputTokenProgram = await getTokenProgramForMint(outputMint);
    const inputTokenProgram = TOKEN_PROGRAM_ID; // WSOL/USDC always standard

    const inputAta = await getAssociatedTokenAddress(
      inputMint,
      wallet.publicKey,
      false,
      inputTokenProgram,
    );
    const outputAta = await getAssociatedTokenAddress(
      outputMint,
      wallet.publicKey,
      false,
      outputTokenProgram,
    );

    const cuLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const cuPrice = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    let allIxs: TransactionInstruction[];

    if (isInputWSOL) {
      // Patch Orca's WSOL ATA with user's
      const { swapIxs: patchedSwapIxs } = patchOrcaWsolAta(
        web3Instructions,
        inputAta,
      );

      const createOutputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        outputAta,
        wallet.publicKey,
        outputMint,
        outputTokenProgram,
      );
      const createInputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        inputAta,
        wallet.publicKey,
        inputMint,
        inputTokenProgram,
      );
      const transferIx = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: inputAta,
        lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
      });
      const syncNativeIx = createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID);
      const closeIx = createCloseAccountInstruction(
        inputAta,
        wallet.publicKey,
        wallet.publicKey,
        [],
        TOKEN_PROGRAM_ID,
      );

      allIxs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
        createOutputAtaIx,
        createInputAtaIx,
        transferIx,
        syncNativeIx,
        ...patchedSwapIxs,
        closeIx,
      ];
    } else {
      const createOutputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        outputAta,
        wallet.publicKey,
        outputMint,
        outputTokenProgram,
      );

      // Filter to only whirlpool swap instructions (not Orca's ATA management)
      const orcaSwapOnly = web3Instructions.filter(
        (ix) => ix.programId.toBase58() === WHIRLPOOL_PROGRAM_ID,
      );

      allIxs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
        createOutputAtaIx,
        ...orcaSwapOnly,
      ];
    }

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
    const { amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;
    if (!poolAddress) {
      throw new Error("orca: poolAddress is required for buildSwapIxs");
    }

    await initializeOrca();

    const wallet = getWallet();
    const rpc = createSolanaRpc(main_endpoint);
    const walletSigner = await createKeyPairSignerFromBytes(
      new Uint8Array(wallet.secretKey),
    );

    const inputAmount = amountToSmallestUnit(amountSol, quoteMintStr);
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    const { instructions } = await swapInstructions(
      rpc,
      { inputAmount, mint: address(quoteMintStr) },
      address(poolAddress),
      slippageBps,
      walletSigner,
    );

    const web3Instructions = convertInstructions(instructions);

    return {
      instructions: web3Instructions,
      signers: [],
    };
  }

  // ---- findPool (stub) ----

  async findPool(baseMint: string, _quoteMint?: string): Promise<PoolInfo | null> {
    // Orca pool discovery requires off-chain indexing or Orca API.
    // The legacy code uses PDAUtil.getWhirlpool() which requires knowing tick spacing.
    return null;
  }

  // ---- getPrice ----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolPk = new PublicKey(poolAddress);

    const accountInfo = await retryRpcCall(() => connection.getAccountInfo(poolPk));
    if (!accountInfo) {
      throw new Error(`Whirlpool account not found: ${poolAddress}`);
    }

    const sqrtPrice = decodeWhirlpoolSqrtPrice(accountInfo.data);
    const { tokenMintA, tokenMintB } = decodeWhirlpoolMints(accountInfo.data);

    // Get decimals from on-chain mint accounts
    const [mintAInfo, mintBInfo] = await Promise.all([
      connection.getAccountInfo(tokenMintA),
      connection.getAccountInfo(tokenMintB),
    ]);

    // Mint decimals are at offset 44 in the mint account data
    const decimalsA = mintAInfo ? mintAInfo.data.readUInt8(44) : 9;
    const decimalsB = mintBInfo ? mintBInfo.data.readUInt8(44) : 9;

    let price = sqrtPriceToPrice(sqrtPrice, decimalsA, decimalsB);
    if (price > 1) price = 1 / price;

    return {
      price,
      baseMint: tokenMintA.toBase58(),
      quoteMint: tokenMintB.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new OrcaAdapter());
