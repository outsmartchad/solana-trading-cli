/**
 * Jito TX Landing Provider (gRPC Bundle)
 *
 * Submits transactions as a Jito bundle via the gRPC block-engine.
 * Requires `jito-ts` SDK and a BLOCK_ENGINE_URL env var.
 *
 * Unlike other providers, Jito works with bundles — the main signed
 * VersionedTransaction is wrapped in a Bundle and a tip tx is added
 * via `bundle.addTipTx()`.
 *
 * Tip accounts are fetched lazily from `searcher.getTipAccounts()`.
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
import { searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types";
import { isError } from "jito-ts/dist/sdk/block-engine/utils";
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

const DEFAULT_TIP_SOL = 0.0001;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let cachedTipAccounts: string[] | null = null;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function createProvider(): ILandingProvider {
  return {
    name: "jito",

    isEnabled(): boolean {
      return !!process.env.BLOCK_ENGINE_URL;
    },

    async submit(
      ixs: TransactionInstruction[],
      signer: Keypair,
      blockhash: string | { blockhash: string; lastValidBlockHeight: number },
      opts: SubmitOptions,
    ): Promise<LandingResult> {
      const provider = this.name;
      try {
        const blockEngineUrl = process.env.BLOCK_ENGINE_URL || "";
        if (!blockEngineUrl) {
          return { provider, accepted: false, error: "BLOCK_ENGINE_URL not set" };
        }

        const tipSol = opts.tipSol && opts.tipSol > 0 ? opts.tipSol : DEFAULT_TIP_SOL;
        const bh = extractBlockhash(blockhash);

        // Create searcher client
        const searcher = searcherClient(blockEngineUrl);

        // Lazily fetch tip accounts
        if (!cachedTipAccounts) {
          const tipAccountsResult = await searcher.getTipAccounts();
          if (isError(tipAccountsResult)) {
            return {
              provider,
              accepted: false,
              error: `Failed to fetch Jito tip accounts: ${tipAccountsResult}`,
            };
          }
          cachedTipAccounts = tipAccountsResult as string[];
        }

        if (!cachedTipAccounts || cachedTipAccounts.length === 0) {
          return { provider, accepted: false, error: "No Jito tip accounts available" };
        }

        // Build the main V0 transaction (without tip — tip is a separate bundle tx)
        const mainIxs = [...ixs]; // never mutate input
        const messageV0 = TransactionMessage.compile({
          payerKey: signer.publicKey,
          recentBlockhash: bh,
          instructions: mainIxs,
          addressLookupTableAccounts: opts.addressLookupTables,
        });

        const mainTx = new VersionedTransaction(messageV0);
        const signers: Keypair[] = [signer, ...(opts.extraSigners ?? [])];
        mainTx.sign(signers);

        // Create bundle and add the main transaction
        const bundle = new Bundle([mainTx], 5); // max 5 txs in bundle

        // Add tip transaction to the bundle
        const tipAccount = pickRandom(cachedTipAccounts);
        bundle.addTipTx(
          signer,
          Math.round(tipSol * LAMPORTS_PER_SOL),
          new PublicKey(tipAccount),
          bh,
        );

        // Send bundle via gRPC
        const t0 = Date.now();
        const result = await searcher.sendBundle(bundle);
        const latencyMs = Date.now() - t0;

        if (isError(result)) {
          return {
            provider,
            accepted: false,
            error: `Jito bundle rejected: ${result}`,
            latencyMs,
          };
        }

        // result is the bundle ID on success
        const bundleId = result as string;
        return {
          provider,
          accepted: true,
          bundleId,
          latencyMs,
        };
      } catch (err: any) {
        return {
          provider,
          accepted: false,
          error: err?.message || "Jito bundle request failed",
        };
      }
    },
  };
}

export { createProvider };
