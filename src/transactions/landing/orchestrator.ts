/**
 * TX Landing Orchestrator
 *
 * Manages multiple TX landing providers and implements submission strategies:
 * - concurrent: Fire to all enabled providers in parallel (fire-and-forget)
 * - race: Fire to all, return first accepted result
 * - random: Pick 1-3 random providers + always include a fallback (nozomi)
 * - sequential: Try providers in order, stop on first success
 */

import {
  Keypair,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  ILandingProvider,
  LandingResult,
  SubmitOptions,
  OrchestratorConfig,
  SubmissionStrategy,
} from "./types";

// Provider factory imports
import { createProvider as createZeroSlot } from "./providers/zero-slot";
import { createProvider as createNozomi } from "./providers/nozomi";
import { createProvider as createHeliusSender } from "./providers/helius-sender";
import { createProvider as createBlockrazor } from "./providers/blockrazor";
import { createProvider as createNode1 } from "./providers/node1";
import { createProvider as createBloxroute } from "./providers/bloxroute";
import { createProvider as createAstralane } from "./providers/astralane";
import { createProvider as createStellium } from "./providers/stellium";
import { createProvider as createFlashblock } from "./providers/flashblock";
import { createProvider as createJito } from "./providers/jito";
import { createProvider as createNextblock } from "./providers/nextblock";
import { createProvider as createSoyas } from "./providers/soyas";

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const PROVIDER_FACTORIES: Record<string, () => ILandingProvider> = {
  "zero-slot": createZeroSlot,
  "nozomi": createNozomi,
  "helius-sender": createHeliusSender,
  "blockrazor": createBlockrazor,
  "node1": createNode1,
  "bloxroute": createBloxroute,
  "astralane": createAstralane,
  "stellium": createStellium,
  "flashblock": createFlashblock,
  "jito": createJito,
  "nextblock": createNextblock,
  "soyas": createSoyas,
};

/** Default providers for concurrent snipe submission (matches source orchestrator) */
const DEFAULT_SNIPE_PROVIDERS = [
  "zero-slot", "nozomi", "helius-sender", "astralane",
  "stellium", "blockrazor", "flashblock", "node1", "soyas",
];

/** Default providers for random pick strategy */
const DEFAULT_RANDOM_POOL = ["zero-slot", "nozomi", "helius-sender"];

/** Fallback provider always included in random strategy */
const RANDOM_FALLBACK = "nozomi";

// ---------------------------------------------------------------------------
// Orchestrator class
// ---------------------------------------------------------------------------

export class LandingOrchestrator {
  private providers: Map<string, ILandingProvider> = new Map();
  private config: OrchestratorConfig;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      strategy: config?.strategy ?? "concurrent",
      defaultTipSol: config?.defaultTipSol ?? 0.001,
      timeoutMs: config?.timeoutMs ?? 10_000,
      providers: config?.providers,
    };

    // Initialize all provider instances
    for (const [name, factory] of Object.entries(PROVIDER_FACTORIES)) {
      try {
        this.providers.set(name, factory());
      } catch (e) {
        // Provider failed to initialize — skip it
        console.warn(`[landing] Failed to initialize provider ${name}:`, e);
      }
    }
  }

  /**
   * Get all currently enabled providers.
   */
  getEnabledProviders(): ILandingProvider[] {
    const names = this.config.providers ?? [...this.providers.keys()];
    return names
      .map((n) => this.providers.get(n))
      .filter((p): p is ILandingProvider => p !== undefined && p.isEnabled());
  }

  /**
   * Get a specific provider by name.
   */
  getProvider(name: string): ILandingProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * List all registered provider names and their enabled status.
   */
  listProviders(): Array<{ name: string; enabled: boolean }> {
    return [...this.providers.entries()].map(([name, p]) => ({
      name,
      enabled: p.isEnabled(),
    }));
  }

  /**
   * Submit a transaction using the configured strategy.
   */
  async submit(
    ixs: TransactionInstruction[],
    signer: Keypair,
    blockhash: string | { blockhash: string; lastValidBlockHeight: number },
    opts?: Partial<SubmitOptions>,
  ): Promise<LandingResult[]> {
    const fullOpts: SubmitOptions = {
      dex: opts?.dex ?? "unknown",
      operation: opts?.operation ?? "swap",
      tipSol: opts?.tipSol ?? this.config.defaultTipSol,
      extraSigners: opts?.extraSigners,
      addressLookupTables: opts?.addressLookupTables,
    };

    switch (this.config.strategy) {
      case "concurrent":
        return this.submitConcurrent(ixs, signer, blockhash, fullOpts);
      case "race":
        return this.submitRace(ixs, signer, blockhash, fullOpts);
      case "random":
        return this.submitRandom(ixs, signer, blockhash, fullOpts);
      case "sequential":
        return this.submitSequential(ixs, signer, blockhash, fullOpts);
      default:
        return this.submitConcurrent(ixs, signer, blockhash, fullOpts);
    }
  }

  /**
   * Fire to all enabled providers in parallel. Returns all results.
   * This matches the source `concurrent_snipe_tx_landing` behavior.
   */
  private async submitConcurrent(
    ixs: TransactionInstruction[],
    signer: Keypair,
    blockhash: string | { blockhash: string; lastValidBlockHeight: number },
    opts: SubmitOptions,
  ): Promise<LandingResult[]> {
    const providers = this.getResolvedProviders(DEFAULT_SNIPE_PROVIDERS);
    if (providers.length === 0) {
      return [{ provider: "orchestrator", accepted: false, error: "No enabled providers" }];
    }

    const promises = providers.map((p) =>
      this.submitWithTimeout(p, ixs, signer, blockhash, opts)
    );

    const settled = await Promise.allSettled(promises);
    return settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value;
      return {
        provider: providers[i].name,
        accepted: false,
        error: String(s.reason),
      };
    });
  }

  /**
   * Fire to all enabled providers, return on first accepted result.
   */
  private async submitRace(
    ixs: TransactionInstruction[],
    signer: Keypair,
    blockhash: string | { blockhash: string; lastValidBlockHeight: number },
    opts: SubmitOptions,
  ): Promise<LandingResult[]> {
    const providers = this.getResolvedProviders(DEFAULT_SNIPE_PROVIDERS);
    if (providers.length === 0) {
      return [{ provider: "orchestrator", accepted: false, error: "No enabled providers" }];
    }

    const promises = providers.map((p) =>
      this.submitWithTimeout(p, ixs, signer, blockhash, opts).then((r) => {
        if (r.accepted) return r;
        throw r; // reject non-accepted to keep racing
      })
    );

    try {
      const winner = await Promise.any(promises);
      return [winner];
    } catch {
      // All rejected — collect all results
      const settled = await Promise.allSettled(
        providers.map((p) => this.submitWithTimeout(p, ixs, signer, blockhash, opts))
      );
      return settled.map((s, i) => {
        if (s.status === "fulfilled") return s.value;
        return { provider: providers[i].name, accepted: false, error: String(s.reason) };
      });
    }
  }

  /**
   * Pick 1-3 random providers + always include nozomi as fallback.
   * Matches the source `randomLandTx` behavior.
   */
  private async submitRandom(
    ixs: TransactionInstruction[],
    signer: Keypair,
    blockhash: string | { blockhash: string; lastValidBlockHeight: number },
    opts: SubmitOptions,
  ): Promise<LandingResult[]> {
    const enabled = this.getResolvedProviders(DEFAULT_RANDOM_POOL);
    if (enabled.length === 0) {
      return [{ provider: "orchestrator", accepted: false, error: "No enabled providers" }];
    }

    // Pick a random provider from the pool
    const picked = enabled[Math.floor(Math.random() * enabled.length)];
    const toSend: ILandingProvider[] = [picked];

    // Always add nozomi as fallback if it wasn't already picked
    if (picked.name !== RANDOM_FALLBACK) {
      const fallback = this.providers.get(RANDOM_FALLBACK);
      if (fallback?.isEnabled()) {
        toSend.push(fallback);
      }
    }

    const promises = toSend.map((p) =>
      this.submitWithTimeout(p, ixs, signer, blockhash, opts)
    );

    const settled = await Promise.allSettled(promises);
    return settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value;
      return { provider: toSend[i].name, accepted: false, error: String(s.reason) };
    });
  }

  /**
   * Try providers in order, stop on first success.
   */
  private async submitSequential(
    ixs: TransactionInstruction[],
    signer: Keypair,
    blockhash: string | { blockhash: string; lastValidBlockHeight: number },
    opts: SubmitOptions,
  ): Promise<LandingResult[]> {
    const providers = this.getResolvedProviders(DEFAULT_SNIPE_PROVIDERS);
    const results: LandingResult[] = [];

    for (const p of providers) {
      const result = await this.submitWithTimeout(p, ixs, signer, blockhash, opts);
      results.push(result);
      if (result.accepted) break;
    }

    return results;
  }

  /**
   * Submit with timeout wrapper.
   */
  private async submitWithTimeout(
    provider: ILandingProvider,
    ixs: TransactionInstruction[],
    signer: Keypair,
    blockhash: string | { blockhash: string; lastValidBlockHeight: number },
    opts: SubmitOptions,
  ): Promise<LandingResult> {
    const timeoutMs = this.config.timeoutMs ?? 10_000;

    return Promise.race([
      provider.submit(ixs, signer, blockhash, opts),
      new Promise<LandingResult>((_, reject) =>
        setTimeout(() => reject(new Error(`${provider.name} timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]).catch((err) => ({
      provider: provider.name,
      accepted: false,
      error: err instanceof Error ? err.message : String(err),
    }));
  }

  /**
   * Resolve provider names to instances, filtering to enabled only.
   */
  private getResolvedProviders(defaultNames: string[]): ILandingProvider[] {
    const names = this.config.providers ?? defaultNames;
    return names
      .map((n) => this.providers.get(n))
      .filter((p): p is ILandingProvider => p !== undefined && p.isEnabled());
  }

  /**
   * Ping all providers that support it (for keep-alive).
   */
  async pingAll(): Promise<void> {
    const promises = [...this.providers.values()]
      .filter((p) => p.isEnabled() && p.ping)
      .map((p) => p.ping!().catch(() => {}));
    await Promise.allSettled(promises);
  }
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

let _defaultOrchestrator: LandingOrchestrator | null = null;

/**
 * Get or create the default orchestrator singleton.
 */
export function getOrchestrator(config?: Partial<OrchestratorConfig>): LandingOrchestrator {
  if (!_defaultOrchestrator || config) {
    _defaultOrchestrator = new LandingOrchestrator(config);
  }
  return _defaultOrchestrator;
}

/**
 * Convenience: submit via the default orchestrator.
 */
export async function landTransaction(
  ixs: TransactionInstruction[],
  signer: Keypair,
  blockhash: string | { blockhash: string; lastValidBlockHeight: number },
  opts?: Partial<SubmitOptions>,
): Promise<LandingResult[]> {
  return getOrchestrator().submit(ixs, signer, blockhash, opts);
}
