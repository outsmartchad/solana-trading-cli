/**
 * bloXroute TX Landing Provider
 *
 * Submits transactions via the bloXroute Solana Trader API using direct HTTP
 * calls (no SDK dependency). Uses legacy Transaction because the API expects
 * a legacy-serialized base64 payload.
 */

import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ILandingProvider,
  LandingResult,
  SubmitOptions,
  pickRandom,
} from "../types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TIP_ACCOUNTS = [
  "HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY",
  "95cfoy472fcQHaw4tPGBTKpn6ZQnfEPfBgDQx6gcRmRg",
  "3UQUKjhMKaY2S6bjcQD6yHB7utcZt5bfarRCmctpRtUd",
  "FogxVNs6Mm2w9rnGL1vkARSwJxvLE8mujTv3LK8RnUhF",
] as const;

const DEFAULT_TIP_SOL = 0.001;
const ENDPOINT = "http://amsterdam.solana.dex.blxrbdn.com";

// Memo program ID (MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// ---------------------------------------------------------------------------
// Direct API helpers (replacing @bloxroute/solana-trader-client-ts)
// ---------------------------------------------------------------------------

function getHeaders(): Record<string, string> {
  const apiKey = process.env.BLOXROUTE_API_KEY || "";
  return {
    "Content-Type": "application/json",
    "Authorization": apiKey,
  };
}

async function apiGetRecentBlockHash(): Promise<string> {
  const authKey = process.env.BLOXROUTE_AUTH_KEY || "";
  const resp = await fetch(`${ENDPOINT}/api/v2/system/blockhash`, {
    method: "GET",
    headers: { ...getHeaders(), "X-Auth-Header": authKey },
  });
  if (!resp.ok) throw new Error(`bloXroute blockhash failed: ${resp.status}`);
  const data = await resp.json() as { blockHash?: string };
  if (!data.blockHash) throw new Error("No blockHash in bloXroute response");
  return data.blockHash;
}

async function apiPostSubmit(b64Tx: string, opts: {
  skipPreFlight?: boolean;
  frontRunningProtection?: boolean;
  useStakedRPCs?: boolean;
}): Promise<{ signature?: string }> {
  const authKey = process.env.BLOXROUTE_AUTH_KEY || "";
  const resp = await fetch(`${ENDPOINT}/api/v2/submit`, {
    method: "POST",
    headers: { ...getHeaders(), "X-Auth-Header": authKey },
    body: JSON.stringify({
      transaction: { content: b64Tx, isCleanup: false },
      skipPreFlight: opts.skipPreFlight ?? false,
      frontRunningProtection: opts.frontRunningProtection ?? false,
      useStakedRPCs: opts.useStakedRPCs ?? true,
    }),
  });
  if (!resp.ok) throw new Error(`bloXroute submit failed: ${resp.status}`);
  return resp.json() as Promise<{ signature?: string }>;
}

function createMemoInstruction(msg: string): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(msg, "utf-8"),
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "bloxroute",

    isEnabled(): boolean {
      return !!process.env.BLOXROUTE_API_KEY && !!process.env.BLOXROUTE_AUTH_KEY;
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const providerName = this.name;
      try {
        if (!this.isEnabled()) {
          return { provider: providerName, accepted: false, error: "BLOXROUTE_API_KEY or BLOXROUTE_AUTH_KEY not set" };
        }

        const tipSol = opts.tipSol && opts.tipSol > 0 ? opts.tipSol : DEFAULT_TIP_SOL;
        const tipAccount = pickRandom(TIP_ACCOUNTS);

        // Build tip instruction
        const tipIx = SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: new PublicKey(tipAccount),
          lamports: Math.round(tipSol * LAMPORTS_PER_SOL),
        });

        // Memo for bloXroute attribution
        const memoIx = createMemoInstruction("Powered by bloXroute Trader Api");

        // bloXroute expects legacy Transaction — get its OWN blockhash
        const bh = await apiGetRecentBlockHash();

        // Build legacy transaction
        const allIxs = [...ixs, tipIx, memoIx];
        const tx = new Transaction({
          recentBlockhash: bh,
          feePayer: signer.publicKey,
        });
        tx.add(...allIxs);

        // Sign with primary + extra signers
        const allSigners: Keypair[] = [signer, ...(opts.extraSigners ?? [])];
        tx.sign(...allSigners);

        const b64 = Buffer.from(tx.serialize()).toString("base64");

        const t0 = Date.now();
        const response = await apiPostSubmit(b64, {
          frontRunningProtection: false,
          useStakedRPCs: true,
          skipPreFlight: false,
        });
        const latencyMs = Date.now() - t0;

        const signature: string | undefined = response.signature;
        if (signature) {
          return { provider: providerName, accepted: true, signature, latencyMs };
        }

        return { provider: providerName, accepted: false, error: "No signature in bloXroute response", latencyMs };
      } catch (err: any) {
        return {
          provider: providerName,
          accepted: false,
          error: err?.message || "bloXroute request failed",
        };
      }
    },
  };
}

export { createProvider };
