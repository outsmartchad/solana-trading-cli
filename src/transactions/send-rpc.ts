/**
 * Simple RPC-based transaction submission with confirmation.
 *
 * Use this for normal swap operations (buy/sell/LP).
 * For competitive/low-latency submissions (sniping), use the landing orchestrator.
 */

import {
  Connection,
  Keypair,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
  SendOptions,
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

  const signature = await connection.sendRawTransaction(tx.serialize(), sendOpts);

  const commitment = opts?.commitment ?? "confirmed";
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    },
    commitment,
  );

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
}
