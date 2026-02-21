/**
 * PumpFun Bonding Curve — IDexAdapter Implementation
 *
 * Program ID: 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
 *
 * Wraps the PumpFun bonding curve program for:
 *   - buy:  Buy tokens from a bonding curve (SOL → token)
 *   - sell: Sell tokens back to a bonding curve (token → SOL)
 *   - create: Create a new token + bonding curve
 *   - getPrice: Read on-chain bonding curve reserves to compute price
 *   - snipe: Competitive buy via landing layer (for future gRPC integration)
 *
 * All pump.fun tokens are 6 decimals. The bonding curve uses a Uniswap V2
 * constant product formula with virtual reserves:
 *   tokens_out = (virtual_token_reserves * sol_in) / (virtual_sol_reserves + sol_in)
 *   sol_out    = (virtual_sol_reserves * tokens_in) / (virtual_token_reserves + tokens_in)
 *   fee: 1% (100 bps) deducted from SOL
 *
 * IDL source: https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump.json
 */

import BN from "bn.js";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
} from "@solana/spl-token";

import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";
import { sendAndConfirmVtx } from "../transactions/send-rpc";

import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SnipeParams,
  SwapResult,
  TxResult,
  PriceInfo,
  BuildSwapIxsResult,
  PoolNotFoundError,
  WSOL_MINT,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./types";

import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Program constants
// ---------------------------------------------------------------------------

const PUMP_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_GLOBAL = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
const METAPLEX_TOKEN_METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const PUMP_FEE_PROGRAM = new PublicKey("pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ");

// Fee recipients — randomly pick one per TX to improve throughput
// (1 from Global.fee_recipient + 7 from Global.fee_recipients)
const PUMP_FEE_RECIPIENTS = [
  new PublicKey("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV"),
  new PublicKey("7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ"),
  new PublicKey("7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX"),
  new PublicKey("9rPYyANsfQZw3DnDmKE3YCQF5E8oD89UXoHn9JFEhJUz"),
  new PublicKey("AVmoTthdrX6tKt4nDjco2D775W2YK3sDhxPcMmzUAmTY"),
  new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"),
  new PublicKey("FWsW1xNtWscwNmKv6wVsU1iTzRN6wmmk3MjxRP5tT7hz"),
  new PublicKey("G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP"),
];

// Instruction discriminators (from IDL)
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
const CREATE_DISCRIMINATOR = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);

// BondingCurve account discriminator — used for deserialization
const BONDING_CURVE_DISCRIMINATOR = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);

// All pump.fun tokens are 6 decimals
const PUMP_TOKEN_DECIMALS = 6;

// ---------------------------------------------------------------------------
// Account layout: BondingCurve deserialization
// ---------------------------------------------------------------------------

interface BondingCurveState {
  virtualTokenReserves: bigint;
  virtualSolReserves: bigint;
  realTokenReserves: bigint;
  realSolReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
  creator: PublicKey;
}

function deserializeBondingCurve(data: Buffer): BondingCurveState {
  // 8-byte discriminator + fields
  let offset = 8;
  const virtualTokenReserves = data.readBigUInt64LE(offset); offset += 8;
  const virtualSolReserves = data.readBigUInt64LE(offset); offset += 8;
  const realTokenReserves = data.readBigUInt64LE(offset); offset += 8;
  const realSolReserves = data.readBigUInt64LE(offset); offset += 8;
  const tokenTotalSupply = data.readBigUInt64LE(offset); offset += 8;
  const complete = data.readUInt8(offset) !== 0; offset += 1;
  const creator = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;

  return {
    virtualTokenReserves,
    virtualSolReserves,
    realTokenReserves,
    realSolReserves,
    tokenTotalSupply,
    complete,
    creator,
  };
}

// ---------------------------------------------------------------------------
// PDA derivation helpers
// ---------------------------------------------------------------------------

function getBondingCurvePda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PUMP_PROGRAM_ID,
  );
  return pda;
}

function getMintAuthorityPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
    PUMP_PROGRAM_ID,
  );
  return pda;
}

function getEventAuthorityPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    PUMP_PROGRAM_ID,
  );
  return pda;
}

function getMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_TOKEN_METADATA_PROGRAM.toBuffer(),
      mint.toBuffer(),
    ],
    METAPLEX_TOKEN_METADATA_PROGRAM,
  );
  return pda;
}

function getCreatorVaultPda(creator: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator-vault"), creator.toBuffer()],
    PUMP_PROGRAM_ID,
  );
  return pda;
}

function getGlobalVolumeAccumulatorPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_volume_accumulator")],
    PUMP_PROGRAM_ID,
  );
  return pda;
}

function getUserVolumeAccumulatorPda(user: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_volume_accumulator"), user.toBuffer()],
    PUMP_PROGRAM_ID,
  );
  return pda;
}

function getFeeConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_config"), PUMP_PROGRAM_ID.toBuffer()],
    PUMP_FEE_PROGRAM,
  );
  return pda;
}

/** Pick a random fee recipient to improve program throughput */
function randomFeeRecipient(): PublicKey {
  return PUMP_FEE_RECIPIENTS[Math.floor(Math.random() * PUMP_FEE_RECIPIENTS.length)];
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

/**
 * Build a PumpFun bonding curve BUY instruction.
 *
 * buy(amount, max_sol_cost, track_volume)
 * - amount: exact number of tokens to buy (in raw 6-decimal units)
 * - max_sol_cost: maximum lamports to spend (set to u64::MAX for no slippage)
 * - track_volume: OptionBool (we pass None = [0])
 */
function buildBuyInstruction(
  user: PublicKey,
  mint: PublicKey,
  bondingCurve: PublicKey,
  creator: PublicKey,
  amount: BN,
  maxSolCost: BN,
): TransactionInstruction {
  const associatedBondingCurve = getAssociatedTokenAddressSync(
    mint, bondingCurve, true, TOKEN_PROGRAM_ID,
  );
  const associatedUser = getAssociatedTokenAddressSync(
    mint, user, false, TOKEN_PROGRAM_ID,
  );
  const creatorVault = getCreatorVaultPda(creator);
  const eventAuthority = getEventAuthorityPda();
  const globalVolumeAccumulator = getGlobalVolumeAccumulatorPda();
  const userVolumeAccumulator = getUserVolumeAccumulatorPda(user);
  const feeConfig = getFeeConfigPda();

  // Encode args: amount (u64) + max_sol_cost (u64) + track_volume (OptionBool = None [0])
  const data = Buffer.alloc(8 + 8 + 8 + 1);
  BUY_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(BigInt(amount.toString()), 8);
  data.writeBigUInt64LE(BigInt(maxSolCost.toString()), 16);
  // OptionBool None = 0 (no volume tracking)
  data.writeUInt8(0, 24);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: PUMP_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: randomFeeRecipient(), isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: globalVolumeAccumulator, isSigner: false, isWritable: false },
      { pubkey: userVolumeAccumulator, isSigner: false, isWritable: true },
      { pubkey: feeConfig, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_PROGRAM, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build a PumpFun bonding curve SELL instruction.
 *
 * sell(amount, min_sol_output)
 * - amount: exact number of tokens to sell (in raw 6-decimal units)
 * - min_sol_output: minimum lamports to receive (set to 0 for no slippage)
 */
function buildSellInstruction(
  user: PublicKey,
  mint: PublicKey,
  bondingCurve: PublicKey,
  creator: PublicKey,
  amount: BN,
  minSolOutput: BN,
): TransactionInstruction {
  const associatedBondingCurve = getAssociatedTokenAddressSync(
    mint, bondingCurve, true, TOKEN_PROGRAM_ID,
  );
  const associatedUser = getAssociatedTokenAddressSync(
    mint, user, false, TOKEN_PROGRAM_ID,
  );
  const creatorVault = getCreatorVaultPda(creator);
  const eventAuthority = getEventAuthorityPda();
  const feeConfig = getFeeConfigPda();

  // Encode args: amount (u64) + min_sol_output (u64)
  const data = Buffer.alloc(8 + 8 + 8);
  SELL_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(BigInt(amount.toString()), 8);
  data.writeBigUInt64LE(BigInt(minSolOutput.toString()), 16);

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: PUMP_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: randomFeeRecipient(), isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: feeConfig, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_PROGRAM, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build a PumpFun CREATE instruction — creates a new token + bonding curve.
 *
 * create(name, symbol, uri, creator)
 */
function buildCreateInstruction(
  user: PublicKey,
  mint: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  creator: PublicKey,
): TransactionInstruction {
  const bondingCurve = getBondingCurvePda(mint);
  const associatedBondingCurve = getAssociatedTokenAddressSync(
    mint, bondingCurve, true, TOKEN_PROGRAM_ID,
  );
  const mintAuthority = getMintAuthorityPda();
  const metadata = getMetadataPda(mint);
  const eventAuthority = getEventAuthorityPda();

  // Encode args: name (string) + symbol (string) + uri (string) + creator (pubkey)
  // Borsh string encoding: 4-byte LE length + utf8 bytes
  const nameBytes = Buffer.from(name, "utf8");
  const symbolBytes = Buffer.from(symbol, "utf8");
  const uriBytes = Buffer.from(uri, "utf8");
  const creatorBytes = creator.toBuffer();

  const dataSize = 8 + (4 + nameBytes.length) + (4 + symbolBytes.length) + (4 + uriBytes.length) + 32;
  const data = Buffer.alloc(dataSize);
  let offset = 0;

  CREATE_DISCRIMINATOR.copy(data, offset); offset += 8;

  data.writeUInt32LE(nameBytes.length, offset); offset += 4;
  nameBytes.copy(data, offset); offset += nameBytes.length;

  data.writeUInt32LE(symbolBytes.length, offset); offset += 4;
  symbolBytes.copy(data, offset); offset += symbolBytes.length;

  data.writeUInt32LE(uriBytes.length, offset); offset += 4;
  uriBytes.copy(data, offset); offset += uriBytes.length;

  creatorBytes.copy(data, offset); offset += 32;

  return new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: mint, isSigner: true, isWritable: true },
      { pubkey: mintAuthority, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: PUMP_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: METAPLEX_TOKEN_METADATA_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ---------------------------------------------------------------------------
// Bonding curve math
// ---------------------------------------------------------------------------

/**
 * Calculate how many tokens you get for a given SOL input (after fee).
 * Formula: tokens_out = (virtual_token_reserves * net_sol_in) / (virtual_sol_reserves + net_sol_in)
 * Fee: 1% deducted from SOL before swap.
 */
function calculateBuyTokens(
  state: BondingCurveState,
  solLamports: bigint,
): bigint {
  // Fee is 1% (100 bps), deducted from SOL input
  const fee = solLamports / 100n;
  const netSol = solLamports - fee;
  const tokensOut = (state.virtualTokenReserves * netSol) / (state.virtualSolReserves + netSol);
  // Cap at real token reserves
  return tokensOut < state.realTokenReserves ? tokensOut : state.realTokenReserves;
}

/**
 * Calculate how much SOL you get for selling tokens (before fee).
 * Formula: sol_out = (virtual_sol_reserves * tokens_in) / (virtual_token_reserves + tokens_in)
 * Fee: 1% deducted from SOL output.
 */
function calculateSellSol(
  state: BondingCurveState,
  tokenAmount: bigint,
): bigint {
  const grossSol = (state.virtualSolReserves * tokenAmount) / (state.virtualTokenReserves + tokenAmount);
  const fee = grossSol / 100n;
  return grossSol - fee;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PumpFunAdapter implements IDexAdapter {
  readonly name = "pumpfun";
  readonly protocol = "bonding-curve";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    canSnipe: true,
    canGetPrice: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const mintPk = new PublicKey(tokenMint);
    const bondingCurve = poolAddress ? new PublicKey(poolAddress) : getBondingCurvePda(mintPk);

    // Fetch bonding curve state to calculate token amount and get creator
    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (!accountInfo) throw new Error(`Bonding curve not found: ${bondingCurve.toBase58()}`);
    const state = deserializeBondingCurve(accountInfo.data as Buffer);
    if (state.complete) throw new Error("Bonding curve is complete — use pumpfun-amm for graduated tokens");

    const solLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
    const tokenAmount = calculateBuyTokens(state, solLamports);
    if (tokenAmount === 0n) throw new Error("Buy amount too small — would receive 0 tokens");

    // Build instructions
    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const createAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      getAssociatedTokenAddressSync(mintPk, wallet.publicKey, false, TOKEN_PROGRAM_ID),
      wallet.publicKey,
      mintPk,
      TOKEN_PROGRAM_ID,
    );

    const buyIx = buildBuyInstruction(
      wallet.publicKey,
      mintPk,
      bondingCurve,
      state.creator,
      new BN(tokenAmount.toString()),
      new BN(solLamports.toString()), // max_sol_cost = full amount (no extra slippage)
    );

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAta,
      buyIx,
    ];

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: amountSol,
      amountInToken: "SOL",
      amountOut: Number(tokenAmount) / Math.pow(10, PUMP_TOKEN_DECIMALS),
      amountOutToken: tokenMint,
      dex: this.name,
      poolAddress: bondingCurve.toBase58(),
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const { tokenMint, percentage, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const mintPk = new PublicKey(tokenMint);
    const bondingCurve = poolAddress ? new PublicKey(poolAddress) : getBondingCurvePda(mintPk);

    // Fetch bonding curve state for creator
    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (!accountInfo) throw new Error(`Bonding curve not found: ${bondingCurve.toBase58()}`);
    const state = deserializeBondingCurve(accountInfo.data as Buffer);
    if (state.complete) throw new Error("Bonding curve is complete — use pumpfun-amm for graduated tokens");

    // Get token balance
    const ata = getAssociatedTokenAddressSync(mintPk, wallet.publicKey, false, TOKEN_PROGRAM_ID);
    const tokenAccount = await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM_ID);
    const sellAmount = BigInt(Math.floor((Number(tokenAccount.amount) * percentage) / 100));
    if (sellAmount === 0n) throw new Error(`No balance to sell for ${tokenMint}`);

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const sellIx = buildSellInstruction(
      wallet.publicKey,
      mintPk,
      bondingCurve,
      state.creator,
      new BN(sellAmount.toString()),
      new BN(0), // min_sol_output = 0 (no slippage protection)
    );

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      sellIx,
    ];

    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    const humanSellAmount = Number(sellAmount) / Math.pow(10, PUMP_TOKEN_DECIMALS);
    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: humanSellAmount,
      amountInToken: tokenMint,
      dex: this.name,
      poolAddress: bondingCurve.toBase58(),
    };
  }

  // ----- Snipe -----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const mintPk = new PublicKey(tokenMint);
    const bondingCurve = new PublicKey(poolAddress);

    // Fetch bonding curve state
    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (!accountInfo) throw new Error(`Bonding curve not found: ${poolAddress}`);
    const state = deserializeBondingCurve(accountInfo.data as Buffer);

    const solLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
    const tokenAmount = calculateBuyTokens(state, solLamports);

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? 40_000_000;

    const createAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      getAssociatedTokenAddressSync(mintPk, wallet.publicKey, false, TOKEN_PROGRAM_ID),
      wallet.publicKey,
      mintPk,
      TOKEN_PROGRAM_ID,
    );

    const buyIx = buildBuyInstruction(
      wallet.publicKey,
      mintPk,
      bondingCurve,
      state.creator,
      new BN(tokenAmount.toString()),
      new BN(solLamports.toString()),
    );

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAta,
      buyIx,
    ];

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "snipe",
      tipSol,
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted?.accepted,
      amountIn: amountSol,
      amountInToken: "SOL",
      dex: this.name,
      poolAddress,
    };
  }

  // ----- buildSwapIxs -----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    const connection = getConnection();
    const wallet = getWallet();

    if ("percentage" in params) {
      // Sell
      const p = params as SellParams;
      const mintPk = new PublicKey(p.tokenMint);
      const bondingCurve = p.poolAddress ? new PublicKey(p.poolAddress) : getBondingCurvePda(mintPk);

      const accountInfo = await connection.getAccountInfo(bondingCurve);
      if (!accountInfo) throw new Error(`Bonding curve not found`);
      const state = deserializeBondingCurve(accountInfo.data as Buffer);

      const ata = getAssociatedTokenAddressSync(mintPk, wallet.publicKey, false, TOKEN_PROGRAM_ID);
      const tokenAccount = await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM_ID);
      const sellAmount = BigInt(Math.floor((Number(tokenAccount.amount) * p.percentage) / 100));

      const sellIx = buildSellInstruction(
        wallet.publicKey, mintPk, bondingCurve, state.creator,
        new BN(sellAmount.toString()), new BN(0),
      );

      return { instructions: [sellIx], signers: [] };
    }

    // Buy
    const p = params as BuyParams;
    const mintPk = new PublicKey(p.tokenMint);
    const bondingCurve = p.poolAddress ? new PublicKey(p.poolAddress) : getBondingCurvePda(mintPk);

    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (!accountInfo) throw new Error(`Bonding curve not found`);
    const state = deserializeBondingCurve(accountInfo.data as Buffer);

    const solLamports = BigInt(Math.floor(p.amountSol * LAMPORTS_PER_SOL));
    const tokenAmount = calculateBuyTokens(state, solLamports);

    const createAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      getAssociatedTokenAddressSync(mintPk, wallet.publicKey, false, TOKEN_PROGRAM_ID),
      wallet.publicKey,
      mintPk,
      TOKEN_PROGRAM_ID,
    );

    const buyIx = buildBuyInstruction(
      wallet.publicKey, mintPk, bondingCurve, state.creator,
      new BN(tokenAmount.toString()), new BN(solLamports.toString()),
    );

    return { instructions: [createAta, buyIx], signers: [] };
  }

  // ----- getPrice -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const bondingCurvePk = new PublicKey(poolAddress);

    const accountInfo = await connection.getAccountInfo(bondingCurvePk);
    if (!accountInfo) throw new Error(`Bonding curve not found: ${poolAddress}`);
    const state = deserializeBondingCurve(accountInfo.data as Buffer);

    // Price in SOL per token = virtual_sol_reserves / virtual_token_reserves
    // Adjust for decimals: SOL is 9 decimals, token is 6 decimals
    const price =
      (Number(state.virtualSolReserves) / LAMPORTS_PER_SOL) /
      (Number(state.virtualTokenReserves) / Math.pow(10, PUMP_TOKEN_DECIMALS));

    // Derive mint from bonding curve PDA (not directly available from state).
    // The caller should know the mint — we return baseMint as empty here.
    // In practice, getPrice is called with the pool address and the caller has the mint.
    return {
      price,
      baseMint: "", // Caller should know the mint
      quoteMint: WSOL_MINT,
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }

  // ----- Create token + bonding curve -----

  /**
   * Create a new PumpFun token with a bonding curve.
   *
   * @param name    Token name (e.g. "My Token")
   * @param symbol  Token symbol (e.g. "MYTOKEN")
   * @param uri     Metadata URI (e.g. IPFS link to JSON metadata)
   * @returns TxResult with the mint address in positionAddress
   */
  async create(
    name: string,
    symbol: string,
    uri: string,
  ): Promise<TxResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const mintKeypair = Keypair.generate();

    const computeLimit = DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const createIx = buildCreateInstruction(
      wallet.publicKey,
      mintKeypair.publicKey,
      name,
      symbol,
      uri,
      wallet.publicKey, // creator = wallet
    );

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createIx,
    ];

    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      extraSigners: [mintKeypair],
    });

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      positionAddress: mintKeypair.publicKey.toBase58(), // The new mint address
      poolAddress: getBondingCurvePda(mintKeypair.publicKey).toBase58(),
      dex: this.name,
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new PumpFunAdapter());
