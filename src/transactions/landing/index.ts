/**
 * TX Landing Layer — Public API
 *
 * Usage:
 *   import { landTransaction, getOrchestrator } from "./transactions/landing";
 *
 *   // Quick: submit with default concurrent strategy
 *   const results = await landTransaction(ixs, signer, blockhash, { dex: "raydium-amm-v4", operation: "buy" });
 *
 *   // Advanced: configure orchestrator
 *   const orchestrator = getOrchestrator({ strategy: "race", defaultTipSol: 0.002 });
 *   const results = await orchestrator.submit(ixs, signer, blockhash, opts);
 */

// Types
export {
  ILandingProvider,
  LandingResult,
  SubmitOptions,
  OrchestratorConfig,
  SubmissionStrategy,
  TipAccount,
  extractBlockhash,
  pickRandom,
} from "./types";

// Orchestrator
export {
  LandingOrchestrator,
  getOrchestrator,
  landTransaction,
} from "./orchestrator";

// Nonce manager for durable nonce accounts (concurrent strategy safety)
export { NonceManager } from "./nonce-manager";

// Tip account registry
export {
  TIP_ACCOUNTS,
  isTipAccount,
  getTipAccountProvider,
  getTipAccountsForProvider,
} from "./tip-accounts";

// Individual provider factories (for advanced usage)
export { createProvider as createZeroSlotProvider } from "./providers/zero-slot";
export { createProvider as createNozomiProvider } from "./providers/nozomi";
export { createProvider as createHeliusSenderProvider } from "./providers/helius-sender";
export { createProvider as createBlockrazorProvider } from "./providers/blockrazor";
export { createProvider as createNode1Provider } from "./providers/node1";
export { createProvider as createBloxrouteProvider } from "./providers/bloxroute";
export { createProvider as createAstralaneProvider } from "./providers/astralane";
export { createProvider as createStelliumProvider } from "./providers/stellium";
export { createProvider as createFlashblockProvider } from "./providers/flashblock";
export { createProvider as createJitoProvider } from "./providers/jito";
export { createProvider as createNextblockProvider } from "./providers/nextblock";
export { createProvider as createSoyasProvider } from "./providers/soyas";
