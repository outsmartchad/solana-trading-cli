/**
 * Jupiter Swap (Metis) — IDexAdapter Implementation
 *
 * Standard Jupiter Swap API v6 (Metis routing engine). Unlike Jupiter Ultra
 * (intent-based, gasless), this adapter gives full control over the transaction:
 *   1. GET /swap/v1/quote — get best route
 *   2. POST /swap/v1/swap — get serialized transaction
 *   3. Deserialize, sign, and send via our own RPC (sendAndConfirmVtx is NOT
 *      used here — Jupiter returns a complete VersionedTransaction, not raw
 *      instructions, so we deserialize-sign-send directly)
 *
 * Capabilities: canBuy, canSell (aggregator — no pool concept)
 * API key from JUPITER_API_KEY env var.
 */

import {
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import {
  getMint,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { getWallet, getConnection } from "../helpers/config";

import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SwapResult,
  requireTokenMint,
  WSOL_MINT,
  DEFAULT_SLIPPAGE_BPS,
} from "./types";

import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUPITER_SWAP_API_BASE_URL = "https://api.jup.ag/swap/v1";

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: unknown | null;
  priceImpactPct: string;
  routePlan: unknown[];
  contextSlot: number;
  timeTaken: number;
  error?: string;
  errorCode?: string;
}

interface JupiterSwapResponse {
  swapTransaction: string; // Base64 encoded VersionedTransaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  dynamicSlippageReport?: {
    slippageBps: number;
    otherAmount: number;
    simulatedIncurredSlippageBps: number;
  };
  simulationError: string | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.JUPITER_API_KEY;
  if (!key) {
    throw new Error(
      "JUPITER_API_KEY not set. Set the JUPITER_API_KEY environment variable to use Jupiter Swap.",
    );
  }
  return key;
}

/**
 * Get token decimals for a mint (supports Token-2022).
 */
async function getTokenDecimals(mint: PublicKey): Promise<number> {
  const connection = getConnection();
  try {
    const mintInfo = await connection.getAccountInfo(mint);
    if (!mintInfo) {
      throw new Error(`Mint account not found: ${mint.toBase58()}`);
    }
    const tokenProgram = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    const mintData = await getMint(connection, mint, undefined, tokenProgram);
    return mintData.decimals;
  } catch {
    return 9;
  }
}

/**
 * Get a quote from Jupiter Swap API (Metis engine).
 */
async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number,
): Promise<JupiterQuoteResponse> {
  const url = new URL(`${JUPITER_SWAP_API_BASE_URL}/quote`);
  url.searchParams.append("inputMint", inputMint);
  url.searchParams.append("outputMint", outputMint);
  url.searchParams.append("amount", amount);
  url.searchParams.append("slippageBps", slippageBps.toString());
  url.searchParams.append("restrictIntermediateTokens", "true");

  const response = await fetch(url.toString(), {
    headers: {
      "x-api-key": getApiKey(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jupiter Swap quote error (${response.status}): ${errorText}`,
    );
  }

  const quoteData: JupiterQuoteResponse = await response.json();

  if (quoteData.error) {
    throw new Error(`Jupiter Swap quote error: ${quoteData.error}`);
  }

  return quoteData;
}

/**
 * Build a swap transaction from a quote via Jupiter Swap API.
 */
async function buildSwapTransaction(
  quoteResponse: JupiterQuoteResponse,
  userPublicKey: string,
): Promise<JupiterSwapResponse> {
  const response = await fetch(`${JUPITER_SWAP_API_BASE_URL}/swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1_000_000,
          priorityLevel: "veryHigh",
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jupiter Swap transaction build error (${response.status}): ${errorText}`,
    );
  }

  const swapData: JupiterSwapResponse = await response.json();

  if (swapData.error) {
    throw new Error(`Jupiter Swap build error: ${swapData.error}`);
  }

  if (swapData.simulationError) {
    throw new Error(
      `Jupiter Swap simulation error: ${swapData.simulationError}`,
    );
  }

  if (!swapData.swapTransaction) {
    throw new Error("Jupiter Swap response missing swapTransaction field");
  }

  return swapData;
}

/**
 * Full quote → build → sign → send flow. Used by both buy() and sell().
 */
async function executeSwap(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number,
): Promise<{
  signature: string;
  quoteResponse: JupiterQuoteResponse;
}> {
  const wallet = getWallet();
  const connection = getConnection();

  // Step 1: Get quote
  const quoteResponse = await getQuote(
    inputMint,
    outputMint,
    amount,
    slippageBps,
  );

  // Step 2: Build swap transaction
  const swapResponse = await buildSwapTransaction(
    quoteResponse,
    wallet.publicKey.toBase58(),
  );

  // Step 3: Deserialize and sign
  const transactionBytes = Buffer.from(swapResponse.swapTransaction, "base64");
  const versionedTx = VersionedTransaction.deserialize(transactionBytes);
  versionedTx.sign([wallet]);

  // Step 4: Send via our own RPC
  const signature = await connection.sendRawTransaction(
    versionedTx.serialize(),
    {
      skipPreflight: true,
      maxRetries: 2,
    },
  );

  // Step 5: Confirm
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );

  return { signature, quoteResponse };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class JupiterSwapAdapter implements IDexAdapter {
  readonly name = "jupiter-swap";
  readonly protocol = "swap";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    isAggregator: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { amountSol, opts } = params;
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    // Convert SOL to lamports
    const amount = Math.floor(amountSol * 1_000_000_000).toString();

    const { signature, quoteResponse } = await executeSwap(
      SOL_MINT,
      tokenMint,
      amount,
      slippageBps,
    );

    // Parse output amount
    let amountOut: number | undefined;
    if (quoteResponse.outAmount) {
      const outDecimals = await getTokenDecimals(new PublicKey(tokenMint));
      amountOut = Number(quoteResponse.outAmount) / Math.pow(10, outDecimals);
    }

    return {
      txSignature: signature,
      confirmed: true,
      amountIn: amountSol,
      amountInToken: SOL_MINT,
      amountOut,
      amountOutToken: tokenMint,
      priceImpactPct: quoteResponse.priceImpactPct
        ? parseFloat(quoteResponse.priceImpactPct)
        : undefined,
      dex: this.name,
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { percentage, quoteMint: quoteMintParam, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const outputMint = quoteMintParam ?? SOL_MINT;

    // Validate percentage
    if (percentage < 0 || percentage > 100) {
      throw new Error("Sell percentage must be between 0 and 100");
    }

    // Get token decimals
    const tokenDecimals = await getTokenDecimals(new PublicKey(tokenMint));

    // Get token balance
    const mintPk = new PublicKey(tokenMint);
    const mintInfo = await connection.getAccountInfo(mintPk);
    const tokenProgram =
      mintInfo && mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

    const tokenAccount = await getAssociatedTokenAddress(
      mintPk,
      wallet.publicKey,
      false,
      tokenProgram,
    );

    let balance = 0;
    try {
      const balanceResponse = await connection.getTokenAccountBalance(tokenAccount);
      balance = balanceResponse.value.uiAmount || 0;
    } catch {
      balance = 0;
    }

    if (balance === 0) {
      throw new Error("You have no balance of this token to sell");
    }

    // Calculate amount
    const tokenAmount = (balance * percentage) / 100;
    const amount = Math.floor(tokenAmount * Math.pow(10, tokenDecimals)).toString();

    const { signature, quoteResponse } = await executeSwap(
      tokenMint,
      outputMint,
      amount,
      slippageBps,
    );

    // Convert raw output to human-readable
    let amountOut: number | undefined;
    if (quoteResponse.outAmount) {
      const outDecimals = outputMint === SOL_MINT ? 9 : await getTokenDecimals(new PublicKey(outputMint));
      amountOut = Number(quoteResponse.outAmount) / Math.pow(10, outDecimals);
    }

    return {
      txSignature: signature,
      confirmed: true,
      amountIn: tokenAmount,
      amountInToken: tokenMint,
      amountOut,
      amountOutToken: outputMint,
      priceImpactPct: quoteResponse.priceImpactPct
        ? parseFloat(quoteResponse.priceImpactPct)
        : undefined,
      dex: this.name,
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new JupiterSwapAdapter());
