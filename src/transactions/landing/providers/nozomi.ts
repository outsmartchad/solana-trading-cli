/**
 * Nozomi TX Landing Provider (Temporal)
 *
 * Submits transactions via Nozomi's HTTP endpoints across 4 regions.
 * Primary submission goes to the AMS endpoint.
 * Uses raw base64 body with Content-Type: text/plain (NOT JSON-RPC).
 */

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
  "TEMPaMeCRFAS9EKF53Jd6KpHxgL47uWLcpFArU1Fanq",
  "noz3jAjPiHuBPqiSPkkugaJDkJscPuRhYnSpbi8UvC4",
  "noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE",
  "noz6uoYCDijhu1V7cutCpwxNiSovEwLdRHPwmgCGDNo",
  "noz9EPNcT7WH6Sou3sr3GGjHQYVkN3DNirpbvDkv9YJ",
  "nozc5yT15LazbLTFVZzoNZCwjh3yUtW86LoUyqsBu4L",
  "nozFrhfnNGoyqwVuwPAW4aaGqempx4PU6g6D9CJMv7Z",
  "nozievPk7HyK1Rqy1MPJwVQ7qQg2QoJGyP71oeDwbsu",
  "noznbgwYnBLDHu8wcQVCEw6kDrXkPdKkydGJGNXGvL7",
  "nozNVWs5N8mgzuD3qigrCG2UoKxZttxzZ85pvAQVrbP",
  "nozpEGbwx4BcGp6pvEdAh1JoC2CQGZdU6HbNP1v2p6P",
  "nozrhjhkCr3zXT3BiT4WCodYCUFeQvcdUkM7MqhKqge",
  "nozrwQtWhEdrA6W8dkbt9gnUaMs52PdAv5byipnadq3",
  "nozUacTVWub3cL4mJmGCYjKZTnE9RbdY5AP46iQgbPJ",
  "nozWCyTPppJjRuw2fpzDhhWbW355fzosWSzrrMYB1Qk",
  "nozWNju6dY353eMkMqURqwQEoM3SFgEKC6psLCSfUne",
  "nozxNBgWohjR75vdspfxR5H9ceC7XXH99xpxhVGt3Bb",
] as const;

const DEFAULT_TIP_SOL = 0.001;

/** Primary endpoint (AMS). Other regions are available for future multi-region fanout. */
const REGIONS = [
  "http://ams1.nozomi.temporal.xyz",
  "http://fra2.nozomi.temporal.xyz",
  "http://ewr1.nozomi.temporal.xyz",
  "http://pit1.nozomi.temporal.xyz",
] as const;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "nozomi",

    isEnabled(): boolean {
      return !!process.env.NOZOMI_API_KEY;
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        // Use separate key for create_account if available
        const key =
          opts.operation === "create_account" && process.env.NOZOMI_API_KEY_CREATE
            ? process.env.NOZOMI_API_KEY_CREATE
            : process.env.NOZOMI_API_KEY || "";

        if (!key) {
          return { provider, accepted: false, error: "NOZOMI_API_KEY not set" };
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
        const signers: Keypair[] = [signer, ...(opts.extraSigners ?? [])];
        tx.sign(signers);

        const b64 = Buffer.from(tx.serialize()).toString("base64");

        // Submit to primary AMS endpoint
        const url = `${REGIONS[0]}/api/sendTransaction2?c=${key}`;

        const t0 = Date.now();
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: b64,
          signal: AbortSignal.timeout(10_000),
        });
        const latencyMs = Date.now() - t0;

        const text = await response.text();

        if (response.ok) {
          // Response body is the signature string
          const signature = text.trim();
          if (signature && signature.length > 20) {
            return { provider, accepted: true, signature, latencyMs };
          }
          // Try parsing as JSON in case endpoint returns wrapped response
          try {
            const json = JSON.parse(text);
            if (json.signature || json.result) {
              return { provider, accepted: true, signature: json.signature || json.result, latencyMs };
            }
          } catch {
            // Not JSON — use raw text
          }
          return { provider, accepted: true, signature: signature || undefined, latencyMs };
        }

        return { provider, accepted: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}`, latencyMs };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error: err?.message || "Nozomi request failed",
        };
      }
    },
  };
}

export { createProvider };
