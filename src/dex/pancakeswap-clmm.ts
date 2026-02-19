/**
 * PancakeSwap CLMM — IDexAdapter Implementation
 *
 * A CLMM (Concentrated Liquidity Market Maker) fork adapter using the shared
 * CLMM base. PancakeSwap uses the same CLMM instruction format and account
 * layout as Raydium CLMM, with a different program ID.
 *
 * Program ID: HpNfyc2Saw7RKkQd8nEL4khUcuPhQ7WwY1B2qjx8jxFq
 *
 * Source: 100x-algo-bots/trading-modules/pancakeswap-clmm/
 */

import { PublicKey } from "@solana/web3.js";
import { ClmmBaseAdapter } from "./shared/clmm-base";
import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PANCAKESWAP_CLMM_PROGRAM_ID = new PublicKey(
  "HpNfyc2Saw7RKkQd8nEL4khUcuPhQ7WwY1B2qjx8jxFq",
);

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PancakeSwapClmmAdapter extends ClmmBaseAdapter {
  constructor() {
    super({
      name: "pancakeswap-clmm",
      protocol: "clmm",
      programId: PANCAKESWAP_CLMM_PROGRAM_ID,
    });
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new PancakeSwapClmmAdapter());
