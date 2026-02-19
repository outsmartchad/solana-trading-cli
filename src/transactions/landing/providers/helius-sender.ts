/**
 * Helius Sender TX Landing Provider
 *
 * Submits transactions via Helius's fast sender endpoint.
 * Uses HTTP JSON-RPC with sendTransaction, base64 encoding,
 * skipPreflight: true, maxRetries: 0.
 */

import axios from "axios";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ILandingProvider,
  LandingResult,
  SubmitOptions,
  extractBlockhash,
  pickRandom,
} from "../types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TIP_ACCOUNTS = [
  "4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE",
  "D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ",
  "9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta",
  "5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn",
  "2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD",
  "2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ",
  "wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF",
  "3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT",
  "4vieeGHPYPG2MmyPRcYjdiDmmhN3ww7hsFNap8pVN3Ey",
  "4TQLFNWK8AovT1gFvda5jfw2oJeRMKEmw7aH6MGBJ3or",
] as const;

const DEFAULT_TIP_SOL = 0.001;
const DEFAULT_ENDPOINT = "http://ams-sender.helius-rpc.com/fast";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "helius-sender",

    isEnabled(): boolean {
      // Public endpoint — always enabled unless explicitly overridden to empty
      return true;
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const tipSol = opts.tipSol && opts.tipSol > 0 ? opts.tipSol : DEFAULT_TIP_SOL;
        const tipAccount = pickRandom(TIP_ACCOUNTS);

        // Build tip instruction
        const tipIx = SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: new PublicKey(tipAccount),
          lamports: Math.round(tipSol * LAMPORTS_PER_SOL),
        });

        // Build V0 transaction — never mutate input ixs
        const allIxs = [...ixs, tipIx];
        const bh = extractBlockhash(blockhash);

        const message = new TransactionMessage({
          payerKey: signer.publicKey,
          recentBlockhash: bh,
          instructions: allIxs,
        });
        const messageV0 = message.compileToV0Message(opts.addressLookupTables);

        const tx = new VersionedTransaction(messageV0);
        const signers: Keypair[] = [signer, ...(opts.extraSigners ?? [])];
        tx.sign(signers);

        const b64 = Buffer.from(tx.serialize()).toString("base64");

        const endpoint = process.env.HELIUS_SENDER_URL || DEFAULT_ENDPOINT;

        const t0 = Date.now();
        const response = await axios.post(
          endpoint,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: [
              b64,
              {
                encoding: "base64",
                skipPreflight: true,
                maxRetries: 0,
              },
            ],
          },
          { timeout: 10_000 },
        );
        const latencyMs = Date.now() - t0;

        const signature: string | undefined = response.data?.result;
        if (signature) {
          return { provider, accepted: true, signature, latencyMs };
        }

        const errMsg =
          response.data?.error?.message || JSON.stringify(response.data?.error) || "Unknown helius-sender error";
        return { provider, accepted: false, error: errMsg, latencyMs };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error: err?.response?.data?.error?.message || err?.message || "helius-sender request failed",
        };
      }
    },
  };
}

export { createProvider };
