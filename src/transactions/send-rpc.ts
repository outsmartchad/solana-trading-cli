/**
 * Simple RPC-based transaction submission with confirmation.
 *
 * Use this for normal swap operations (buy/sell/LP).
 * For competitive/low-latency submissions (sniping), use the landing orchestrator.
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
}

export interface SendRpcResult {
  txSignature: string;
  confirmed: boolean;
  error?: string;
}

/**
 * Build, sign, send, and confirm a V0 transaction via the standard RPC.
 *
 * This is the simple path: sendRawTransaction + confirmTransaction.
 * No tips, no multi-provider fanout — just your RPC node.
 */
export async function sendAndConfirmVtx(
  connection: Connection,
  ixs: TransactionInstruction[],
  signer: Keypair,
  opts?: SendRpcOptions,
): Promise<SendRpcResult> {
  const totalAttempts = (opts?.maxRetries ?? 2) + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const blockhash = await connection.getLatestBlockhash("confirmed");

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

    const sendOpts: SendOptions = {
      skipPreflight: opts?.skipPreflight ?? true,
      maxRetries: 3,
    };

    let signature: string;
    try {
      signature = await connection.sendRawTransaction(tx.serialize(), sendOpts);
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
  const blockhash = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash.blockhash;
  tx.feePayer = signer.publicKey;

  const signers: Keypair[] = [signer, ...(opts?.extraSigners ?? [])];

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      signers,
      {
        commitment: opts?.commitment ?? "confirmed",
        skipPreflight: true,
        maxRetries: 3,
      },
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
