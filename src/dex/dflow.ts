/**
 * DFlow — IDexAdapter Implementation
 *
 * Intent-based swap API. DFlow uses an aggregator API that returns
 * server-generated transactions. The flow is:
 *   1. Request intent (quote) from DFlow API
 *   2. Sign the returned openTransaction
 *   3. Submit the signed transaction back to DFlow's submit-intent endpoint
 *   4. DFlow handles execution and order monitoring
 *
 * This adapter does NOT use our landing layer — DFlow manages TX submission.
 * Similar to Jupiter Ultra in that the server generates the transaction.
 *
 * Source: 100x-algo-bots/trading-modules/DFlow/swap.ts
 *
 * Capabilities: canBuy, canSell (intent-based, no pool concept)
 * API key from DFLOW_API_KEY env var.
 */

import {
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";

import { getWallet, getConnection } from "../helpers/config";
import { getTokenProgram } from "../helpers/token-2022";

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
const AGGREGATOR_API_BASE_URL = "https://quote-api.dflow.net";

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface DFlowIntentResponse {
  openTransaction: string; // base64 encoded transaction
  orderAddress?: string;
  [key: string]: unknown; // quote data
}

interface DFlowSubmitResponse {
  orderAddress?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string | undefined {
  return process.env.DFLOW_API_KEY;
}

function buildHeaders(includeContentType = false): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = getApiKey();
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

/**
 * Parse API error response into a readable string.
 */
async function parseApiError(response: Response, context: string): Promise<string> {
  let errorText = "";
  try {
    errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      errorText = JSON.stringify(errorJson, null, 2);
    } catch {
      // Not JSON, use as-is
    }
  } catch (e) {
    errorText = `Failed to read error response: ${e}`;
  }
  return `DFlow ${context} error (${response.status}): ${errorText || "No error message"}`;
}

/**
 * Request an intent (quote + transaction) from DFlow API.
 */
async function requestIntent(
  inputMint: string,
  outputMint: string,
  amount: string,
  userPublicKey: string,
  slippageBps: number,
): Promise<DFlowIntentResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append("inputMint", inputMint);
  queryParams.append("outputMint", outputMint);
  queryParams.append("amount", amount);
  queryParams.append("userPublicKey", userPublicKey);
  queryParams.append("slippageBps", slippageBps.toString());

  const response = await fetch(
    `${AGGREGATOR_API_BASE_URL}/intent?${queryParams.toString()}`,
    { headers: buildHeaders() },
  );

  if (!response.ok) {
    const errMsg = await parseApiError(response, "intent");
    throw new Error(errMsg);
  }

  return (await response.json()) as DFlowIntentResponse;
}

/**
 * Sign the intent's openTransaction and submit it back to DFlow.
 */
async function signAndSubmitIntent(
  intentData: DFlowIntentResponse,
): Promise<DFlowSubmitResponse> {
  const wallet = getWallet();

  // Decode and sign the transaction
  const transactionBytes = Buffer.from(intentData.openTransaction, "base64");
  const openTransaction = Transaction.from(transactionBytes);
  openTransaction.sign(wallet);

  const signedTxBase64 = Buffer.from(openTransaction.serialize()).toString("base64");

  // Submit the signed intent
  const response = await fetch(`${AGGREGATOR_API_BASE_URL}/submit-intent`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify({
      quoteResponse: intentData,
      signedOpenTransaction: signedTxBase64,
    }),
  });

  if (!response.ok) {
    const errMsg = await parseApiError(response, "submit");
    throw new Error(errMsg);
  }

  return (await response.json()) as DFlowSubmitResponse;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class DFlowAdapter implements IDexAdapter {
  readonly name = "dflow";
  readonly protocol = "intent";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const { tokenMint, amountSol, opts } = params;
    const wallet = getWallet();
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    // Convert SOL to lamports
    const amount = Math.floor(amountSol * 1_000_000_000).toString();

    // Step 1: Request intent
    const intentData = await requestIntent(
      SOL_MINT,
      tokenMint,
      amount,
      wallet.publicKey.toBase58(),
      slippageBps,
    );

    // Step 2: Sign and submit
    const submitResponse = await signAndSubmitIntent(intentData);

    return {
      txSignature: submitResponse.orderAddress ?? "",
      confirmed: !!submitResponse.orderAddress,
      amountIn: amountSol,
      amountInToken: SOL_MINT,
      dex: this.name,
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const { tokenMint, percentage, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    // Validate percentage
    if (percentage < 0 || percentage > 100) {
      throw new Error("Sell percentage must be between 0 and 100");
    }

    // Get token info (supports Token-2022)
    const mintPublicKey = new PublicKey(tokenMint);
    const tokenProgram = await getTokenProgram(connection, mintPublicKey);
    const mintInfo = await getMint(connection, mintPublicKey, undefined, tokenProgram);
    const tokenDecimals = mintInfo.decimals;

    // Get user's token balance
    const tokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
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

    // Calculate amount to sell based on percentage
    const tokenAmount = (balance * percentage) / 100;
    const amount = Math.floor(tokenAmount * Math.pow(10, tokenDecimals)).toString();

    // Step 1: Request intent
    const intentData = await requestIntent(
      tokenMint,
      SOL_MINT,
      amount,
      wallet.publicKey.toBase58(),
      slippageBps,
    );

    // Step 2: Sign and submit
    const submitResponse = await signAndSubmitIntent(intentData);

    return {
      txSignature: submitResponse.orderAddress ?? "",
      confirmed: !!submitResponse.orderAddress,
      amountIn: tokenAmount,
      amountInToken: tokenMint,
      amountOut: undefined, // DFlow doesn't return exact output in submit response
      amountOutToken: SOL_MINT,
      dex: this.name,
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new DFlowAdapter());
