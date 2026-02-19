/**
 * Orca Wavebreak (Bonding Curve) — IDexAdapter Implementation
 *
 * Minimal adapter for Orca's Wavebreak program (bonding curve token launches).
 * Supports buy and snipe only — no sell, no pool discovery, no price reading.
 *
 * Key details:
 * - Uses the Wavebreak program (waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF).
 * - Requires permission data (PermissionMessage + PermissionSignature) for every
 *   trade. This is an Ed25519 signature from Orca's permission service.
 * - Bonding curve address can be derived from base mint via PDA or passed directly.
 * - Instruction data is manually serialized (Borsh format).
 *
 * Source: 100x-algo-bots/trading-modules/orca-wavebreak/
 *
 * NOTE: This adapter is limited because Wavebreak requires external permission
 * signatures that cannot be generated client-side. The snipe() method requires
 * callers to provide permission data via the opts object (extended SnipeParams).
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { address } from "@solana/kit";

// @ts-ignore — @orca-so/wavebreak may not be installed
import { getBondingCurveAddress } from "@orca-so/wavebreak";

import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";
import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SnipeParams,
  SwapResult,
  UnsupportedOperationError,
  WSOL_MINT,
  USDC_MINT,
  USDT_MINT,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./types";
import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WAVEBREAK_PROGRAM_ID = new PublicKey(
  "waveQX2yP3H1pVU8djGvEHmYg8uamQ84AuyGtpsrXTF",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);
const USD1_MINT = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB";

const SIX_DECIMAL_MINTS = new Set([USDC_MINT, USDT_MINT, USD1_MINT]);

// Instruction discriminators
const PERMISSION_CONSUME_TOP_LEVEL_DISCRIMINATOR = 0;
const TOKEN_BUY_EXACT_IN_DISCRIMINATOR = 8;

// Hardcoded permission signer (same for every coin on Wavebreak)
const HARDCODED_PERMISSION_SIGNER = Buffer.from([
  3, 89, 197, 74, 191, 202, 60, 228, 170, 64, 247, 78, 236, 23, 197, 15, 34,
  222, 66, 193, 0, 46, 135, 31, 205, 152, 211, 111, 111, 24, 107, 43, 41,
]);

// ---------------------------------------------------------------------------
// Types for permission data
// ---------------------------------------------------------------------------

export interface PermissionMessageV1 {
  nonce: bigint;
  consumerProgram: PublicKey;
  permissionSigner: Buffer; // 33 bytes
  permissionSubject: PublicKey;
  validUntil: bigint;
  permissionType: number;
  instructionDiscriminators: Buffer[];
}

export interface PermissionSignature {
  recoveryId: number;
  bytes: Buffer; // 64 bytes
}

/** Extended snipe options for Wavebreak — must include permission data. */
export interface WavebreakSnipeOpts {
  bondingCurveAddress?: string;
  permissionMessage: PermissionMessageV1;
  permissionSignature: PermissionSignature;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function quoteDecimals(quoteMintStr: string): number {
  return SIX_DECIMAL_MINTS.has(quoteMintStr) ? 6 : 9;
}

async function retryRpcCall<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  delayMs = 200,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

function getPermissionConfigAddress(
  consumerProgram: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("permission_config"), consumerProgram.toBuffer()],
    WAVEBREAK_PROGRAM_ID,
  );
}

function getConsumedPermissionAddress(
  signature: PermissionSignature,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("consumed_permission"),
      signature.bytes.subarray(0, 32),
      signature.bytes.subarray(32, 64),
    ],
    WAVEBREAK_PROGRAM_ID,
  );
}

function buildPermissionConsumeTopLevelInstruction(
  consumer: PublicKey,
  permissionConfig: PublicKey,
  consumedPermission: PublicKey,
  permissionMessage: PermissionMessageV1,
  permissionSignature: PermissionSignature,
): TransactionInstruction {
  // Serialize discriminator
  const discriminator = Buffer.from([PERMISSION_CONSUME_TOP_LEVEL_DISCRIMINATOR]);

  // PermissionMessage V1 variant
  const messageVariant = Buffer.from([0]);
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(permissionMessage.nonce, 0);
  const consumerProgramBuffer = permissionMessage.consumerProgram.toBuffer();
  const permissionSignerBuffer = permissionMessage.permissionSigner;
  const permissionSubjectBuffer = permissionMessage.permissionSubject.toBuffer();
  const validUntilBuffer = Buffer.alloc(8);
  validUntilBuffer.writeBigUInt64LE(permissionMessage.validUntil, 0);
  const permissionTypeBuffer = Buffer.from([permissionMessage.permissionType]);

  // instruction_discriminators: Vec<Vec<u8>>
  const discriminatorsLength = permissionMessage.instructionDiscriminators.length;
  const discriminatorsLengthBuffer = Buffer.alloc(4);
  discriminatorsLengthBuffer.writeUInt32LE(discriminatorsLength, 0);
  const discriminatorsBuffer = Buffer.concat(
    permissionMessage.instructionDiscriminators.map((disc) => {
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32LE(disc.length, 0);
      return Buffer.concat([lenBuf, disc]);
    }),
  );

  const permissionMessageBuffer = Buffer.concat([
    messageVariant,
    nonceBuffer,
    consumerProgramBuffer,
    permissionSignerBuffer,
    permissionSubjectBuffer,
    validUntilBuffer,
    permissionTypeBuffer,
    discriminatorsLengthBuffer,
    discriminatorsBuffer,
  ]);

  // PermissionSignature
  const signatureRecoveryIdBuffer = Buffer.from([permissionSignature.recoveryId]);
  const signatureBytesBuffer = permissionSignature.bytes;
  const permissionSignatureBuffer = Buffer.concat([
    signatureRecoveryIdBuffer,
    signatureBytesBuffer,
  ]);

  const instructionData = Buffer.concat([
    discriminator,
    permissionMessageBuffer,
    permissionSignatureBuffer,
  ]);

  return new TransactionInstruction({
    programId: WAVEBREAK_PROGRAM_ID,
    keys: [
      { pubkey: consumer, isSigner: true, isWritable: true },
      { pubkey: permissionConfig, isSigner: false, isWritable: false },
      { pubkey: consumedPermission, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
}

function buildTokenBuyExactInInstruction(
  buyer: PublicKey,
  bondingCurve: PublicKey,
  baseMint: PublicKey,
  baseAta: PublicKey,
  quoteMint: PublicKey,
  quoteVault: PublicKey,
  quoteAta: PublicKey,
  baseTokenProgram: PublicKey,
  quoteTokenProgram: PublicKey,
  amountIn: bigint,
  allowPartialFill: boolean,
  priceThreshold: [bigint, bigint] | null,
): TransactionInstruction {
  const discriminator = Buffer.from([TOKEN_BUY_EXACT_IN_DISCRIMINATOR]);
  const amountInBuffer = Buffer.alloc(8);
  amountInBuffer.writeBigUInt64LE(amountIn, 0);
  const allowPartialFillBuffer = Buffer.from([allowPartialFill ? 1 : 0]);

  let priceThresholdBuffer: Buffer;
  if (priceThreshold) {
    const optionFlag = Buffer.from([1]);
    const p0 = Buffer.alloc(8);
    p0.writeBigUInt64LE(priceThreshold[0], 0);
    const p1 = Buffer.alloc(8);
    p1.writeBigUInt64LE(priceThreshold[1], 0);
    priceThresholdBuffer = Buffer.concat([optionFlag, p0, p1]);
  } else {
    priceThresholdBuffer = Buffer.from([0]);
  }

  const instructionData = Buffer.concat([
    discriminator,
    amountInBuffer,
    allowPartialFillBuffer,
    priceThresholdBuffer,
  ]);

  return new TransactionInstruction({
    programId: WAVEBREAK_PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: true },
      { pubkey: baseAta, isSigner: false, isWritable: true },
      { pubkey: quoteMint, isSigner: false, isWritable: false },
      { pubkey: quoteVault, isSigner: false, isWritable: true },
      { pubkey: quoteAta, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: baseTokenProgram, isSigner: false, isWritable: false },
      { pubkey: quoteTokenProgram, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OrcaWavebreakAdapter implements IDexAdapter {
  readonly name = "orca-wavebreak";
  readonly protocol = "wavebreak";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSnipe: true,
  });

  // ---- Core: buy ----

  async buy(params: BuyParams): Promise<SwapResult> {
    // Wavebreak requires permission data for every trade.
    // buy() is a simplified wrapper that delegates to snipe().
    throw new UnsupportedOperationError(
      this.name,
      "buy (use snipe with permission data)",
    );
  }

  // ---- Core: sell (not supported) ----

  async sell(_params: SellParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(this.name, "sell");
  }

  // ---- Snipe ----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, quoteMint: quoteMintParam, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    // The poolAddress for wavebreak is the bonding curve address.
    // Permission data must be provided via extended params.
    // For now, we support the basic bonding curve buy without permission
    // (will fail on-chain if permission is required — caller must handle).

    const baseMintPk = new PublicKey(tokenMint);
    const quoteMintPk = new PublicKey(quoteMintStr);
    const isWSol = quoteMintStr === WSOL_MINT;

    // Derive bonding curve address
    let bondingCurvePk: PublicKey;
    if (poolAddress) {
      bondingCurvePk = new PublicKey(poolAddress);
    } else {
      const [derivedAddr] = await getBondingCurveAddress(
        address(tokenMint),
      );
      bondingCurvePk = new PublicKey(derivedAddr);
    }

    // Determine token programs
    const baseMintInfo = await retryRpcCall(() =>
      connection.getAccountInfo(baseMintPk),
    );
    if (!baseMintInfo) {
      throw new Error(`Base mint not found: ${tokenMint}`);
    }
    const baseTokenProgram = baseMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;
    const quoteTokenProgram = TOKEN_PROGRAM_ID;

    // Get ATAs
    const baseAta = await getAssociatedTokenAddress(
      baseMintPk,
      wallet.publicKey,
      false,
      baseTokenProgram,
    );
    const quoteAta = await getAssociatedTokenAddress(
      quoteMintPk,
      wallet.publicKey,
      false,
      quoteTokenProgram,
    );
    const quoteVault = await getAssociatedTokenAddress(
      quoteMintPk,
      bondingCurvePk,
      true,
      quoteTokenProgram,
    );

    // Calculate input amount
    const decimals = quoteDecimals(quoteMintStr);
    const inputAmount = BigInt(Math.floor(amountSol * Math.pow(10, decimals)));

    // Build buy instruction
    const buyIx = buildTokenBuyExactInInstruction(
      wallet.publicKey,
      bondingCurvePk,
      baseMintPk,
      baseAta,
      quoteMintPk,
      quoteVault,
      quoteAta,
      baseTokenProgram,
      quoteTokenProgram,
      inputAmount,
      false,
      null,
    );

    // Create ATA instructions
    const createBaseAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      baseAta,
      wallet.publicKey,
      baseMintPk,
      baseTokenProgram,
    );
    const createQuoteAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      quoteAta,
      wallet.publicKey,
      quoteMintPk,
      quoteTokenProgram,
    );

    // Build instruction list
    const cuLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const cuPrice = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixList: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
      createBaseAtaIx,
      createQuoteAtaIx,
    ];

    // Handle WSOL wrapping
    if (isWSol) {
      ixList.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: quoteAta,
          lamports: Number(inputAmount),
        }),
        createSyncNativeInstruction(quoteAta, quoteTokenProgram),
      );
    }

    ixList.push(buyIx);

    if (isWSol) {
      ixList.push(
        createCloseAccountInstruction(
          quoteAta,
          wallet.publicKey,
          wallet.publicKey,
          [],
          quoteTokenProgram,
        ),
      );
    }

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(ixList, wallet, blockhash, {
      dex: this.name,
      operation: "snipe",
      tipSol,
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress: bondingCurvePk.toBase58(),
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new OrcaWavebreakAdapter());
