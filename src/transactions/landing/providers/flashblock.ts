/**
 * Flashblock TX Landing Provider
 *
 * Submits transactions via Flashblock's HTTP REST batch endpoint.
 * API key is passed in the Authorization header.
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
  "FLaShB3iXXTWE1vu9wQsChUKq3HFtpMAhb8kAh1pf1wi",
  "FLashhsorBmM9dLpuq6qATawcpqk1Y2aqaZfkd48iT3W",
  "FLaSHJNm5dWYzEgnHJWWJP5ccu128Mu61NJLxUf7mUXU",
  "FLaSHR4Vv7sttd6TyDF4yR1bJyAxRwWKbohDytEMu3wL",
  "FLASHRzANfcAKDuQ3RXv9hbkBy4WVEKDzoAgxJ56DiE4",
  "FLasHstqx11M8W56zrSEqkCyhMCCpr6ze6Mjdvqope5s",
  "FLAShyAyBcKb39KPxSzXcepiS8iDYUhDGwJcJDPX4g2B",
  "FLasHXTqrbNvpWFB6grN47HGZfK6pze9HLNTgbukfPSk",
  "FLAshyAyBcKb39KPxSzXcepiS8iDYUhDGwJcJDPX4g2B",
  "FLAsHZTRcf3Dy1APaz6j74ebdMC6Xx4g6i9YxjyrDybR",
] as const;

const DEFAULT_TIP_SOL = 0.001;
const ENDPOINT = "http://ams.flashblock.trade/api/v2/submit-batch";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "flashblock",

    isEnabled(): boolean {
      return !!process.env.FLASHBLOCK_API_KEY;
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const key = process.env.FLASHBLOCK_API_KEY || "";
        if (!key) {
          return { provider, accepted: false, error: "FLASHBLOCK_API_KEY not set" };
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
          { transactions: [b64] },
          {
            headers: { Authorization: key },
            timeout: 10_000,
          },
        );
        const latencyMs = Date.now() - t0;

        // Flashblock REST typically returns 200 on acceptance
        if (response.status >= 200 && response.status < 300) {
          const signature: string | undefined =
            response.data?.signature ||
            response.data?.result ||
            response.data?.signatures?.[0];
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
            "Flashblock request failed",
        };
      }
    },
  };
}

export { createProvider };
