/**
 * node1.me TX Landing Provider
 *
 * Submits transactions via node1.me's HTTP JSON-RPC endpoint.
 * API key is sent in the `api-key` header.
 * Minimum enforced tip: 0.002 SOL.
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
  "node1PqAa3BWWzUnTHVbw8NJHC874zn9ngAkXjgWEej",
  "node1UzzTxAAeBTpfZkQPJXBAqixsbdth11ba1NXLBG",
  "node1Qm1bV4fwYnCurP8otJ9s5yrkPq7SPZ5uhj3Tsv",
  "node1PUber6SFmSQgvf2ECmXsHP5o3boRSGhvJyPMX1",
  "node1AyMbeqiVN6eoQzEAwCA6Pk826hrdqdAHR7cdJ3",
  "node1YtWCoTwwVYTFLfS19zquRQzYX332hs1HEuRBjC",
] as const;

/** Minimum tip enforced by node1.me */
const DEFAULT_TIP_SOL = 0.002;

const ENDPOINT = "https://ams.node1.me";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "node1",

    isEnabled(): boolean {
      return !!process.env.NODE1_API_KEY;
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const apiKey = process.env.NODE1_API_KEY || "";
        if (!apiKey) {
          return { provider, accepted: false, error: "NODE1_API_KEY not set" };
        }

        // Enforce minimum tip of 0.002 SOL
        const requestedTip = opts.tipSol && opts.tipSol > 0 ? opts.tipSol : DEFAULT_TIP_SOL;
        const tipSol = Math.max(requestedTip, DEFAULT_TIP_SOL);
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

        const t0 = Date.now();
        const response = await axios.post(
          ENDPOINT,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: [b64, { encoding: "base64" }],
          },
          {
            timeout: 10_000,
            headers: {
              "Content-Type": "application/json",
              "api-key": apiKey,
            },
          },
        );
        const latencyMs = Date.now() - t0;

        const signature: string | undefined = response.data?.result;
        if (signature) {
          return { provider, accepted: true, signature, latencyMs };
        }

        const errMsg =
          response.data?.error?.message || JSON.stringify(response.data?.error) || "Unknown node1 error";
        return { provider, accepted: false, error: errMsg, latencyMs };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error: err?.response?.data?.error?.message || err?.message || "node1 request failed",
        };
      }
    },
  };
}

export { createProvider };
