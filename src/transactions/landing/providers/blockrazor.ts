/**
 * Blockrazor TX Landing Provider
 *
 * Submits transactions via Blockrazor's custom REST endpoint.
 * Uses a persistent axios client with HTTP keep-alive for lower latency.
 * Implements ping() for health checks.
 */

import axios, { AxiosInstance } from "axios";
import http from "http";
import https from "https";
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
  "Gywj98ophM7GmkDdaWs4isqZnDdFCW7B46TXmKfvyqSm",
  "FjmZZrFvhnqqb9ThCuMVnENaM3JGVuGWNyCAxRJcFpg9",
  "6No2i3aawzHsjtThw81iq1EXPJN6rh8eSJCLaYZfKDTG",
  "A9cWowVAiHe9pJfKAj3TJiN9VpbzMUq6E4kEvf5mUT22",
  "68Pwb4jS7eZATjDfhmTXgRJjCiZmw1L7Huy4HNpnxJ3o",
  "4ABhJh5rZPjv63RBJBuyWzBK3g9gWMUQdTZP2kiW31V9",
  "B2M4NG5eyZp5SBQrSdtemzk5TqVuaWGQnowGaCBt8GyM",
  "5jA59cXMKQqZAVdtopv8q3yyw9SYfiE3vUCbt7p8MfVf",
  "5YktoWygr1Bp9wiS1xtMtUki1PeYuuzuCF98tqwYxf61",
  "295Avbam4qGShBYK7E9H5Ldew4B3WyJGmgmXfiWdeeyV",
  "EDi4rSy2LZgKJX74mbLTFk4mxoTgT6F7HxxzG2HBAFyK",
  "BnGKHAC386n4Qmv9xtpBVbRaUTKixjBe3oagkPFKtoy6",
  "Dd7K2Fp7AtoN8xCghKDRmyqr5U169t48Tw5fEd3wT9mq",
  "AP6qExwrbRgBAVaehg4b5xHENX815sMabtBzUzVB4v8S",
] as const;

const DEFAULT_TIP_SOL = 0.001;
const BASE_URL = "http://amsterdam.solana.blockrazor.xyz:443";

// ---------------------------------------------------------------------------
// Persistent HTTP client with keep-alive
// ---------------------------------------------------------------------------

let _client: AxiosInstance | null = null;

function getClient(apiKey: string): AxiosInstance {
  if (!_client) {
    _client = axios.create({
      baseURL: BASE_URL,
      timeout: 10_000,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "blockrazor",

    isEnabled(): boolean {
      return !!process.env.BLOCKRAZOR_API_KEY;
    },

    async ping(): Promise<void> {
      const apiKey = process.env.BLOCKRAZOR_API_KEY || "";
      if (!apiKey) return;
      const client = getClient(apiKey);
      await client.get("/health");
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const apiKey = process.env.BLOCKRAZOR_API_KEY || "";
        if (!apiKey) {
          return { provider, accepted: false, error: "BLOCKRAZOR_API_KEY not set" };
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

        const client = getClient(apiKey);

        const t0 = Date.now();
        const response = await client.post("/sendTransaction", {
          transaction: b64,
          mode: "fast",
          safeWindow: 5,
          RevertProtection: false,
        });
        const latencyMs = Date.now() - t0;

        const data = response.data;
        const signature: string | undefined = data?.signature || data?.result;
        if (signature) {
          return { provider, accepted: true, signature, latencyMs };
        }

        // Check for explicit success without signature
        if (data?.success === true || data?.status === "ok") {
          return { provider, accepted: true, latencyMs };
        }

        const errMsg = data?.error || data?.message || "Unknown blockrazor error";
        return { provider, accepted: false, error: String(errMsg), latencyMs };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error: err?.response?.data?.error || err?.response?.data?.message || err?.message || "blockrazor request failed",
        };
      }
    },
  };
}

export { createProvider };
