/**
 * Simple RPC-based transaction submission with confirmation.
 *
 * Use this for normal swap operations (buy/sell/LP).
 * For competitive/low-latency submissions (sniping), use the landing orchestrator.
 *
 * Features:
 *   - Pre-send simulation to catch errors before paying fees
 *   - Exponential backoff on transient RPC errors (429, 503, network)
 *   - Dry-run mode for previewing TX without spending
 *   - Blockhash expiry retry (fresh blockhash on timeout)
 *
 * Two helpers:
 *   - sendAndConfirmVtx()   — builds a V0 transaction from instructions, signs, sends, confirms
 *   - sendAndConfirmLegacyTx() — takes a pre-built legacy Transaction from an SDK, assigns fresh
 *     blockhash, signs, sends, confirms. Use this when the SDK returns a complete Transaction
 *     object (e.g. DLMM initializePositionAndAddLiquidityByStrategy).
 */

import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
  SendOptions,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Helpers — backoff & transient error detection
// ---------------------------------------------------------------------------

/** Check if an error is transient (worth retrying with backoff) */
function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("503") ||
    msg.includes("Service Unavailable") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("socket hang up") ||
    msg.includes("fetch failed")
  );
}

/** Sleep with exponential backoff: base * 2^attempt (capped at 10s) */
function backoffDelay(attempt: number, baseMs = 500): Promise<void> {
  const ms = Math.min(baseMs * Math.pow(2, attempt), 10_000);
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry an async operation with exponential backoff on transient errors */
async function withBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < maxRetries && isTransientError(err)) {
        const delayMs = Math.min(500 * Math.pow(2, attempt), 10_000);
        console.log(`  RPC ${label}: transient error, retrying in ${delayMs}ms (${attempt + 1}/${maxRetries})...`);
        await backoffDelay(attempt);
        continue;
      }
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Global dry-run mode — set by CLI, checked by send functions
// ---------------------------------------------------------------------------

let _globalDryRun = false;

/** Enable or disable global dry-run mode. When enabled, all send functions simulate without sending. */
export function setDryRunMode(enabled: boolean): void {
  _globalDryRun = enabled;
}

/** Check if global dry-run mode is active. */
export function isDryRunMode(): boolean {
  return _globalDryRun;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendRpcOptions {
  /** Extra signers beyond the primary wallet */
  extraSigners?: Keypair[];
  /** Address lookup table accounts for V0 message compilation */
  addressLookupTables?: AddressLookupTableAccount[];
  /** Commitment level for confirmation (default: "confirmed") */
  commitment?: "processed" | "confirmed" | "finalized";
  /** Skip preflight simulation (default: true — we handle errors on-chain) */
  skipPreflight?: boolean;
  /** Max retries on blockhash expiry / confirmation timeout (default: 2, so 3 total attempts) */
  maxRetries?: number;
  /**
   * Simulate the transaction before sending (default: true).
   * If simulation fails, returns error without sending (saves fees).
   */
  simulate?: boolean;
  /**
   * Dry-run mode — simulate the TX and return results without sending.
   * Useful for previewing CU usage and catching errors.
   */
  dryRun?: boolean;
}

export interface SendRpcResult {
  txSignature: string;
  confirmed: boolean;
  error?: string;
  /** Compute units consumed (from simulation, if available) */
  computeUnitsConsumed?: number;
  /** Whether this was a dry-run (simulated only, not sent) */
  dryRun?: boolean;
}

/**
 * Build, sign, send, and confirm a V0 transaction via the standard RPC.
 *
 * This is the simple path: sendRawTransaction + confirmTransaction.
 * No tips, no multi-provider fanout — just your RPC node.
 *
 * Pre-send simulation is enabled by default to catch errors before paying fees.
 * Use `opts.simulate = false` to disable (e.g. for time-sensitive operations).
 * Use `opts.dryRun = true` to simulate without sending.
 */
export async function sendAndConfirmVtx(
  connection: Connection,
  ixs: TransactionInstruction[],
  signer: Keypair,
  opts?: SendRpcOptions,
): Promise<SendRpcResult> {
  const totalAttempts = (opts?.maxRetries ?? 2) + 1;
  const shouldSimulate = opts?.simulate ?? true;
  const isDryRun = opts?.dryRun ?? _globalDryRun;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const blockhash = await withBackoff(
      () => connection.getLatestBlockhash("confirmed"),
      "getLatestBlockhash",
    );

    const message = new TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: ixs,
    });

    const lookupTables = opts?.addressLookupTables ?? [];
    const messageV0 = message.compileToV0Message(lookupTables);
    const tx = new VersionedTransaction(messageV0);

    const signers: Keypair[] = [signer, ...(opts?.extraSigners ?? [])];
    tx.sign(signers);

    // --- Pre-send simulation ---
    if (shouldSimulate || isDryRun) {
      try {
        const simResult = await withBackoff(
          () => connection.simulateTransaction(tx, { commitment: "confirmed" }),
          "simulateTransaction",
        );

        const cuUsed = simResult.value.unitsConsumed ?? undefined;

        if (simResult.value.err) {
          const simErr = JSON.stringify(simResult.value.err);
          const logs = simResult.value.logs?.slice(-5).join("\n    ") ?? "";
          console.log(`  Simulation failed: ${simErr}`);
          if (logs) console.log(`  Last logs:\n    ${logs}`);
          return {
            txSignature: "",
            confirmed: false,
            error: `Simulation failed: ${simErr}`,
            computeUnitsConsumed: cuUsed,
            dryRun: isDryRun || undefined,
          };
        }

        if (isDryRun) {
          console.log(`  Dry-run simulation passed`);
          if (cuUsed != null) console.log(`  Compute units: ${cuUsed.toLocaleString()}`);
          const logs = simResult.value.logs;
          if (logs && logs.length > 0) {
            console.log(`  Program logs (last 10):`);
            for (const line of logs.slice(-10)) {
              console.log(`    ${line}`);
            }
          }
          return {
            txSignature: "",
            confirmed: false,
            computeUnitsConsumed: cuUsed,
            dryRun: true,
          };
        }

        // Simulation passed — proceed to send
        if (cuUsed != null) {
          console.log(`  Simulation OK (${cuUsed.toLocaleString()} CU)`);
        }
      } catch (simError) {
        // Simulation RPC call itself failed — log but proceed to send anyway
        const simErrMsg = simError instanceof Error ? simError.message : String(simError);
        console.log(`  Simulation call failed (${simErrMsg}) — proceeding to send...`);
      }
    }

    const sendOpts: SendOptions = {
      skipPreflight: opts?.skipPreflight ?? true,
      maxRetries: 3,
    };

    let signature: string;
    try {
      signature = await withBackoff(
        () => connection.sendRawTransaction(tx.serialize(), sendOpts),
        "sendRawTransaction",
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return { txSignature: "", confirmed: false, error: `Send failed: ${errMsg}` };
    }

    console.log(`  TX sent: ${signature} — confirming...`);

    try {
      const commitment = opts?.commitment ?? "confirmed";
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        },
        commitment,
      );

      // Program errors are permanent — no retry
      if (confirmation.value.err) {
        return {
          txSignature: signature,
          confirmed: false,
          error: JSON.stringify(confirmation.value.err),
        };
      }

      return {
        txSignature: signature,
        confirmed: true,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      // Blockhash expiry / confirmation timeout — retry with fresh blockhash
      if (attempt < totalAttempts) {
        console.log(`  TX expired, retrying (attempt ${attempt + 1}/${totalAttempts})...`);
        continue;
      }

      return {
        txSignature: signature,
        confirmed: false,
        error: `Confirmation failed: ${errMsg}`,
      };
    }
  }

  // Unreachable — the loop always returns — but satisfies the compiler
  return { txSignature: "", confirmed: false, error: "Unexpected: exhausted retries" };
}

// ---------------------------------------------------------------------------
// Legacy Transaction helper
// ---------------------------------------------------------------------------

export interface SendLegacyTxOptions {
  /** Extra signers beyond the primary wallet (e.g. new position keypair) */
  extraSigners?: Keypair[];
  /** Commitment level for confirmation (default: "confirmed") */
  commitment?: "processed" | "confirmed" | "finalized";
  /**
   * Simulate the transaction before sending (default: true).
   * If simulation fails, returns error without sending (saves fees).
   */
  simulate?: boolean;
  /**
   * Dry-run mode — simulate the TX and return results without sending.
   */
  dryRun?: boolean;
}

/**
 * Send a pre-built legacy Transaction from an SDK.
 *
 * Assigns a fresh blockhash right before sending so the TX doesn't expire
 * even if the SDK took a long time to build it (e.g. DLMM LP operations).
 *
 * Use this instead of sendAndConfirmVtx when the SDK returns a complete
 * Transaction object rather than raw instructions.
 */
export async function sendAndConfirmLegacyTx(
  connection: Connection,
  tx: Transaction,
  signer: Keypair,
  opts?: SendLegacyTxOptions,
): Promise<SendRpcResult> {
  // Assign fresh blockhash right before sending
  const blockhash = await withBackoff(
    () => connection.getLatestBlockhash("confirmed"),
    "getLatestBlockhash",
  );
  tx.recentBlockhash = blockhash.blockhash;
  tx.feePayer = signer.publicKey;

  const signers: Keypair[] = [signer, ...(opts?.extraSigners ?? [])];
  const shouldSimulate = opts?.simulate ?? true;
  const isDryRun = opts?.dryRun ?? _globalDryRun;

  // --- Pre-send simulation for legacy TX ---
  if (shouldSimulate || isDryRun) {
    try {
      // Sign temporarily for simulation
      tx.sign(...signers);
      const simResult = await withBackoff(
        () => connection.simulateTransaction(tx),
        "simulateTransaction",
      );

      const cuUsed = simResult.value.unitsConsumed ?? undefined;

      if (simResult.value.err) {
        const simErr = JSON.stringify(simResult.value.err);
        const logs = simResult.value.logs?.slice(-5).join("\n    ") ?? "";
        console.log(`  Simulation failed: ${simErr}`);
        if (logs) console.log(`  Last logs:\n    ${logs}`);
        return {
          txSignature: "",
          confirmed: false,
          error: `Simulation failed: ${simErr}`,
          computeUnitsConsumed: cuUsed,
          dryRun: isDryRun || undefined,
        };
      }

      if (isDryRun) {
        console.log(`  Dry-run simulation passed`);
        if (cuUsed != null) console.log(`  Compute units: ${cuUsed.toLocaleString()}`);
        return {
          txSignature: "",
          confirmed: false,
          computeUnitsConsumed: cuUsed,
          dryRun: true,
        };
      }

      if (cuUsed != null) {
        console.log(`  Simulation OK (${cuUsed.toLocaleString()} CU)`);
      }
    } catch (simError) {
      const simErrMsg = simError instanceof Error ? simError.message : String(simError);
      console.log(`  Simulation call failed (${simErrMsg}) — proceeding to send...`);
    }
  }

  try {
    const signature = await withBackoff(
      () => sendAndConfirmTransaction(
        connection,
        tx,
        signers,
        {
          commitment: opts?.commitment ?? "confirmed",
          skipPreflight: true,
          maxRetries: 3,
        },
      ),
      "sendAndConfirmTransaction",
    );

    return {
      txSignature: signature,
      confirmed: true,
    };
  } catch (error) {
    // sendAndConfirmTransaction throws on failure — extract signature if possible
    const errMsg = error instanceof Error ? error.message : String(error);
    // Try to extract signature from error message
    const sigMatch = errMsg.match(/[1-9A-HJ-NP-Za-km-z]{87,88}/);
    return {
      txSignature: sigMatch ? sigMatch[0] : "",
      confirmed: false,
      error: errMsg,
    };
  }
}
