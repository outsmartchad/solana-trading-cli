/**
 * Astralane TX Landing Provider
 *
 * Submits transactions via Astralane's Iris HTTP JSON-RPC endpoint.
 * Supports two modes:
 *   - "sendTransaction" for create / general operations (single tx)
 *   - "sendIdeal" for snipe/swap operations (two txs: high-tip + low-tip)
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
  "astra4uejePWneqNaJKuFFA8oonqCE1sqF6b45kDMZm",
  "astrazznxsGUhWShqgNtAdfrzP2G83DzcWVJDxwV9bF",
  "astra9xWY93QyfG6yM8zwsKsRodscjQ2uU2HKNL5prk",
  "astraRVUuTHjpwEVvNBeQEgwYx9w9CFyfxjYoobCZhL",
  "astraEJ2fEj8Xmy6KLG7B3VfbKfsHXhHrNdCQx7iGJK",
  "astraubkDw81n4LuutzSQ8uzHCv4BhPVhfvTcYv8SKC",
  "astraZW5GLFefxNPAatceHhYjfA1ciq9gvfEg2S47xk",
  "astrawVNP4xDBKT7rAdxrLYiTSTdqtUr63fSMduivXK",
] as const;

const DEFAULT_TIP_SOL = 0.001;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTx(
  ixs: TransactionInstruction[],
  signer: Keypair,
  blockhash: string,
  opts: SubmitOptions,
  tipSol: number,
): VersionedTransaction {
  const tipAccount = pickRandom(TIP_ACCOUNTS);
  const tipIx = SystemProgram.transfer({
    fromPubkey: signer.publicKey,
    toPubkey: new PublicKey(tipAccount),
    lamports: Math.round(tipSol * LAMPORTS_PER_SOL),
  });

  const allIxs = [...ixs, tipIx];

  const messageV0 = TransactionMessage.compile({
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
    instructions: allIxs,
    addressLookupTableAccounts: opts.addressLookupTables,
  });

  const tx = new VersionedTransaction(messageV0);
  const signers: Keypair[] = [signer, ...(opts.extraSigners ?? [])];
  tx.sign(signers);
  return tx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "astralane",

    isEnabled(): boolean {
      return !!process.env.ASTRALANE_API_KEY;
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const key = process.env.ASTRALANE_API_KEY || "";
        if (!key) {
          return { provider, accepted: false, error: "ASTRALANE_API_KEY not set" };
        }

        const tipSol = opts.tipSol && opts.tipSol > 0 ? opts.tipSol : DEFAULT_TIP_SOL;
        const bh = extractBlockhash(blockhash);
        const endpoint = `http://ams.gateway.astralane.io/iris?api-key=${key}`;

        const isSnipeOrSwap =
          opts.operation === "snipe" || opts.operation === "buy" || opts.operation === "sell";

        if (isSnipeOrSwap) {
          // sendIdeal mode: two legacy txs — high tip (1.5x) and low tip (1x)
          const highTipTx = buildTx(ixs, signer, bh, opts, tipSol * 1.5);
          const lowTipTx = buildTx(ixs, signer, bh, opts, tipSol);

          const highTipB64 = Buffer.from(highTipTx.serialize()).toString("base64");
          const lowTipB64 = Buffer.from(lowTipTx.serialize()).toString("base64");

          const t0 = Date.now();
          const response = await axios.post(
            endpoint,
            {
              jsonrpc: "2.0",
              id: 1,
              method: "sendIdeal",
              params: [[highTipB64, lowTipB64]],
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
            "Unknown astralane sendIdeal error";
          return { provider, accepted: false, error: errMsg, latencyMs };
        }

        // Default: sendTransaction mode (create_account, create_damm_pool, etc.)
        const tx = buildTx(ixs, signer, bh, opts, tipSol);
        const b64 = Buffer.from(tx.serialize()).toString("base64");

        const t0 = Date.now();
        const response = await axios.post(
          endpoint,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: [
              b64,
              { encoding: "base64", skipPreflight: true },
              { mevProtect: false },
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
          response.data?.error?.message ||
          JSON.stringify(response.data?.error) ||
          "Unknown astralane error";
        return { provider, accepted: false, error: errMsg, latencyMs };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error:
            err?.response?.data?.error?.message ||
            err?.message ||
            "Astralane request failed",
        };
      }
    },
  };
}

export { createProvider };
