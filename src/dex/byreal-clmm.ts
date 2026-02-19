/**
 * Byreal CLMM — IDexAdapter Implementation
 *
 * A CLMM (Concentrated Liquidity Market Maker) fork adapter using the shared
 * CLMM base. Byreal uses the same CLMM instruction format and account layout
 * as Raydium CLMM, with a different program ID.
 *
 * Program ID: REALQqNEomY6cQGZJUGwywTBD2UmDT32rZcNnfxQ5N2
 *
 * Source: 100x-algo-bots/trading-modules/byreal-clmm/
 */

import { PublicKey } from "@solana/web3.js";
import { ClmmBaseAdapter } from "./shared/clmm-base";
import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BYREAL_CLMM_PROGRAM_ID = new PublicKey(
  "REALQqNEomY6cQGZJUGwywTBD2UmDT32rZcNnfxQ5N2",
);

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class ByrealClmmAdapter extends ClmmBaseAdapter {
  constructor() {
    super({
      name: "byreal-clmm",
      protocol: "clmm",
      programId: BYREAL_CLMM_PROGRAM_ID,
    });
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new ByrealClmmAdapter());
