/**
 * Soyas TX Landing Provider (QUIC via Go binary)
 *
 * Submits transactions via the `soyas-client` compiled Go binary,
 * which communicates over QUIC with Soyas infrastructure.
 * Uses child_process.execFile to invoke the binary.
 *
 * Binary path defaults to `<project-root>/soyas-client` but can be
 * overridden via SOYAS_BINARY_PATH env var.
 *
 * Supports ping() to test binary connectivity.
 */

import { execFile } from "child_process";
import * as path from "path";
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
  "soyas4s6L8KWZ8rsSk1mF3d1mQScoTGGAgjk98bF8nP",
  "soyascXFW5wEEYiwfEmHy2pNwomqzvggJosGVD6TJdY",
  "soyasDBdKjADwPz3xk82U3TNPRDKEWJj7wWLajNHZ1L",
  "soyasE2abjBAynmHbGWgEwk4ctBy7JMTUCNrMbjcnyH",
] as const;

const DEFAULT_TIP_SOL = 0.001;
const ENDPOINT = "ams.landing.soyas.xyz:9000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBinaryPath(): string {
  return (
    process.env.SOYAS_BINARY_PATH ||
    path.join(__dirname, "../../../../soyas-client")
  );
}

function execBinary(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const binaryPath = getBinaryPath();
  return new Promise((resolve, reject) => {
    execFile(
      binaryPath,
      args,
      { timeout: 15_000, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout: stdout?.toString() || "", stderr: stderr?.toString() || "" });
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "soyas",

    isEnabled(): boolean {
      return !!process.env.SOYAS_API_KEY;
    },

    async ping(): Promise<void> {
      // Test binary connectivity by calling with empty tx
      const key = process.env.SOYAS_API_KEY || "";
      await execBinary([ENDPOINT, key, ""]);
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const key = process.env.SOYAS_API_KEY || "";
        if (!key) {
          return { provider, accepted: false, error: "SOYAS_API_KEY not set" };
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

        // Call the Go binary: soyas-client <endpoint> <apiKey> <txBase64>
        const t0 = Date.now();
        const { stdout, stderr } = await execBinary([ENDPOINT, key, b64]);
        const latencyMs = Date.now() - t0;

        const output = stdout.trim();

        // Check for errors in stderr or known error patterns in stdout
        if (stderr && stderr.trim().length > 0) {
          const errText = stderr.trim();
          // Some binaries write status to stderr but succeed — check for explicit errors
          if (
            errText.toLowerCase().includes("error") ||
            errText.toLowerCase().includes("fail")
          ) {
            return {
              provider,
              accepted: false,
              error: errText.slice(0, 200),
              latencyMs,
            };
          }
        }

        // If stdout looks like a signature (base58, 87-88 chars), treat as success
        if (output && output.length >= 43 && !output.toLowerCase().includes("error")) {
          return { provider, accepted: true, signature: output, latencyMs };
        }

        // Try to parse stdout as JSON
        try {
          const json = JSON.parse(output);
          if (json.signature || json.result) {
            return {
              provider,
              accepted: true,
              signature: json.signature || json.result,
              latencyMs,
            };
          }
          if (json.error) {
            return {
              provider,
              accepted: false,
              error: typeof json.error === "string" ? json.error : JSON.stringify(json.error),
              latencyMs,
            };
          }
        } catch {
          // Not JSON — use raw output
        }

        // Fallback: if we got here with no error and some output, assume accepted
        if (output.length > 0) {
          return { provider, accepted: true, signature: output || undefined, latencyMs };
        }

        return {
          provider,
          accepted: false,
          error: "Empty response from soyas-client binary",
          latencyMs,
        };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error: err?.message || "Soyas binary execution failed",
        };
      }
    },
  };
}

export { createProvider };
