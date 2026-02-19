/**
 * DEX Adapter Registry
 *
 * Central registry for all DEX adapters. Each adapter (raydium-amm-v4,
 * meteora-dlmm, orca, jupiter, etc.) registers itself here during module
 * initialization.
 *
 * Usage:
 *   import { getDexAdapter, listDexAdapters } from "../dex";
 *
 *   // Get a specific adapter
 *   const adapter = getDexAdapter("raydium-amm-v4");
 *   const result = await adapter.buy({ tokenMint: "...", amountSol: 0.1 });
 *
 *   // List all registered adapters
 *   const adapters = listDexAdapters();
 *   console.log(adapters.map(a => `${a.name} (${a.protocol})`));
 */

import {
  IDexAdapter,
  DexAdapterInfo,
  DexCapabilities,
} from "./types";

// Re-export everything from types for single-import convenience
export * from "./types";

// ---------------------------------------------------------------------------
// DexRegistry class
// ---------------------------------------------------------------------------

export class DexRegistry {
  private adapters: Map<string, IDexAdapter> = new Map();

  /**
   * Register a DEX adapter.
   *
   * @param adapter - The adapter to register
   * @throws Error if an adapter with the same name is already registered
   */
  registerAdapter(adapter: IDexAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(
        `DEX adapter "${adapter.name}" is already registered. ` +
        `Each adapter name must be unique.`,
      );
    }
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get a DEX adapter by name.
   *
   * @param name - Adapter name (e.g. "raydium-amm-v4")
   * @returns The adapter instance
   * @throws Error if no adapter with that name is registered
   */
  getDexAdapter(name: string): IDexAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      const available = [...this.adapters.keys()].join(", ") || "(none)";
      throw new Error(
        `DEX adapter "${name}" not found. Available adapters: ${available}`,
      );
    }
    return adapter;
  }

  /**
   * Get a DEX adapter by name, returning undefined if not found.
   */
  tryGetDexAdapter(name: string): IDexAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * List all registered adapters with their info.
   */
  listDexAdapters(): DexAdapterInfo[] {
    return [...this.adapters.values()].map((a) => ({
      name: a.name,
      protocol: a.protocol,
      capabilities: { ...a.capabilities },
    }));
  }

  /**
   * Get all adapters of a specific protocol type.
   *
   * @param protocol - Protocol type (e.g. "clmm", "dlmm", "amm-v4")
   */
  getAdaptersByProtocol(protocol: string): IDexAdapter[] {
    return [...this.adapters.values()].filter((a) => a.protocol === protocol);
  }

  /**
   * Get all adapters that have a specific capability.
   *
   * @param capability - Capability key (e.g. "canSell", "canSnipe")
   */
  getAdaptersWithCapability(
    capability: keyof DexCapabilities,
  ): IDexAdapter[] {
    return [...this.adapters.values()].filter(
      (a) => a.capabilities[capability],
    );
  }

  /**
   * Check if an adapter is registered.
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Number of registered adapters.
   */
  get count(): number {
    return this.adapters.size;
  }

  /**
   * Get all adapter names.
   */
  getNames(): string[] {
    return [...this.adapters.keys()];
  }
}

// ---------------------------------------------------------------------------
// Global singleton
// ---------------------------------------------------------------------------

let _registry: DexRegistry | null = null;

/**
 * Get the global DexRegistry singleton.
 * Creates it on first access.
 */
export function getRegistry(): DexRegistry {
  if (!_registry) {
    _registry = new DexRegistry();
  }
  return _registry;
}

/**
 * Convenience: get a DEX adapter by name from the global registry.
 */
export function getDexAdapter(name: string): IDexAdapter {
  return getRegistry().getDexAdapter(name);
}

/**
 * Convenience: list all registered adapters from the global registry.
 */
export function listDexAdapters(): DexAdapterInfo[] {
  return getRegistry().listDexAdapters();
}

/**
 * Convenience: register an adapter with the global registry.
 */
export function registerAdapter(adapter: IDexAdapter): void {
  getRegistry().registerAdapter(adapter);
}
