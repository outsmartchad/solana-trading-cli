/**
 * Stellium TX Landing Provider (FlashRPC)
 *
 * Submits transactions via Stellium's HTTP JSON-RPC endpoint.
 * API key is embedded as a URL path segment.
 * Supports ping() for health checking.
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
  "ste11JV3MLMM7x7EJUM2sXcJC1H7F4jBLnP9a9PG8PH",
  "ste11MWPjXCRfQryCshzi86SGhuXjF4Lv6xMXD2AoSt",
  "ste11p5x8tJ53H1NbNQsRBg1YNRd4GcVpxtDw8PBpmb",
  "ste11p7e2KLYou5bwtt35H7BM6uMdo4pvioGjJXKFcN",
  "ste11TMV68LMi1BguM4RQujtbNCZvf1sjsASpqgAvSX",
] as const;

const DEFAULT_TIP_SOL = 0.001;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  function getEndpoint(): string {
    const key = process.env.STELLIUM_API_KEY || "";
    return `https://ams1.flashrpc.com/${key}`;
  }

  return {
    name: "stellium",

    isEnabled(): boolean {
      return !!process.env.STELLIUM_API_KEY;
    },

    async ping(): Promise<void> {
      const url = getEndpoint();
      await axios.get(url, { timeout: 5_000 });
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const key = process.env.STELLIUM_API_KEY || "";
        if (!key) {
          return { provider, accepted: false, error: "STELLIUM_API_KEY not set" };
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

        const messageV0 = new TransactionMessage({
          payerKey: signer.publicKey,
          recentBlockhash: bh,
          instructions: allIxs,
        }).compileToV0Message(opts.addressLookupTables);

        const tx = new VersionedTransaction(messageV0);
        const signers: Keypair[] = [signer, ...(opts.extraSigners ?? [])];
        tx.sign(signers);

        const b64 = Buffer.from(tx.serialize()).toString("base64");
        const endpoint = getEndpoint();

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
          response.data?.error?.message ||
          JSON.stringify(response.data?.error) ||
          "Unknown stellium error";
        return { provider, accepted: false, error: errMsg, latencyMs };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error:
            err?.response?.data?.error?.message ||
            err?.message ||
            "Stellium request failed",
        };
      }
    },
  };
}

export { createProvider };
