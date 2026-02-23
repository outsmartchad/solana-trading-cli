/**
 * Event Streaming Engine — Instruction discriminators.
 *
 * Each Anchor program uses the first 8 bytes of instruction data as a discriminator
 * (SHA-256 of "global:<instruction_name>" truncated to 8 bytes).
 *
 * We match these to identify Buy/Sell/Create operations across all DEX programs.
 */

// ---------------------------------------------------------------------------
// Helper: compare first 8 bytes of a buffer to a known discriminator
// ---------------------------------------------------------------------------

export function matchDiscriminator(data: Buffer | Uint8Array, expected: number[]): boolean {
  if (!data || data.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (data[i] !== expected[i]) return false;
  }
  return true;
}

export function getDiscriminatorHex(data: Buffer | Uint8Array): string {
  if (!data || data.length < 8) return "";
  return Buffer.from(data.slice(0, 8)).toString("hex");
}

// ---------------------------------------------------------------------------
// PumpSwap / PumpFun discriminators
// ---------------------------------------------------------------------------

export const PUMPSWAP_BUY = [102, 6, 61, 18, 1, 218, 235, 234];
export const PUMPSWAP_SELL = [51, 230, 133, 164, 1, 127, 131, 173];
export const PUMPSWAP_CREATE_POOL = [233, 146, 209, 142, 207, 104, 64, 188];
export const PUMPSWAP_CREATE_POOL_HEX = "e992d18ecf6840bc";

// PumpFun bonding curve (same discriminators for buy/sell, different program)
export const PUMPFUN_BUY = [102, 6, 61, 18, 1, 218, 235, 234];
export const PUMPFUN_SELL = [51, 230, 133, 164, 1, 127, 131, 173];
export const PUMPFUN_CREATE = [24, 30, 200, 40, 5, 28, 7, 119];

// ---------------------------------------------------------------------------
// Raydium CPMM discriminators (hex prefix matching)
// ---------------------------------------------------------------------------

// Raydium CPMM uses SDK-generated discriminators
// We match on hex prefix of instruction data
export const RAYDIUM_CPMM_SWAP_BASE_INPUT_HEX = "8fbe5adac41e33de"; // swapBaseInput
export const RAYDIUM_CPMM_SWAP_BASE_OUTPUT_HEX = "37d3073fbb8a32c1"; // swapBaseOutput  
export const RAYDIUM_CPMM_CREATE_POOL_HEX = "e992d18ecf6840bc"; // initialize (same pattern)

// Raydium AMM v4 uses a single-byte discriminator (byte[0] = 9 for swap)
export const RAYDIUM_AMM_V4_SWAP_BYTE = 9;
export const RAYDIUM_AMM_V4_INITIALIZE2_BYTE = 1;

// Raydium CLMM
export const RAYDIUM_CLMM_SWAP_HEX = "f8c69e91e17587c8"; // swap
export const RAYDIUM_CLMM_SWAP_V2_HEX = "2b04ed0b1ac91e62"; // swapV2
export const RAYDIUM_CLMM_CREATE_HEX = "cf27e4bce23fb224"; // createPool
export const RAYDIUM_CLMM_OPEN_POSITION_HEX = "87802f4d0f98f031"; // openPosition

// Raydium LaunchLab — same as PumpSwap since it's a fork-like design
export const RAYDIUM_LAUNCHLAB_BUY = PUMPSWAP_BUY;
export const RAYDIUM_LAUNCHLAB_SELL = PUMPSWAP_SELL;

// ---------------------------------------------------------------------------
// Meteora discriminators (matched via inner instruction data or hex prefix)
// ---------------------------------------------------------------------------

// Meteora DLMM
export const METEORA_DLMM_SWAP_HEX = "f8c69e91e17587c8"; // swap
export const METEORA_DLMM_ADD_LIQUIDITY_HEX = "2e1182f1dc24668c"; // addLiquidity
export const METEORA_DLMM_INITIALIZE_POOL_HEX = "afaf6d1f0d989bed"; // initializeCustomizablePermissionlessLbPair

// Meteora DAMM V2 (CP AMM)
export const METEORA_DAMM_V2_SWAP_HEX = "8fbe5adac41e33de"; // swap (same as Raydium CPMM pattern)
export const METEORA_DAMM_V2_CREATE_HEX = "e992d18ecf6840bc"; // createPool

// Meteora DBC
export const METEORA_DBC_SWAP_HEX = "f8c69e91e17587c8"; // swap

// ---------------------------------------------------------------------------
// Read helpers (for parsing inner instruction data)
// ---------------------------------------------------------------------------

export function readU64LE(data: Buffer | Uint8Array, offset: number): bigint {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return buf.readBigUInt64LE(offset);
}

export function readU16LE(data: Buffer | Uint8Array, offset: number): number {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return buf.readUInt16LE(offset);
}
