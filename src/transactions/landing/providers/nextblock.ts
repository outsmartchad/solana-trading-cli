/**
 * NextBlock TX Landing Provider
 *
 * Submits transactions via NextBlock's HTTP REST endpoint.
 * API key is passed in the Authorization header.
 * Supports ping() via the /health endpoint.
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
  "NEXTbLoCkB51HpLBLojQfpyVAMorm3zzKg7w9NFdqid",
  "nextBLoCkPMgmG8ZgJtABeScP35qLa2AMCNKntAP7Xc",
  "NextbLoCkVtMGcV47JzewQdvBpLqT9TxQFozQkN98pE",
  "NexTbLoCkWykbLuB1NkjXgFWkX9oAtcoagQegygXXA2",
  "NeXTBLoCKs9F1y5PJS9CKrFNNLU1keHW71rfh7KgA1X",
  "NexTBLockJYZ7QD7p2byrUa6df8ndV2WSd8GkbWqfbb",
  "neXtBLock1LeC67jYd1QdAa32kbVeubsfPNTJC1V5At",
  "nEXTBLockYgngeRmRrjDV31mGSekVPqZoMGhQEZtPVG",
] as const;

const DEFAULT_TIP_SOL = 0.001;
const ENDPOINT = "https://ams.nextblock.io/api/v2/submit";
const HEALTH_ENDPOINT = "https://ams.nextblock.io/health";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "nextblock",

    isEnabled(): boolean {
      return !!process.env.NEXTBLOCK_API_KEY;
    },

    async ping(): Promise<void> {
      await axios.get(HEALTH_ENDPOINT, { timeout: 5_000 });
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const key = process.env.NEXTBLOCK_API_KEY || "";
        if (!key) {
          return { provider, accepted: false, error: "NEXTBLOCK_API_KEY not set" };
        }

        const tipSol = Math.max(
          opts.tipSol && opts.tipSol > 0 ? opts.tipSol : DEFAULT_TIP_SOL,
          DEFAULT_TIP_SOL, // enforce minimum
        );
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

        const messageV0 = TransactionMessage.compile({
          payerKey: signer.publicKey,
          recentBlockhash: bh,
          instructions: allIxs,
          addressLookupTableAccounts: opts.addressLookupTables,
        });

        const tx = new VersionedTransaction(messageV0);
        const signers: Keypair[] = [signer, ...(opts.extraSigners ?? [])];
        tx.sign(signers);

        const b64 = Buffer.from(tx.serialize()).toString("base64");

        const t0 = Date.now();
        const response = await axios.post(
          ENDPOINT,
          {
            transaction: {
              content: b64,
            },
            skipPreFlight: true,
            frontRunningProtection: false,
            snipeTransaction: opts.operation === "snipe",
          },
          {
            headers: { Authorization: key },
            timeout: 10_000,
          },
        );
        const latencyMs = Date.now() - t0;

        if (response.status >= 200 && response.status < 300) {
          const signature: string | undefined =
            response.data?.signature || response.data?.result;
          return { provider, accepted: true, signature, latencyMs };
        }

        return {
          provider,
          accepted: false,
          error: `HTTP ${response.status}: ${JSON.stringify(response.data).slice(0, 200)}`,
          latencyMs,
        };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error:
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "NextBlock request failed",
        };
      }
    },
  };
}

export { createProvider };
