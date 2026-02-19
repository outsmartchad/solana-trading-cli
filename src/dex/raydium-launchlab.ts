/**
 * Raydium LaunchLab DEX Adapter
 *
 * Implements IDexAdapter for Raydium's LaunchLab (Launchpad) program
 * (LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj).
 *
 * Buy-only until pool migration. canGetPrice via bonding curve math.
 *
 * Ported from: 100x-algo-bots/trading-modules/raydium-launchlab/
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";

import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SnipeParams,
  SwapResult,
  PoolInfo,
  PriceInfo,
  BuildSwapIxsResult,
  UnsupportedOperationError,
  PoolNotFoundError,
  WSOL_MINT,
  USDC_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
} from "./types";
import { registerAdapter } from "./index";
import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";

// ---------------------------------------------------------------------------
// Program constants
// ---------------------------------------------------------------------------

const RAYDIUM_LAUNCHPAD_PROGRAM_ID = new PublicKey("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj");
const TOKEN_PROGRAM_ID_PK = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const WSOL_MINT_PK = new PublicKey(WSOL_MINT);
const USDC_MINT_PK = new PublicKey(USDC_MINT);
const USDT_MINT_PK = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
const USD1_MINT_PK = new PublicKey("USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB");

// BuyExactIn discriminator from Anchor
const BUY_EXACT_IN_DISCRIMINATOR = Buffer.from([250, 234, 13, 123, 213, 156, 19, 236]);

// PDA seeds
const AUTH_SEED = Buffer.from("vault_auth_seed", "utf8");
const POOL_SEED = Buffer.from("pool_state", "utf8");
const POOL_VAULT_SEED = Buffer.from("pool_vault", "utf8");
const PLATFORM_SEED = Buffer.from("platform_config", "utf8");
const CPI_EVENT_SEED = Buffer.from("__event_authority", "utf8");

// ---------------------------------------------------------------------------
// PDA helpers (ported from raydium-launchlab/utils/pda-native.ts)
// ---------------------------------------------------------------------------

function getLaunchpadAuth(): PublicKey {
  const [auth] = PublicKey.findProgramAddressSync([AUTH_SEED], RAYDIUM_LAUNCHPAD_PROGRAM_ID);
  return auth;
}

function getLaunchpadPoolPda(mintA: PublicKey, mintB: PublicKey): PublicKey {
  const [pool] = PublicKey.findProgramAddressSync(
    [POOL_SEED, mintA.toBuffer(), mintB.toBuffer()],
    RAYDIUM_LAUNCHPAD_PROGRAM_ID,
  );
  return pool;
}

function getLaunchpadCpiEventPda(): PublicKey {
  const [event] = PublicKey.findProgramAddressSync([CPI_EVENT_SEED], RAYDIUM_LAUNCHPAD_PROGRAM_ID);
  return event;
}

function getLaunchpadPlatformVaultPda(platformId: PublicKey, mintB: PublicKey): PublicKey {
  const [vault] = PublicKey.findProgramAddressSync(
    [platformId.toBuffer(), mintB.toBuffer()],
    RAYDIUM_LAUNCHPAD_PROGRAM_ID,
  );
  return vault;
}

function getLaunchpadCreatorVaultPda(creator: PublicKey, mintB: PublicKey): PublicKey {
  const [vault] = PublicKey.findProgramAddressSync(
    [creator.toBuffer(), mintB.toBuffer()],
    RAYDIUM_LAUNCHPAD_PROGRAM_ID,
  );
  return vault;
}

// ---------------------------------------------------------------------------
// Pool state decoder (ported from raydium-launchlab/utils/pool.ts)
// ---------------------------------------------------------------------------

interface LaunchpadPoolState {
  configId: PublicKey;
  platformId: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  creator: PublicKey;
  mintDecimalsA: number;
  mintDecimalsB: number;
  virtualA: BN;
  virtualB: BN;
  realA: BN;
  realB: BN;
  migrateType: number;
}

function decodeLaunchpadPool(data: Buffer): LaunchpadPoolState {
  if (data.length < 429) {
    throw new Error(`Launchpad pool data too short: ${data.length}`);
  }

  const mintDecimalsA = data.readUInt8(18);
  const mintDecimalsB = data.readUInt8(19);
  const migrateType = data.readUInt8(20);

  const virtualA = new BN(data.slice(37, 45), "le");
  const virtualB = new BN(data.slice(45, 53), "le");
  const realA = new BN(data.slice(53, 61), "le");
  const realB = new BN(data.slice(61, 69), "le");

  const configId = new PublicKey(data.slice(141, 173));
  const platformId = new PublicKey(data.slice(173, 205));
  const mintA = new PublicKey(data.slice(205, 237));
  const mintB = new PublicKey(data.slice(237, 269));
  const vaultA = new PublicKey(data.slice(269, 301));
  const vaultB = new PublicKey(data.slice(301, 333));
  const creator = new PublicKey(data.slice(333, 365));

  return {
    configId, platformId, mintA, mintB, vaultA, vaultB, creator,
    mintDecimalsA, mintDecimalsB, virtualA, virtualB, realA, realB, migrateType,
  };
}

async function fetchLaunchpadPoolState(
  connection: Connection,
  poolId: PublicKey,
): Promise<LaunchpadPoolState> {
  const info = await connection.getAccountInfo(poolId);
  if (!info) throw new Error(`Launchpad pool account not found: ${poolId.toBase58()}`);
  if (!info.owner.equals(RAYDIUM_LAUNCHPAD_PROGRAM_ID)) {
    throw new Error(`Invalid owner for Launchpad pool: ${info.owner.toBase58()}`);
  }
  return decodeLaunchpadPool(info.data);
}

// ---------------------------------------------------------------------------
// Token program detection
// ---------------------------------------------------------------------------

async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID_PK;
}

// ---------------------------------------------------------------------------
// SDK instruction builder (ported from raydium-launchlab/sdk.ts)
// ---------------------------------------------------------------------------

interface LaunchLabSdkConfig {
  programId: PublicKey;
  configId: PublicKey;
  platformId: PublicKey;
  poolId: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  tokenProgramA: PublicKey;
  tokenProgramB: PublicKey;
  platformClaimFeeVault: PublicKey;
  creatorClaimFeeVault: PublicKey;
}

function createBuyExactInIx(
  cfg: LaunchLabSdkConfig,
  owner: PublicKey,
  userTokenAccountA: PublicKey,
  userTokenAccountB: PublicKey,
  amountIn: bigint,
  minOut: bigint,
  shareFeeRate: bigint = 0n,
  shareFeeReceiver?: PublicKey,
): TransactionInstruction {
  const auth = getLaunchpadAuth();
  const cpiEvent = getLaunchpadCpiEventPda();

  const keys = [
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: auth, isSigner: false, isWritable: false },
    { pubkey: cfg.configId, isSigner: false, isWritable: false },
    { pubkey: cfg.platformId, isSigner: false, isWritable: false },
    { pubkey: cfg.poolId, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: cfg.vaultA, isSigner: false, isWritable: true },
    { pubkey: cfg.vaultB, isSigner: false, isWritable: true },
    { pubkey: cfg.mintA, isSigner: false, isWritable: false },
    { pubkey: cfg.mintB, isSigner: false, isWritable: false },
    { pubkey: cfg.tokenProgramA, isSigner: false, isWritable: false },
    { pubkey: cfg.tokenProgramB, isSigner: false, isWritable: false },
    { pubkey: cpiEvent, isSigner: false, isWritable: false },
    { pubkey: cfg.programId, isSigner: false, isWritable: false },
  ];

  if (shareFeeReceiver) {
    keys.push({ pubkey: shareFeeReceiver, isSigner: false, isWritable: true });
  }

  keys.push(
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: cfg.platformClaimFeeVault, isSigner: false, isWritable: true },
    { pubkey: cfg.creatorClaimFeeVault, isSigner: false, isWritable: true },
  );

  // Data: [amountB: u64, minAmountA: u64, shareFeeRate: u64]
  const argData = Buffer.alloc(24);
  argData.writeBigUInt64LE(amountIn, 0);
  argData.writeBigUInt64LE(minOut, 8);
  argData.writeBigUInt64LE(shareFeeRate, 16);

  return new TransactionInstruction({
    keys,
    programId: cfg.programId,
    data: Buffer.concat([BUY_EXACT_IN_DISCRIMINATOR, argData]),
  });
}

// ---------------------------------------------------------------------------
// Price calculation from bonding curve
// ---------------------------------------------------------------------------

function calculateLaunchpadPrice(
  poolState: LaunchpadPoolState,
  baseMint: PublicKey,
): number {
  let virtualBase: BN;
  let virtualQuote: BN;
  let decimalBase: number;
  let decimalQuote: number;

  if (poolState.mintA.equals(baseMint)) {
    virtualBase = poolState.virtualA;
    virtualQuote = poolState.virtualB;
    decimalBase = poolState.mintDecimalsA;
    decimalQuote = poolState.mintDecimalsB;
  } else if (poolState.mintB.equals(baseMint)) {
    virtualBase = poolState.virtualB;
    virtualQuote = poolState.virtualA;
    decimalBase = poolState.mintDecimalsB;
    decimalQuote = poolState.mintDecimalsA;
  } else {
    return 0;
  }

  if (virtualBase.isZero()) return 0;

  const virtualQuoteNum = Number(virtualQuote.toString());
  const virtualBaseNum = Number(virtualBase.toString());
  const decimalAdjustment = 10 ** (decimalBase - decimalQuote);
  let price = (virtualQuoteNum / virtualBaseNum) * decimalAdjustment;

  if (price > 1) price = 1 / price;
  return price;
}

// ---------------------------------------------------------------------------
// Pool discovery
// ---------------------------------------------------------------------------

async function discoverLaunchpadPool(
  connection: Connection,
  baseMint: PublicKey,
  quoteMint: PublicKey,
): Promise<PublicKey | null> {
  // Try both mint orderings
  const candidates = [
    getLaunchpadPoolPda(baseMint, quoteMint),
    getLaunchpadPoolPda(quoteMint, baseMint),
  ];

  for (const poolId of candidates) {
    try {
      const info = await connection.getAccountInfo(poolId);
      if (info && info.owner.equals(RAYDIUM_LAUNCHPAD_PROGRAM_ID)) {
        return poolId;
      }
    } catch {
      // skip
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

class RaydiumLaunchLabAdapter implements IDexAdapter {
  readonly name = "raydium-launchlab";
  readonly protocol = "launchlab";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: false, // Buy-only until pool migration
    canSnipe: false, // No snipe — LaunchLab pools use different mechanics
    canFindPool: true,
    canGetPrice: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMint = new PublicKey(params.tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? 5_000_000;
    const computeUnits = params.opts?.computeUnitLimit ?? 300_000;

    // Resolve pool
    let poolId: PublicKey;
    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
    } else {
      const found = await discoverLaunchpadPool(connection, tokenMint, quoteMintPk);
      if (!found) throw new PoolNotFoundError(this.name, params.tokenMint, params.quoteMint);
      poolId = found;
    }

    // Fetch pool state
    const poolState = await fetchLaunchpadPoolState(connection, poolId);

    // Derive PDAs
    const platformClaimFeeVault = getLaunchpadPlatformVaultPda(poolState.platformId, poolState.mintB);
    const creatorClaimFeeVault = getLaunchpadCreatorVaultPda(poolState.creator, poolState.mintB);

    // Determine token programs
    const tokenProgramA = await getTokenProgramForMint(connection, poolState.mintA);
    const tokenProgramB = await getTokenProgramForMint(connection, poolState.mintB);

    const sdkCfg: LaunchLabSdkConfig = {
      programId: RAYDIUM_LAUNCHPAD_PROGRAM_ID,
      configId: poolState.configId,
      platformId: poolState.platformId,
      poolId,
      vaultA: poolState.vaultA,
      vaultB: poolState.vaultB,
      mintA: poolState.mintA,
      mintB: poolState.mintB,
      tokenProgramA,
      tokenProgramB,
      platformClaimFeeVault,
      creatorClaimFeeVault,
    };

    // Compute input amount
    let amountInLamportsB: bigint;
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      amountInLamportsB = BigInt(Math.floor(params.amountSol * LAMPORTS_PER_SOL));
    } else {
      // USDC/USD1/USDT: 6 decimals
      amountInLamportsB = BigInt(Math.floor(params.amountSol * 1e6));
    }

    const minOutA = 0n; // unlimited slippage for now

    // User token accounts
    const userTokenAccountA = await getAssociatedTokenAddress(
      poolState.mintA,
      wallet.publicKey,
      tokenProgramA.equals(TOKEN_2022_PROGRAM_ID),
      tokenProgramA,
    );
    const userTokenAccountB = await getAssociatedTokenAddress(
      poolState.mintB,
      wallet.publicKey,
      tokenProgramB.equals(TOKEN_2022_PROGRAM_ID),
      tokenProgramB,
    );

    // Build swap instruction
    const swapIx = createBuyExactInIx(
      sdkCfg,
      wallet.publicKey,
      userTokenAccountA,
      userTokenAccountB,
      amountInLamportsB,
      minOutA,
    );

    // Build instruction list
    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        userTokenAccountA,
        wallet.publicKey,
        poolState.mintA,
        tokenProgramA.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID_PK,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        userTokenAccountB,
        wallet.publicKey,
        poolState.mintB,
        tokenProgramB.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID_PK,
      ),
    ];

    // WSOL wrapping
    if (poolState.mintB.equals(WSOL_MINT_PK)) {
      const lamports = Number(amountInLamportsB);
      ixs.push(
        SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: userTokenAccountB, lamports }),
        createSyncNativeInstruction(userTokenAccountB),
      );
    }

    ixs.push(swapIx);

    // Close WSOL after swap
    if (poolState.mintB.equals(WSOL_MINT_PK)) {
      ixs.push(createCloseAccountInstruction(userTokenAccountB, wallet.publicKey, wallet.publicKey));
    }

    // Submit
    const { blockhash } = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "buy",
      tipSol: params.opts?.tipSol,
    });

    const firstAccepted = results.find((r) => r.accepted);
    return {
      txSignature: firstAccepted?.signature ?? "",
      confirmed: !!firstAccepted?.accepted,
      amountIn: params.amountSol,
      amountInToken: quoteMintPk.equals(WSOL_MINT_PK) ? "SOL" : quoteMintPk.toBase58(),
      dex: this.name,
      poolAddress: poolId.toBase58(),
    };
  }

  // ----- Core: sell (unsupported) -----

  async sell(_params: SellParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(this.name, "sell");
  }

  // ----- Pool discovery -----

  async findPool(baseMint: string, quoteMint?: string): Promise<PoolInfo | null> {
    const connection = getConnection();
    const baseMintPk = new PublicKey(baseMint);
    const quoteMintPk = quoteMint ? new PublicKey(quoteMint) : WSOL_MINT_PK;

    const poolId = await discoverLaunchpadPool(connection, baseMintPk, quoteMintPk);
    if (!poolId) return null;

    try {
      const poolState = await fetchLaunchpadPoolState(connection, poolId);
      const price = calculateLaunchpadPrice(poolState, baseMintPk);

      return {
        address: poolId.toBase58(),
        dex: this.name,
        protocol: this.protocol,
        baseMint: poolState.mintA.toBase58(),
        quoteMint: poolState.mintB.toBase58(),
        baseDecimals: poolState.mintDecimalsA,
        quoteDecimals: poolState.mintDecimalsB,
        price,
      };
    } catch {
      return {
        address: poolId.toBase58(),
        dex: this.name,
        protocol: this.protocol,
        baseMint,
        quoteMint: quoteMintPk.toBase58(),
        baseDecimals: 6,
        quoteDecimals: quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6,
      };
    }
  }

  // ----- Price (via bonding curve math) -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolId = new PublicKey(poolAddress);
    const poolState = await fetchLaunchpadPoolState(connection, poolId);

    // Determine which mint is the "base" (launch token) — it's mintA
    const price = calculateLaunchpadPrice(poolState, poolState.mintA);

    return {
      price,
      baseMint: poolState.mintA.toBase58(),
      quoteMint: poolState.mintB.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }
}

// ---------------------------------------------------------------------------
// Register adapter
// ---------------------------------------------------------------------------

registerAdapter(new RaydiumLaunchLabAdapter());
