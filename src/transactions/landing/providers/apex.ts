/**
 * OrbitFlare Apex TX Landing Provider
 *
 * Submits transactions via Apex's HTTP JSON-RPC endpoint. Apex sends each
 * transaction to the upcoming leaders over staked validator clients, Jito
 * bundles and direct TPU at once; one tip covers all three paths.
 * Uses sendTransaction with base64 encoding and the x-api-key header.
 *
 * Env:
 *   APEX_API_KEY      — required; enables the provider
 *   APEX_REGION       — global (default, nearest healthy endpoint) or
 *                       fra|ams|dub|lon|nyc|slc|sgp|tyo|sqq
 *   APEX_URL          — full endpoint URL; overrides APEX_REGION
 *   APEX_MEV_PROTECT  — "true" to skip leaders on Apex's MEV blocklist
 *
 * Supports ping() to keep the HTTP connection warm.
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

/** Vaults of the Apex tip program 9ig7pd4gqe2m16ACGPbPo4HfMGD3ba38poDhXEayx7EF. */
const TIP_ACCOUNTS = [
  "APeX2oLtjYehgTMUCA971L8htM7tGNqsXHDz5NrivhhX",
  "APeXAKT6spXSmU3uRv2MoEgQ7ckhAS4nexTgaxwLEfJ9",
  "APeXB4mu1X7BSjwyPtiNUnKyhvc4wrq5SKEdmnPKWR95",
  "APeXJTSGoxLWmwb9o1tiiEL5RXVUakazYgjLmZdDc2Ef",
  "APeXUUaKFfPXjPxKHEdwCsJ4BfTuGg4qnVQyJE9K37PU",
  "APeXVWXKDRAAujckMjmMsV61a4DQiXa98MPUAkL46sim",
  "APeXW6PKFZRDz7WXBBybBMcoJaQo97UtLa5TAQnchNBY",
  "APeXZuKaKuqouyfU8fFL1woeWvSEVFkY4EMrmkvbfhhD",
  "APeXbYdbmrYWsastf6GurexGe3dwnuWKLD2mcsDoEuBU",
  "APeXn29deoxpsZz6r7n63Ymmv2skBr3WhKYLB1mB2fR7",
] as const;

const REGIONS = ["global", "fra", "ams", "dub", "lon", "nyc", "slc", "sgp", "tyo", "sqq"] as const;

/** The standard tier's tip floor. A key's tier can set another; Apex rejects tips below it. */
const DEFAULT_TIP_SOL = 0.001;

function endpoint(): string {
  if (process.env.APEX_URL) return process.env.APEX_URL;
  const region = (process.env.APEX_REGION || "global").toLowerCase();
  if (!(REGIONS as readonly string[]).includes(region)) {
    throw new Error(`Unknown APEX_REGION "${region}" (use one of: ${REGIONS.join(", ")})`);
  }
  return `http://${region}.apex.orbitflare.com`;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "apex",

    isEnabled(): boolean {
      return !!process.env.APEX_API_KEY;
    },

    async ping(): Promise<void> {
      await axios.get(`${endpoint().replace(/\/+$/, "")}/ping`, { timeout: 5_000 });
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const key = process.env.APEX_API_KEY || "";
        if (!key) {
          return { provider, accepted: false, error: "APEX_API_KEY not set" };
        }

        const tipSol = opts.tipSol && opts.tipSol > 0 ? opts.tipSol : DEFAULT_TIP_SOL;

        // Exactly one top-level transfer to an Apex tip account. The tip account is
        // not in any lookup table, so it stays in the static keys as Apex requires.
        const tipIx = SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: new PublicKey(pickRandom(TIP_ACCOUNTS)),
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
        const mevProtect = process.env.APEX_MEV_PROTECT === "true";

        const t0 = Date.now();
        const response = await axios.post(
          endpoint(),
          {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            // The third param is Apex's mevProtect flag.
            params: [b64, { encoding: "base64" }, mevProtect],
          },
          { timeout: 10_000, headers: { "x-api-key": key } },
        );
        const latencyMs = Date.now() - t0;

        const signature: string | undefined = response.data?.result;
        if (signature) {
          return { provider, accepted: true, signature, latencyMs };
        }

        const errMsg =
          response.data?.error?.message || JSON.stringify(response.data?.error) || "Unknown apex error";
        return { provider, accepted: false, error: errMsg, latencyMs };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error: err?.response?.data?.error?.message || err?.message || "apex request failed",
        };
      }
    },
  };
}

export { createProvider };
