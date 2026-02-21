/**
 * Futarchy AMM — IDexAdapter Implementation
 *
 * Anchor-based DEX using the Futarchy protocol's on-chain AMM.
 * Pools are "DAOs" that embed an AMM with spot/futarchy pool states.
 *
 * Flow:
 *   1. Create Anchor provider + FutarchyAmmSDK
 *   2. Fetch DAO account to get pool state (reserves, mints)
 *   3. Build spotSwap instructions via the SDK
 *   4. Submit via landing layer
 *
 * No sell in source module — only buy/snipe are supported.
 * getPrice reads spot pool reserves from the DAO account.
 *
 * Source: 100x-algo-bots/trading-modules/futarchy-amm/
 *
 * Capabilities: canBuy, canSnipe, canGetPrice
 * Requires: @coral-xyz/anchor
 */

import {
  PublicKey,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  SystemProgram,
  Connection,
} from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { getWallet, getConnection } from "../helpers/config";
import { getTokenProgram } from "../helpers/token-2022";
import { landTransaction } from "../transactions/landing";
import { sendAndConfirmVtx } from "../transactions/send-rpc";
import { IDL as FUTARCHY_RAW_IDL } from "./futarchy-idl";

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
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./types";

import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FUTARCHY_PROGRAM_ID = new PublicKey(
  "FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq",
);

const WSOL_MINT_PK = new PublicKey(WSOL_MINT);
const USDC_MINT_PK = new PublicKey(USDC_MINT);

/** PRICE_SCALE from Rust: 1_000_000_000_000 (1e12) */
const PRICE_SCALE = 1_000_000_000_000;

/** Full Futarchy IDL (v0.6.0) — cast for Anchor 0.29 compatibility */
const FUTARCHY_IDL = FUTARCHY_RAW_IDL as unknown as Idl;

// ---------------------------------------------------------------------------
// Internal SDK (embedded — matches source FutarchyAmmSDK)
// ---------------------------------------------------------------------------

class FutarchyAmmSDK {
  public readonly program: Program<Idl>;
  public readonly connection: Connection;

  constructor(provider: AnchorProvider) {
    this.connection = provider.connection;
    // Anchor 0.29 constructor: (idl, programId, provider)
    this.program = new Program<Idl>(
      FUTARCHY_IDL,
      FUTARCHY_PROGRAM_ID,
      provider,
    );
  }

  async getDao(dao: PublicKey): Promise<any> {
    return (this.program.account as any).dao.fetch(dao);
  }

  async createSpotSwapInstructions(
    dao: PublicKey,
    baseMint: PublicKey,
    quoteMint: PublicKey,
    swapType: "buy" | "sell",
    inputAmount: bigint,
    minOutputAmount: bigint = BigInt(0),
    trader: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const userBaseAccount = getAssociatedTokenAddressSync(baseMint, trader, true);
    const userQuoteAccount = getAssociatedTokenAddressSync(quoteMint, trader, true);
    const ammBaseVault = getAssociatedTokenAddressSync(baseMint, dao, true);
    const ammQuoteVault = getAssociatedTokenAddressSync(quoteMint, dao, true);

    const [eventAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("__event_authority")],
      this.program.programId,
    );

    const swapIx: TransactionInstruction = await this.program.methods
      .spotSwap({
        swapType: swapType === "buy" ? { buy: {} } : { sell: {} },
        inputAmount: new BN(inputAmount.toString()),
        minOutputAmount: new BN(minOutputAmount.toString()),
      })
      .accounts({
        dao,
        userBaseAccount,
        userQuoteAccount,
        ammBaseVault,
        ammQuoteVault,
        user: trader,
        tokenProgram: TOKEN_PROGRAM_ID,
        eventAuthority,
        program: this.program.programId,
      })
      .instruction();

    const createBaseAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      trader,
      userBaseAccount,
      trader,
      baseMint,
    );

    const createQuoteAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      trader,
      userQuoteAccount,
      trader,
      quoteMint,
    );

    return [createBaseAtaIx, createQuoteAtaIx, swapIx];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the spot pool from a DAO's AMM state.
 * Handles both Spot and Futarchy state variants.
 */
function extractSpotPool(ammState: any): any {
  // Anchor enums: { spot: { spot: Pool } } or { futarchy: { spot, pass, fail } }
  if (ammState.spot) {
    return ammState.spot.spot;
  }
  if (ammState.futarchy) {
    return ammState.futarchy.spot;
  }
  // Capital-case variants (Anchor representation)
  if (ammState.Spot) {
    return ammState.Spot.spot;
  }
  if (ammState.Futarchy) {
    return ammState.Futarchy.spot;
  }
  throw new Error(`Invalid pool state: ${JSON.stringify(ammState)}`);
}

/** Convert SOL-denominated amount to quote token lamports based on quote mint */
function computeInputAmount(amountSol: number, quoteMint: PublicKey): bigint {
  if (quoteMint.equals(WSOL_MINT_PK)) {
    return BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
  }
  if (quoteMint.equals(USDC_MINT_PK)) {
    return BigInt(Math.floor(amountSol * 1_000_000)); // 6 decimals
  }
  return BigInt(Math.floor(amountSol * 1_000_000_000));
}

function createProvider(): AnchorProvider {
  const connection = getConnection();
  const wallet = getWallet();
  return new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class FutarchyAmmAdapter implements IDexAdapter {
  readonly name = "futarchy-amm";
  readonly protocol = "futarchy";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    canSnipe: true,
    canGetPrice: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();

    if (!poolAddress) {
      throw new Error(
        "futarchy-amm buy() requires poolAddress (DAO address). " +
          "Futarchy DAOs cannot be auto-discovered by mint alone.",
      );
    }

    const dao = new PublicKey(poolAddress);
    const baseMint = new PublicKey(tokenMint);

    const provider = createProvider();
    const sdk = new FutarchyAmmSDK(provider);

    // Fetch DAO to auto-detect quote mint
    const daoAccount = await sdk.getDao(dao);
    if (!daoAccount) {
      throw new Error(`DAO not found: ${dao.toBase58()}`);
    }

    // Auto-detect quote mint from DAO account (override user param if not set)
    const quoteMintStr = quoteMintParam ?? daoAccount.quoteMint.toBase58();
    const quoteMint = new PublicKey(quoteMintStr);

    // Calculate input amount based on quote mint decimals
    const inputAmount = computeInputAmount(amountSol, quoteMint);

    // Slippage — use minOutputAmount=0 for now (source does the same)
    const minOutputAmount = BigInt(0);

    // Build swap instructions
    const swapIxs = await sdk.createSpotSwapInstructions(
      dao, baseMint, quoteMint, "buy",
      inputAmount, minOutputAmount, wallet.publicKey,
    );

    // Handle WSOL wrapping
    const quoteAta = await getAssociatedTokenAddress(
      quoteMint, wallet.publicKey, false, TOKEN_PROGRAM_ID,
    );

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    let ixs: TransactionInstruction[];

    if (quoteMint.equals(WSOL_MINT_PK)) {
      const wsolLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
      ixs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: quoteAta,
          lamports: wsolLamports,
        }),
        createSyncNativeInstruction(quoteAta, TOKEN_PROGRAM_ID),
        ...swapIxs,
        createCloseAccountInstruction(
          quoteAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID,
        ),
      ];
    } else {
      ixs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        ...swapIxs,
      ];
    }

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
    });

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress,
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { percentage, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();

    if (!poolAddress) {
      throw new Error(
        "futarchy-amm sell() requires poolAddress (DAO address). " +
          "Futarchy DAOs cannot be auto-discovered by mint alone.",
      );
    }

    const dao = new PublicKey(poolAddress);
    const baseMint = new PublicKey(tokenMint);

    const provider = createProvider();
    const sdk = new FutarchyAmmSDK(provider);

    // Auto-detect quote mint from DAO account
    const daoAccount = await sdk.getDao(dao);
    if (!daoAccount) {
      throw new Error(`DAO not found: ${dao.toBase58()}`);
    }
    const quoteMintStr = quoteMintParam ?? daoAccount.quoteMint.toBase58();
    const quoteMint = new PublicKey(quoteMintStr);

    // Get token balance (Futarchy uses standard SPL tokens)
    const ata = await getAssociatedTokenAddress(baseMint, wallet.publicKey, false, TOKEN_PROGRAM_ID);
    const tokenAccount = await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM_ID);
    const balance = tokenAccount.amount;

    // Calculate sell amount based on percentage
    const sellAmount = BigInt(Math.floor((Number(balance) * percentage) / 100));

    if (sellAmount === 0n) {
      throw new Error(`No balance to sell for ${tokenMint}`);
    }

    // Build swap instructions — "sell" direction (base → quote)
    const swapIxs = await sdk.createSpotSwapInstructions(
      dao, baseMint, quoteMint, "sell",
      sellAmount, BigInt(0), wallet.publicKey,
    );

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    let ixs: TransactionInstruction[];

    // Handle WSOL output wrapping (receive SOL → need WSOL ATA creation + close)
    if (quoteMint.equals(WSOL_MINT_PK)) {
      const quoteAta = await getAssociatedTokenAddress(
        quoteMint, wallet.publicKey, false, TOKEN_PROGRAM_ID,
      );
      ixs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey, quoteAta, wallet.publicKey, quoteMint,
        ),
        ...swapIxs,
        createCloseAccountInstruction(
          quoteAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID,
        ),
      ];
    } else {
      ixs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        ...swapIxs,
      ];
    }

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
    });

    // Human-readable sell amount
    let tokenDecimals = 9;
    try {
      const mintData = await connection.getTokenSupply(baseMint);
      tokenDecimals = mintData.value.decimals;
    } catch { /* fallback to 9 */ }
    const humanAmount = Number(sellAmount) / Math.pow(10, tokenDecimals);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: humanAmount,
      amountInToken: tokenMint,
      dex: this.name,
      poolAddress,
    };
  }

  // ----- Snipe -----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, quoteMint: quoteMintParam, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();

    const dao = new PublicKey(poolAddress);
    const baseMint = new PublicKey(tokenMint);

    const provider = createProvider();
    const sdk = new FutarchyAmmSDK(provider);

    // Auto-detect quote mint from DAO account
    const daoAccount = await sdk.getDao(dao);
    if (!daoAccount) {
      throw new Error(`DAO not found: ${dao.toBase58()}`);
    }
    const quoteMintStr = quoteMintParam ?? daoAccount.quoteMint.toBase58();
    const quoteMint = new PublicKey(quoteMintStr);

    const inputAmount = computeInputAmount(amountSol, quoteMint);

    // Snipe: minOutput = 0 for maximum fill
    const swapIxs = await sdk.createSpotSwapInstructions(
      dao, baseMint, quoteMint, "buy",
      inputAmount, BigInt(0), wallet.publicKey,
    );

    const quoteAta = await getAssociatedTokenAddress(
      quoteMint, wallet.publicKey, false, TOKEN_PROGRAM_ID,
    );

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? 20_000_000; // high for snipe

    let ixs: TransactionInstruction[];

    if (quoteMint.equals(WSOL_MINT_PK)) {
      const wsolLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
      ixs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: quoteAta,
          lamports: wsolLamports,
        }),
        createSyncNativeInstruction(quoteAta, TOKEN_PROGRAM_ID),
        ...swapIxs,
        createCloseAccountInstruction(
          quoteAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID,
        ),
      ];
    } else {
      ixs = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        ...swapIxs,
      ];
    }

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "snipe",
      tipSol,
      addressLookupTables: opts?.addressLookupTables,
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted?.accepted,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress,
    };
  }

  // ----- buildSwapIxs (for orchestrator / nonce integration) -----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    const tokenMint = requireTokenMint(params, this.name);
    if ("percentage" in params) {
      throw new UnsupportedOperationError(this.name, "buildSwapIxs(sell)");
    }

    const buyParams = params as BuyParams;
    const wallet = getWallet();

    if (!buyParams.poolAddress) {
      throw new Error("futarchy-amm buildSwapIxs() requires poolAddress (DAO address)");
    }

    const dao = new PublicKey(buyParams.poolAddress);
    const baseMint = new PublicKey(tokenMint);

    const provider = createProvider();
    const sdk = new FutarchyAmmSDK(provider);

    // Auto-detect quote mint from DAO account
    const daoAccount = await sdk.getDao(dao);
    if (!daoAccount) {
      throw new Error(`DAO not found: ${dao.toBase58()}`);
    }
    const quoteMintStr = buyParams.quoteMint ?? daoAccount.quoteMint.toBase58();
    const quoteMint = new PublicKey(quoteMintStr);

    const inputAmount = computeInputAmount(buyParams.amountSol, quoteMint);

    const swapIxs = await sdk.createSpotSwapInstructions(
      dao, baseMint, quoteMint, "buy",
      inputAmount, BigInt(0), wallet.publicKey,
    );

    // If WSOL, add wrap/unwrap instructions around swap
    if (quoteMint.equals(WSOL_MINT_PK)) {
      const quoteAta = await getAssociatedTokenAddress(
        quoteMint, wallet.publicKey, false, TOKEN_PROGRAM_ID,
      );
      const wsolLamports = Math.floor(buyParams.amountSol * LAMPORTS_PER_SOL);

      return {
        instructions: [
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: quoteAta,
            lamports: wsolLamports,
          }),
          createSyncNativeInstruction(quoteAta, TOKEN_PROGRAM_ID),
          ...swapIxs,
          createCloseAccountInstruction(
            quoteAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID,
          ),
        ],
        signers: [],
      };
    }

    return {
      instructions: swapIxs,
      signers: [],
    };
  }

  // ----- getPrice -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const dao = new PublicKey(poolAddress);

    const provider = createProvider();
    const sdk = new FutarchyAmmSDK(provider);

    const daoAccount = await sdk.getDao(dao);
    if (!daoAccount) {
      throw new Error(`DAO not found: ${dao.toBase58()}`);
    }

    const amm = daoAccount.amm;
    const spotPool = extractSpotPool(amm.state);

    if (!spotPool) {
      throw new Error(`Spot pool not found in DAO ${dao.toBase58()}`);
    }

    const quoteReserves = Number(spotPool.quoteReserves);
    const baseReserves = Number(spotPool.baseReserves);

    if (baseReserves === 0) {
      throw new Error(`Base reserves are zero for DAO ${dao.toBase58()}`);
    }

    // Calculate price: (quote_reserves * PRICE_SCALE) / base_reserves
    const price = (quoteReserves * PRICE_SCALE) / baseReserves;

    // Get mint decimals for UI price conversion
    const baseMint = new PublicKey(amm.baseMint);
    const quoteMint = new PublicKey(amm.quoteMint);

    const baseMintInfo = await getMint(connection, baseMint);
    const quoteMintInfo = await getMint(connection, quoteMint);

    const baseDecimals = baseMintInfo.decimals;
    const quoteDecimals = quoteMintInfo.decimals;

    // Convert to UI price: ui_price = (price * (10**(base_decimals - quote_decimals))) / PRICE_SCALE
    const decimalsDiff = baseDecimals - quoteDecimals;
    const decimalsMultiplier = Math.pow(10, decimalsDiff);
    const uiPrice = (price * decimalsMultiplier) / PRICE_SCALE;

    const realPrice = uiPrice;

    return {
      price: realPrice,
      baseMint: baseMint.toBase58(),
      quoteMint: quoteMint.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new FutarchyAmmAdapter());
