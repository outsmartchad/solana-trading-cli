/**
 * 0slot TX Landing Provider
 *
 * Submits transactions via 0slot's HTTP JSON-RPC endpoint.
 * Tip is appended as a SOL transfer to a randomly chosen tip account.
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
  "Eb2KpSC8uMt9GmzyAEm5Eb1AAAgTjRaXWFjKyFXHZxF3",
  "FCjUJZ1qozm1e8romw216qyfQMaaWKxWsuySnumVCCNe",
  "ENxTEjSQ1YabmUpXAdCgevnHQ9MHdLv8tzFiuiYJqa13",
  "6rYLG55Q9RpsPGvqdPNJs4z5WTxJVatMB8zV3WJhs5EK",
  "Cix2bHfqPcKcM233mzxbLk14kSggUUiz2A87fJtGivXr",
] as const;

const DEFAULT_TIP_SOL = 0.001;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  const apiKey = () => process.env.ZERO_SLOT_API_KEY || "";

  return {
    name: "0slot",

    isEnabled(): boolean {
      return !!process.env.ZERO_SLOT_API_KEY;
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const key = apiKey();
        if (!key) {
          return { provider, accepted: false, error: "ZERO_SLOT_API_KEY not set" };
        }

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

        // Sign with primary + extra signers
        const signers: Keypair[] = [signer, ...(opts.extraSigners ?? [])];
        tx.sign(signers);

        const b64 = Buffer.from(tx.serialize()).toString("base64");

        const endpoint = `http://ams1.0slot.trade?api-key=${key}`;

        const t0 = Date.now();
        const response = await axios.post(
          endpoint,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: [b64, { encoding: "base64" }],
          },
          { timeout: 10_000 },
        );
        const latencyMs = Date.now() - t0;

        const signature: string | undefined = response.data?.result;
        if (signature) {
          return { provider, accepted: true, signature, latencyMs };
        }

        const errMsg =
          response.data?.error?.message || JSON.stringify(response.data?.error) || "Unknown 0slot error";
        return { provider, accepted: false, error: errMsg, latencyMs };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error: err?.response?.data?.error?.message || err?.message || "0slot request failed",
        };
      }
    },
  };
}

export { createProvider };
