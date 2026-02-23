/**
 * Event Streaming Engine — Transaction Formatter.
 *
 * Converts raw Yellowstone gRPC protobuf transaction data into a usable format.
 * Inspired by TransactionFormatter from 100x-algo-bots/pumpdotfun-sdk/src/parsers.ts
 * but simplified — no external dependencies, no BorshCoder.
 *
 * The key task: build a unified account list from static + loaded addresses,
 * and expose inner instructions, pre/post token balances in a workable format.
 */

import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

// ---------------------------------------------------------------------------
// Types for the formatted transaction
// ---------------------------------------------------------------------------

export interface FormattedTransaction {
  signature: string;
  slot: number;
  /** Unix timestamp in seconds (0 if no block metadata yet) */
  timestamp: number;
  /** Full account list: static + loaded writable + loaded readonly */
  accountList: PublicKey[];
  /** The signer (first account key) */
  signer: string;
  /** Number of required signatures */
  numSigners: number;
  /** Whether the transaction failed */
  failed: boolean;
  /** Outer instructions */
  outerInstructions: FormattedInstruction[];
  /** Inner (CPI) instructions grouped by outer instruction index */
  innerInstructions: FormattedInnerInstructionGroup[];
  /** Pre token balances */
  preTokenBalances: TokenBalance[];
  /** Post token balances */
  postTokenBalances: TokenBalance[];
  /** SOL pre balances (lamports) */
  preBalances: number[];
  /** SOL post balances (lamports) */
  postBalances: number[];
  /** Log messages */
  logMessages: string[];
}

export interface FormattedInstruction {
  programIdIndex: number;
  programId: string;
  accounts: number[];
  data: Buffer;
}

export interface FormattedInnerInstructionGroup {
  index: number;
  instructions: FormattedInstruction[];
}

export interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner: string;
  uiAmount: number;
  decimals: number;
  amount: string;
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

/**
 * Format a raw gRPC transaction update into a usable structure.
 *
 * @param data - The raw `data.transaction` from the gRPC stream
 * @param slotTimestamp - Optional timestamp for this slot (from block metadata)
 */
export function formatTransaction(
  data: any,
  slotTimestamp?: number,
): FormattedTransaction | null {
  try {
    const rawTx = data.transaction;
    if (!rawTx?.transaction?.message) return null;

    const meta = rawTx.meta;
    if (!meta) return null;

    const message = rawTx.transaction.message;
    const slot = Number(data.slot);
    const signature = bs58.encode(Buffer.from(rawTx.transaction.signature));

    // Build unified account list: static + loaded writable + loaded readonly
    const accountList: PublicKey[] = [];

    // Static account keys — raw 32-byte Buffers from gRPC protobuf
    const staticKeys = message.accountKeys || message.staticAccountKeys || [];
    for (const key of staticKeys) {
      accountList.push(toPublicKey(key));
    }

    // Loaded writable addresses (from address lookup tables)
    if (meta.loadedWritableAddresses) {
      for (const addr of meta.loadedWritableAddresses) {
        accountList.push(toPublicKey(addr));
      }
    }

    // Loaded readonly addresses
    if (meta.loadedReadonlyAddresses) {
      for (const addr of meta.loadedReadonlyAddresses) {
        accountList.push(toPublicKey(addr));
      }
    }

    // Signer
    const signer = accountList.length > 0 ? accountList[0].toBase58() : "";
    const numSigners = message.header?.numRequiredSignatures ?? 1;

    // Outer instructions
    const outerInstructions: FormattedInstruction[] = (message.instructions || []).map(
      (ix: any) => formatInstruction(ix, accountList),
    );

    // Inner instructions
    const innerInstructions: FormattedInnerInstructionGroup[] = (
      meta.innerInstructions || []
    ).map((group: any) => ({
      index: group.index ?? 0,
      instructions: (group.instructions || []).map((ix: any) =>
        formatInstruction(ix, accountList),
      ),
    }));

    // Token balances
    const preTokenBalances = formatTokenBalances(meta.preTokenBalances || [], accountList);
    const postTokenBalances = formatTokenBalances(meta.postTokenBalances || [], accountList);

    return {
      signature,
      slot,
      timestamp: slotTimestamp ?? 0,
      accountList,
      signer,
      numSigners,
      failed: !!meta.err || !!meta.errorInfo,
      outerInstructions,
      innerInstructions,
      preTokenBalances,
      postTokenBalances,
      preBalances: meta.preBalances || [],
      postBalances: meta.postBalances || [],
      logMessages: meta.logMessages || [],
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInstruction(ix: any, accountList: PublicKey[]): FormattedInstruction {
  const programIdIndex = ix.programIdIndex ?? 0;
  const programId =
    programIdIndex < accountList.length
      ? accountList[programIdIndex].toBase58()
      : "unknown";

  // accounts can be a Buffer/Uint8Array of indices or an array of numbers
  let accounts: number[];
  if (Buffer.isBuffer(ix.accounts) || ix.accounts instanceof Uint8Array) {
    accounts = Array.from(ix.accounts);
  } else if (Array.isArray(ix.accounts)) {
    accounts = ix.accounts;
  } else {
    accounts = [];
  }

  // data can be Buffer, Uint8Array, or base64 string
  let data: Buffer;
  if (Buffer.isBuffer(ix.data)) {
    data = ix.data;
  } else if (ix.data instanceof Uint8Array) {
    data = Buffer.from(ix.data);
  } else if (typeof ix.data === "string") {
    data = Buffer.from(ix.data, "base64");
  } else {
    data = Buffer.alloc(0);
  }

  return { programIdIndex, programId, accounts, data };
}

/**
 * Convert a raw key from gRPC into a PublicKey.
 * Keys can be raw 32-byte Buffers/Uint8Arrays or base64 strings.
 */
function toPublicKey(key: any): PublicKey {
  if (key instanceof PublicKey) return key;
  // Raw bytes (Buffer or Uint8Array)
  if (Buffer.isBuffer(key) || key instanceof Uint8Array) {
    if (key.length === 32) return new PublicKey(key);
    // If not 32 bytes, it might be base64-encoded
    return new PublicKey(Buffer.from(key));
  }
  // Base64 string
  if (typeof key === "string") {
    // Try as base58 first (44 chars), then as base64
    if (key.length >= 32 && key.length <= 44 && !key.includes("=")) {
      try { return new PublicKey(key); } catch {}
    }
    return new PublicKey(Buffer.from(key, "base64"));
  }
  throw new Error(`Cannot convert to PublicKey: ${typeof key}`);
}

function formatTokenBalances(balances: any[], accountList: PublicKey[]): TokenBalance[] {
  return balances.map((b: any) => {
    const accountIndex = b.accountIndex ?? 0;
    return {
      accountIndex,
      mint: b.mint ?? "",
      owner: b.owner ?? "",
      uiAmount: b.uiTokenAmount?.uiAmount ?? 0,
      decimals: b.uiTokenAmount?.decimals ?? 0,
      amount: b.uiTokenAmount?.amount ?? "0",
    };
  });
}
