/**
 * bloXroute TX Landing Provider
 *
 * Submits transactions via the bloXroute Solana Trader SDK (HttpProvider).
 * Uses legacy Transaction (not VersionedTransaction) because the SDK's
 * postSubmit expects a legacy-serialized base64 payload.
 * Gets its OWN blockhash from the provider for consistency with SDK expectations.
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
  HttpProvider,
} from "@bloxroute/solana-trader-client-ts";
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

// ---------------------------------------------------------------------------
// Lazy provider singleton
// ---------------------------------------------------------------------------

let _provider: HttpProvider | null = null;

function getProvider(): HttpProvider | null {
  if (_provider) return _provider;

  const authKey = process.env.BLOXROUTE_AUTH_KEY || "";
  const apiKey = process.env.BLOXROUTE_API_KEY || "";
  if (!authKey || !apiKey) return null;

  _provider = new HttpProvider(apiKey, authKey, ENDPOINT);
  return _provider;
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
        const sdkProvider = getProvider();
        if (!sdkProvider) {
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

        // bloXroute SDK expects legacy Transaction — get its OWN blockhash
        const recentBlockhashResp = await sdkProvider.getRecentBlockHash({});
        const bh = recentBlockhashResp.blockHash;

        // Build legacy transaction — never mutate input ixs
        const allIxs = [...ixs, tipIx];
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
        const response = await sdkProvider.postSubmit({
          transaction: { content: b64, isCleanup: false },
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
