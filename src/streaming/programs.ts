/**
 * Event Streaming Engine — Program IDs for all supported DEXes.
 *
 * Mirrors the program IDs from 100x-algo-bots/trading-modules/streaming/grpc-requests-type.ts
 * but kept self-contained — no external dependencies.
 */

// ---------------------------------------------------------------------------
// PumpFun / PumpSwap
// ---------------------------------------------------------------------------

export const PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMP_SWAP_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
export const PUMP_SWAP_GLOBAL_FEE = "ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw";
export const PUMPFUN_MIGRATION = "39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg";

// ---------------------------------------------------------------------------
// Raydium
// ---------------------------------------------------------------------------

export const RAYDIUM_AMM_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
export const RAYDIUM_CPMM_PROGRAM_ID = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
export const RAYDIUM_CLMM_PROGRAM_ID = "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";
export const RAYDIUM_LAUNCHLAB_PROGRAM_ID = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";
export const RAYDIUM_AUTHORITY = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";

// ---------------------------------------------------------------------------
// Meteora
// ---------------------------------------------------------------------------

export const METEORA_DBC_PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
export const METEORA_DAMM_V1_PROGRAM_ID = "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB";
export const METEORA_DAMM_V2_PROGRAM_ID = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG";
export const METEORA_DLMM_PROGRAM_ID = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";

// ---------------------------------------------------------------------------
// Other DEXes
// ---------------------------------------------------------------------------

export const ORCA_WHIRLPOOLS_PROGRAM_ID = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
export const PANCAKE_SWAP_PROGRAM_ID = "HpNfyc2Saw7RKkQd8nEL4khUcuPhQ7WwY1B2qjx8jxFq";
export const BYREAL_PROGRAM_ID = "REALQqNEomY6cQGZJUGwywTBD2UmDT32rZcNnfxQ5N2";
export const FUSION_AMM_PROGRAM_ID = "fUSioN9YKKSa3CUC2YUc4tPkHJ5Y6XW1yz8y6F7qWz9";
export const FUTARCHY_AMM_PROGRAM_ID = "FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq";
export const FUTARCHY_LAUNCHPAD_PROGRAM_ID = "moontUzsdepotRGe5xsfip7vLPTJnVuafqdUWexVnPM";
export const DFLOW_SWAP_PROGRAM_ID = "DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH";

// ---------------------------------------------------------------------------
// Aggregators (for exclusion / detection)
// ---------------------------------------------------------------------------

export const JUP_SWAP_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

// ---------------------------------------------------------------------------
// Program ID → DEX name mapping
// ---------------------------------------------------------------------------

export const PROGRAM_TO_DEX: Record<string, string> = {
  [PUMP_FUN_PROGRAM_ID]: "pumpfun",
  [PUMP_SWAP_PROGRAM_ID]: "pumpswap",
  [RAYDIUM_AMM_V4_PROGRAM_ID]: "raydium-amm-v4",
  [RAYDIUM_CPMM_PROGRAM_ID]: "raydium-cpmm",
  [RAYDIUM_CLMM_PROGRAM_ID]: "raydium-clmm",
  [RAYDIUM_LAUNCHLAB_PROGRAM_ID]: "raydium-launchlab",
  [METEORA_DBC_PROGRAM_ID]: "meteora-dbc",
  [METEORA_DAMM_V1_PROGRAM_ID]: "meteora-damm-v1",
  [METEORA_DAMM_V2_PROGRAM_ID]: "meteora-damm-v2",
  [METEORA_DLMM_PROGRAM_ID]: "meteora-dlmm",
  [ORCA_WHIRLPOOLS_PROGRAM_ID]: "orca",
  [PANCAKE_SWAP_PROGRAM_ID]: "pancakeswap-clmm",
  [BYREAL_PROGRAM_ID]: "byreal-clmm",
  [FUSION_AMM_PROGRAM_ID]: "fusion-amm",
  [FUTARCHY_AMM_PROGRAM_ID]: "futarchy-amm",
  [DFLOW_SWAP_PROGRAM_ID]: "dflow",
};

// ---------------------------------------------------------------------------
// Grouped program ID lists for subscription builders
// ---------------------------------------------------------------------------

export const ALL_DEX_PROGRAM_IDS = Object.keys(PROGRAM_TO_DEX);

export const PUMPSWAP_PROGRAM_IDS = [PUMP_SWAP_PROGRAM_ID];

export const RAYDIUM_PROGRAM_IDS = [
  RAYDIUM_AMM_V4_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
];

export const METEORA_PROGRAM_IDS = [
  METEORA_DBC_PROGRAM_ID,
  METEORA_DAMM_V1_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  METEORA_DLMM_PROGRAM_ID,
];

export const OTHER_DEX_PROGRAM_IDS = [
  ORCA_WHIRLPOOLS_PROGRAM_ID,
  PANCAKE_SWAP_PROGRAM_ID,
  BYREAL_PROGRAM_ID,
  FUSION_AMM_PROGRAM_ID,
  FUTARCHY_AMM_PROGRAM_ID,
];

/** Programs that indicate "new pool creation" when combined with migration authority */
export const NEW_POOL_PROGRAM_IDS = [
  RAYDIUM_CPMM_PROGRAM_ID,
  METEORA_DAMM_V2_PROGRAM_ID,
  PUMP_SWAP_PROGRAM_ID,
  METEORA_DBC_PROGRAM_ID,
];
