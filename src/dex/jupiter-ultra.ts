/**
 * Jupiter Ultra — IDexAdapter Implementation
 *
 * REST API-based aggregator. Fundamentally different from on-chain adapters:
 *   1. Get order from Jupiter Ultra API (server returns a transaction)
 *   2. Deserialize and sign the transaction locally
 *   3. Submit via Jupiter's execute API (NOT our landing layer)
 *   4. Jupiter handles TX submission with built-in retry
 *
 * This adapter does NOT use landTransaction() — the Jupiter execute endpoint
 * manages TX submission. The adapter wraps the server-generated flow.
 *
 * Source: 100x-algo-bots/trading-modules/jupiter/ultra-swap.ts
 *
 * Capabilities: canBuy, canSell (no snipe — doesn't make sense for an aggregator,
 * no findPool/getPrice — no pool concept)
 * API key from JUPITER_API_KEY env var.
 */

import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { getMint, getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { getWallet, getConnection } from "../helpers/config";

import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SwapResult,
  UnsupportedOperationError,
  WSOL_MINT,
  DEFAULT_SLIPPAGE_BPS,
} from "./types";

import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUPITER_ULTRA_API_BASE_URL = "https://api.jup.ag/ultra/v1";

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface JupiterUltraOrderResponse {
  mode: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan?: unknown[];
  feeMint?: string;
  feeBps?: number;
  taker?: string;
  gasless?: boolean;
  signatureFeeLamports?: number;
  transaction?: string; // Base64 encoded transaction
  prioritizationFeeLamports?: number;
  rentFeeLamports?: number;
  inputMint: string;
  outputMint: string;
  swapType?: string;
  router?: string;
  requestId?: string;
  inUsdValue?: number;
  outUsdValue?: number;
  priceImpact?: number;
  swapUsdValue?: number;
  totalTime?: number;
  error?: string;
  errorCode?: number;
  errorMessage?: string;
}

interface JupiterUltraExecuteResponse {
  status?: string;
  signature?: string;
  slot?: string;
  code?: number;
  inputAmountResult?: string;
  outputAmountResult?: string;
  swapEvents?: Array<{
    inputMint: string;
    inputAmount: string;
    outputMint: string;
    outputAmount: string;
  }>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.JUPITER_API_KEY;
  if (!key) {
    throw new Error(
      "JUPITER_API_KEY not set. Set the JUPITER_API_KEY environment variable to use Jupiter Ultra.",
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
    // Default to 9 decimals if we can't fetch (common for most tokens)
    return 9;
  }
}

/**
 * Get order from Jupiter Ultra API.
 */
async function getUltraOrder(
  inputMint: string,
  outputMint: string,
  amount: string,
  taker: string,
  slippageBps?: number,
): Promise<JupiterUltraOrderResponse> {
  const url = new URL(`${JUPITER_ULTRA_API_BASE_URL}/order`);
  url.searchParams.append("inputMint", inputMint);
  url.searchParams.append("outputMint", outputMint);
  url.searchParams.append("amount", amount);
  url.searchParams.append("taker", taker);

  if (slippageBps !== undefined) {
    url.searchParams.append("slippageBps", slippageBps.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      "x-api-key": getApiKey(),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw new Error(
      `Jupiter Ultra API error (${response.status}): ${JSON.stringify(errorData)}`,
    );
  }

  const orderData: JupiterUltraOrderResponse = await response.json();

  if (orderData.error) {
    throw new Error(`Jupiter Ultra order error: ${orderData.error}`);
  }

  if (orderData.errorCode) {
    throw new Error(
      `Jupiter Ultra order error (code ${orderData.errorCode}): ${orderData.errorMessage || "Unknown error"}`,
    );
  }

  if (!orderData.transaction) {
    throw new Error("Jupiter Ultra order response missing transaction field");
  }

  return orderData;
}

/**
 * Check if an error code is retryable.
 * Retryable: network issues, timeouts, failed to land, unknown errors.
 * Non-retryable: authentication, invalid transaction, slippage exceeded, etc.
 */
function isRetryableError(executeResponse: JupiterUltraExecuteResponse): boolean {
  if (!executeResponse.code) {
    return executeResponse.status !== "Success";
  }

  if (executeResponse.code === 0) return false;

  // Retryable error codes (network/landing issues)
  const retryableCodes = [
    -1000, // Failed to land
    -1001, // Unknown error
    -1005, // Expired (might succeed on retry with fresh order)
    -1006, // Timed out
    -2000, // RFQ: Failed to land
    -2001, // RFQ: Unknown error
  ];

  // Non-retryable error codes
  const nonRetryableCodes = [
    -1, // Missing cached order
    -2, // Invalid signed transaction
    -3, // Invalid message bytes
    -4, // Missing request id
    -5, // Missing signed transaction
    -1002, // Invalid transaction
    -1003, // Transaction not fully signed
    -1004, // Invalid block height
    -1007, // Gasless unsupported wallet
    -2002, // RFQ: Invalid payload
    -2003, // RFQ: Quote expired
    -2004, // RFQ: Swap rejected
    -2005, // RFQ: Internal error
  ];

  if (retryableCodes.includes(executeResponse.code)) return true;
  if (nonRetryableCodes.includes(executeResponse.code)) return false;

  // Positive codes are program errors (slippage, etc.) — don't retry
  if (executeResponse.code > 0) return false;

  // Other negative codes — default to retryable
  return true;
}

/**
 * Execute order via Jupiter Ultra API with retry logic.
 */
async function executeUltraOrderWithRetry(
  requestId: string,
  signedTransaction: string,
  maxRetries = 5,
  retryDelayMs = 5000,
): Promise<JupiterUltraExecuteResponse> {
  let lastResponse: JupiterUltraExecuteResponse | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${JUPITER_ULTRA_API_BASE_URL}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": getApiKey(),
        },
        body: JSON.stringify({ requestId, signedTransaction }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(
          `Jupiter Ultra execute error (${response.status}): ${JSON.stringify(errorData)}`,
        );
      }

      const executeResponse: JupiterUltraExecuteResponse = await response.json();
      lastResponse = executeResponse;

      // Check if successful
      if (executeResponse.status === "Success" && executeResponse.signature) {
        return executeResponse;
      }
      if (executeResponse.code === 0 && executeResponse.signature) {
        return executeResponse;
      }

      // Non-retryable error — throw immediately
      if (!isRetryableError(executeResponse)) {
        throw new Error(
          `Jupiter Ultra execute failed (code ${executeResponse.code}): ${executeResponse.error || "Unknown error"}`,
        );
      }

      // Retryable error — wait and try again
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        throw new Error(
          `Jupiter Ultra execute failed after ${maxRetries} attempts (code ${executeResponse.code}): ${executeResponse.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      // Network errors are retryable
      if (
        error instanceof Error &&
        (error.message.includes("fetch") ||
          error.message.includes("network") ||
          error.message.includes("timeout") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT"))
      ) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }
      }
      throw error;
    }
  }

  // Should not reach here
  if (lastResponse) {
    throw new Error(
      `Jupiter Ultra execute failed after ${maxRetries} attempts: ${JSON.stringify(lastResponse)}`,
    );
  }
  throw new Error(`Jupiter Ultra execute failed after ${maxRetries} attempts`);
}

/**
 * Sign a server-generated transaction (handles both legacy and versioned).
 * Returns the base64-encoded signed transaction.
 */
function signTransaction(transactionBase64: string): string {
  const wallet = getWallet();
  const transactionBytes = Buffer.from(transactionBase64, "base64");

  try {
    // Try as VersionedTransaction first (most common for Jupiter)
    const versionedTx = VersionedTransaction.deserialize(transactionBytes);
    versionedTx.sign([wallet]);
    return Buffer.from(versionedTx.serialize()).toString("base64");
  } catch {
    // Fallback to legacy Transaction
    const legacyTx = Transaction.from(transactionBytes);
    legacyTx.sign(wallet);
    return Buffer.from(legacyTx.serialize()).toString("base64");
  }
}

/**
 * Full order-sign-execute flow. Used by both buy() and sell().
 */
async function executeOrder(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number,
): Promise<{
  signature: string;
  orderResponse: JupiterUltraOrderResponse;
  executeResponse: JupiterUltraExecuteResponse;
}> {
  const wallet = getWallet();

  // Step 1: Get order
  const orderResponse = await getUltraOrder(
    inputMint,
    outputMint,
    amount,
    wallet.publicKey.toBase58(),
    slippageBps,
  );

  if (!orderResponse.transaction) {
    throw new Error("Order response missing transaction field");
  }
  if (!orderResponse.requestId) {
    throw new Error("Order response missing requestId");
  }

  // Step 2: Sign
  const signedTxBase64 = signTransaction(orderResponse.transaction);

  // Step 3: Execute with retry
  const executeResponse = await executeUltraOrderWithRetry(
    orderResponse.requestId,
    signedTxBase64,
  );

  // Validate response
  const signature =
    executeResponse.signature ??
    (() => {
      throw new Error(
        `Jupiter Ultra execute returned unexpected response: ${JSON.stringify(executeResponse)}`,
      );
    })();

  return { signature, orderResponse, executeResponse };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class JupiterUltraAdapter implements IDexAdapter {
  readonly name = "jupiter-ultra";
  readonly protocol = "ultra";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    isAggregator: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const { tokenMint, amountSol, opts } = params;
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    // Convert SOL to lamports
    const amount = Math.floor(amountSol * 1_000_000_000).toString();

    const { signature, orderResponse, executeResponse } = await executeOrder(
      SOL_MINT,
      tokenMint,
      amount,
      slippageBps,
    );

    // Parse output amount — convert from raw to human-readable
    let amountOut: number | undefined;
    if (executeResponse.outputAmountResult) {
      const outDecimals = await getTokenDecimals(new PublicKey(tokenMint));
      amountOut = Number(executeResponse.outputAmountResult) / Math.pow(10, outDecimals);
    }

    return {
      txSignature: signature,
      confirmed: true,
      amountIn: amountSol,
      amountInToken: SOL_MINT,
      amountOut,
      amountOutToken: tokenMint,
      priceImpactPct: orderResponse.priceImpactPct
        ? parseFloat(orderResponse.priceImpactPct)
        : undefined,
      dex: this.name,
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const { tokenMint, percentage, quoteMint: quoteMintParam, opts } = params;
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

    const { signature, orderResponse, executeResponse } = await executeOrder(
      tokenMint,
      outputMint,
      amount,
      slippageBps,
    );

    // Convert raw output to human-readable (SOL = 9 decimals)
    let amountOut: number | undefined;
    if (executeResponse.outputAmountResult) {
      const outDecimals = outputMint === SOL_MINT ? 9 : await getTokenDecimals(new PublicKey(outputMint));
      amountOut = Number(executeResponse.outputAmountResult) / Math.pow(10, outDecimals);
    }

    return {
      txSignature: signature,
      confirmed: true,
      amountIn: tokenAmount,
      amountInToken: tokenMint,
      amountOut,
      amountOutToken: outputMint,
      priceImpactPct: orderResponse.priceImpactPct
        ? parseFloat(orderResponse.priceImpactPct)
        : undefined,
      dex: this.name,
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new JupiterUltraAdapter());
