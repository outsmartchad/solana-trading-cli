/**
 * PumpFun AMM (PumpSwap) — IDexAdapter Implementation
 *
 * Program ID: pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA
 *
 * A constant-product AMM that tokens graduate to after their bonding curve
 * completes on pump.fun. Also supports user-created pools.
 *
 * Supports:
 *   - buy:  Buy base tokens from a pool (SOL → token)
 *   - sell: Sell base tokens to a pool (token → SOL)
 *   - createPool: Create a new AMM pool with initial liquidity
 *   - getPrice: Read pool reserves to compute price
 *   - snipe: Competitive buy via landing layer
 *
 * Pool PDA: ["pool", index(u16 LE), creator, baseMint, quoteMint]
 * LP Mint PDA: ["pool_lp_mint", pool]
 *
 * Fees: LP fee 20 bps + protocol fee 5 bps = 25 bps total.
 * Protocol fee recipients (8) should be randomly selected per TX.
 *
 * IDL source: https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump_amm.json
 */

import BN from "bn.js";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  Keypair,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
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

const PUMP_AMM_PROGRAM_ID = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const PUMP_AMM_GLOBAL_CONFIG = new PublicKey("ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw");
const PUMP_FEE_PROGRAM = new PublicKey("pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ");
const PUMP_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

// Protocol fee recipients — randomly pick one per TX
const PROTOCOL_FEE_RECIPIENTS = [
  new PublicKey("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV"),
  new PublicKey("7VtfL8fvgNfhz17qKRMjzQEXgbdpnHHHQRh54R9jP2RJ"),
  new PublicKey("7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX"),
  new PublicKey("9rPYyANsfQZw3DnDmKE3YCQF5E8oD89UXoHn9JFEhJUz"),
  new PublicKey("AVmoTthdrX6tKt4nDjco2D775W2YK3sDhxPcMmzUAmTY"),
  new PublicKey("FWsW1xNtWscwNmKv6wVsU1iTzRN6wmmk3MjxRP5tT7hz"),
  new PublicKey("G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP"),
  new PublicKey("JCRGumoE9Qi5BBgULTgdgTLjSgkCMSbF62ZZfGs84JeU"),
];

// Instruction discriminators (from IDL)
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
const CREATE_POOL_DISCRIMINATOR = Buffer.from([233, 146, 209, 142, 207, 104, 64, 188]);

// Pool account discriminator
const POOL_DISCRIMINATOR = Buffer.from([241, 154, 109, 4, 17, 177, 109, 188]);

// All pump.fun tokens are 6 decimals. Quote (WSOL) is 9.
const PUMP_TOKEN_DECIMALS = 6;

// ---------------------------------------------------------------------------
// Pool state deserialization
// ---------------------------------------------------------------------------

interface PoolState {
  poolBump: number;
  index: number;
  creator: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  lpMint: PublicKey;
  poolBaseTokenAccount: PublicKey;
  poolQuoteTokenAccount: PublicKey;
  lpSupply: bigint;
  coinCreator: PublicKey;
}

function deserializePool(data: Buffer): PoolState {
  let offset = 8; // skip discriminator
  const poolBump = data.readUInt8(offset); offset += 1;
  const index = data.readUInt16LE(offset); offset += 2;
  const creator = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const baseMint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const quoteMint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const lpMint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const poolBaseTokenAccount = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const poolQuoteTokenAccount = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const lpSupply = data.readBigUInt64LE(offset); offset += 8;
  const coinCreator = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;

  return {
    poolBump, index, creator, baseMint, quoteMint, lpMint,
    poolBaseTokenAccount, poolQuoteTokenAccount, lpSupply, coinCreator,
  };
}

// ---------------------------------------------------------------------------
// PDA derivation helpers
// ---------------------------------------------------------------------------

function getEventAuthorityPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    PUMP_AMM_PROGRAM_ID,
  );
  return pda;
}

function getCreatorVaultAuthorityPda(coinCreator: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator_vault"), coinCreator.toBuffer()],
    PUMP_AMM_PROGRAM_ID,
  );
  return pda;
}

function getGlobalVolumeAccumulatorPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_volume_accumulator")],
    PUMP_AMM_PROGRAM_ID,
  );
  return pda;
}

function getUserVolumeAccumulatorPda(user: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_volume_accumulator"), user.toBuffer()],
    PUMP_AMM_PROGRAM_ID,
  );
  return pda;
}

function getFeeConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_config"), PUMP_AMM_PROGRAM_ID.toBuffer()],
    PUMP_FEE_PROGRAM,
  );
  return pda;
}

function getPoolPda(
  index: number,
  creator: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
): PublicKey {
  const indexBuf = Buffer.alloc(2);
  indexBuf.writeUInt16LE(index);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), indexBuf, creator.toBuffer(), baseMint.toBuffer(), quoteMint.toBuffer()],
    PUMP_AMM_PROGRAM_ID,
  );
  return pda;
}

function getLpMintPda(pool: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_lp_mint"), pool.toBuffer()],
    PUMP_AMM_PROGRAM_ID,
  );
  return pda;
}

/** Pick a random protocol fee recipient */
function randomProtocolFeeRecipient(): PublicKey {
  return PROTOCOL_FEE_RECIPIENTS[Math.floor(Math.random() * PROTOCOL_FEE_RECIPIENTS.length)];
}

/** Detect token program from on-chain account owner */
async function detectTokenProgram(mint: PublicKey): Promise<PublicKey> {
  const connection = getConnection();
  const accountInfo = await connection.getAccountInfo(mint);
  if (!accountInfo) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  return accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

/**
 * Build a PumpSwap AMM BUY instruction.
 *
 * buy(base_amount_out, max_quote_amount_in, track_volume)
 */
function buildBuyInstruction(
  pool: PublicKey,
  poolState: PoolState,
  user: PublicKey,
  baseAmountOut: BN,
  maxQuoteAmountIn: BN,
  baseTokenProgram: PublicKey,
  quoteTokenProgram: PublicKey,
): TransactionInstruction {
  const userBaseTokenAccount = getAssociatedTokenAddressSync(
    poolState.baseMint, user, false, baseTokenProgram,
  );
  const userQuoteTokenAccount = getAssociatedTokenAddressSync(
    poolState.quoteMint, user, false, quoteTokenProgram,
  );
  const protocolFeeRecipient = randomProtocolFeeRecipient();
  const protocolFeeRecipientTokenAccount = getAssociatedTokenAddressSync(
    poolState.quoteMint, protocolFeeRecipient, true, quoteTokenProgram,
  );
  const coinCreatorVaultAuthority = getCreatorVaultAuthorityPda(poolState.coinCreator);
  const coinCreatorVaultAta = getAssociatedTokenAddressSync(
    poolState.quoteMint, coinCreatorVaultAuthority, true, quoteTokenProgram,
  );
  const eventAuthority = getEventAuthorityPda();
  const globalVolumeAccumulator = getGlobalVolumeAccumulatorPda();
  const userVolumeAccumulator = getUserVolumeAccumulatorPda(user);
  const feeConfig = getFeeConfigPda();

  // Encode args: base_amount_out (u64) + max_quote_amount_in (u64) + track_volume (OptionBool None [0])
  const data = Buffer.alloc(8 + 8 + 8 + 1);
  BUY_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(BigInt(baseAmountOut.toString()), 8);
  data.writeBigUInt64LE(BigInt(maxQuoteAmountIn.toString()), 16);
  data.writeUInt8(0, 24); // OptionBool None

  return new TransactionInstruction({
    programId: PUMP_AMM_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: PUMP_AMM_GLOBAL_CONFIG, isSigner: false, isWritable: false },
      { pubkey: poolState.baseMint, isSigner: false, isWritable: false },
      { pubkey: poolState.quoteMint, isSigner: false, isWritable: false },
      { pubkey: userBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolState.poolBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolState.poolQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: protocolFeeRecipient, isSigner: false, isWritable: false },
      { pubkey: protocolFeeRecipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: baseTokenProgram, isSigner: false, isWritable: false },
      { pubkey: quoteTokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_AMM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: coinCreatorVaultAta, isSigner: false, isWritable: true },
      { pubkey: coinCreatorVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: globalVolumeAccumulator, isSigner: false, isWritable: false },
      { pubkey: userVolumeAccumulator, isSigner: false, isWritable: true },
      { pubkey: feeConfig, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_PROGRAM, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build a PumpSwap AMM SELL instruction.
 *
 * sell(base_amount_in, min_quote_amount_out)
 */
function buildSellInstruction(
  pool: PublicKey,
  poolState: PoolState,
  user: PublicKey,
  baseAmountIn: BN,
  minQuoteAmountOut: BN,
  baseTokenProgram: PublicKey,
  quoteTokenProgram: PublicKey,
): TransactionInstruction {
  const userBaseTokenAccount = getAssociatedTokenAddressSync(
    poolState.baseMint, user, false, baseTokenProgram,
  );
  const userQuoteTokenAccount = getAssociatedTokenAddressSync(
    poolState.quoteMint, user, false, quoteTokenProgram,
  );
  const protocolFeeRecipient = randomProtocolFeeRecipient();
  const protocolFeeRecipientTokenAccount = getAssociatedTokenAddressSync(
    poolState.quoteMint, protocolFeeRecipient, true, quoteTokenProgram,
  );
  const coinCreatorVaultAuthority = getCreatorVaultAuthorityPda(poolState.coinCreator);
  const coinCreatorVaultAta = getAssociatedTokenAddressSync(
    poolState.quoteMint, coinCreatorVaultAuthority, true, quoteTokenProgram,
  );
  const eventAuthority = getEventAuthorityPda();
  const feeConfig = getFeeConfigPda();

  // Encode args: base_amount_in (u64) + min_quote_amount_out (u64)
  const data = Buffer.alloc(8 + 8 + 8);
  SELL_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(BigInt(baseAmountIn.toString()), 8);
  data.writeBigUInt64LE(BigInt(minQuoteAmountOut.toString()), 16);

  return new TransactionInstruction({
    programId: PUMP_AMM_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: PUMP_AMM_GLOBAL_CONFIG, isSigner: false, isWritable: false },
      { pubkey: poolState.baseMint, isSigner: false, isWritable: false },
      { pubkey: poolState.quoteMint, isSigner: false, isWritable: false },
      { pubkey: userBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolState.poolBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolState.poolQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: protocolFeeRecipient, isSigner: false, isWritable: false },
      { pubkey: protocolFeeRecipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: baseTokenProgram, isSigner: false, isWritable: false },
      { pubkey: quoteTokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_AMM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: coinCreatorVaultAta, isSigner: false, isWritable: true },
      { pubkey: coinCreatorVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: feeConfig, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_PROGRAM, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build a PumpSwap AMM CREATE_POOL instruction.
 *
 * create_pool(index, base_amount_in, quote_amount_in, coin_creator, is_mayhem_mode, is_cashback_coin)
 */
function buildCreatePoolInstruction(
  creator: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  index: number,
  baseAmountIn: BN,
  quoteAmountIn: BN,
  coinCreator: PublicKey,
  baseTokenProgram: PublicKey,
  quoteTokenProgram: PublicKey,
): TransactionInstruction {
  const pool = getPoolPda(index, creator, baseMint, quoteMint);
  const lpMint = getLpMintPda(pool);

  const userBaseTokenAccount = getAssociatedTokenAddressSync(
    baseMint, creator, false, baseTokenProgram,
  );
  const userQuoteTokenAccount = getAssociatedTokenAddressSync(
    quoteMint, creator, false, quoteTokenProgram,
  );
  // LP mint uses Token-2022
  const userPoolTokenAccount = getAssociatedTokenAddressSync(
    lpMint, creator, false, TOKEN_2022_PROGRAM_ID,
  );
  const poolBaseTokenAccount = getAssociatedTokenAddressSync(
    baseMint, pool, true, baseTokenProgram,
  );
  const poolQuoteTokenAccount = getAssociatedTokenAddressSync(
    quoteMint, pool, true, quoteTokenProgram,
  );
  const eventAuthority = getEventAuthorityPda();

  // Encode args:
  //   index: u16
  //   base_amount_in: u64
  //   quote_amount_in: u64
  //   coin_creator: pubkey (32 bytes)
  //   is_mayhem_mode: bool (1 byte)
  //   is_cashback_coin: OptionBool (1 byte, None = 0)
  const data = Buffer.alloc(8 + 2 + 8 + 8 + 32 + 1 + 1);
  let offset = 0;
  CREATE_POOL_DISCRIMINATOR.copy(data, offset); offset += 8;
  data.writeUInt16LE(index, offset); offset += 2;
  data.writeBigUInt64LE(BigInt(baseAmountIn.toString()), offset); offset += 8;
  data.writeBigUInt64LE(BigInt(quoteAmountIn.toString()), offset); offset += 8;
  coinCreator.toBuffer().copy(data, offset); offset += 32;
  data.writeUInt8(0, offset); offset += 1; // is_mayhem_mode = false
  data.writeUInt8(0, offset); offset += 1; // is_cashback_coin = None

  return new TransactionInstruction({
    programId: PUMP_AMM_PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: PUMP_AMM_GLOBAL_CONFIG, isSigner: false, isWritable: false },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: quoteMint, isSigner: false, isWritable: false },
      { pubkey: lpMint, isSigner: false, isWritable: true },
      { pubkey: userBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userPoolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: baseTokenProgram, isSigner: false, isWritable: false },
      { pubkey: quoteTokenProgram, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_AMM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ---------------------------------------------------------------------------
// AMM math (constant product)
// ---------------------------------------------------------------------------

/**
 * Calculate base tokens out for a given quote input on AMM.
 * Constant product: base_out = (base_reserves * quote_in) / (quote_reserves + quote_in)
 * Fees: LP fee 20 bps + protocol fee 5 bps = 25 bps total.
 * Fee is deducted from quote input before the swap.
 */
function calculateBuyBaseOut(
  baseReserves: bigint,
  quoteReserves: bigint,
  quoteAmountIn: bigint,
): bigint {
  // Total fee: 25 bps (0.25%)
  const feeNumerator = 25n;
  const feeDenominator = 10000n;
  const fee = (quoteAmountIn * feeNumerator) / feeDenominator;
  const netQuote = quoteAmountIn - fee;
  return (baseReserves * netQuote) / (quoteReserves + netQuote);
}

/**
 * Calculate quote output for a given base input on AMM.
 */
function calculateSellQuoteOut(
  baseReserves: bigint,
  quoteReserves: bigint,
  baseAmountIn: bigint,
): bigint {
  const grossQuote = (quoteReserves * baseAmountIn) / (baseReserves + baseAmountIn);
  // Total fee: 25 bps deducted from quote output
  const feeNumerator = 25n;
  const feeDenominator = 10000n;
  const fee = (grossQuote * feeNumerator) / feeDenominator;
  return grossQuote - fee;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PumpFunAmmAdapter implements IDexAdapter {
  readonly name = "pumpfun-amm";
  readonly protocol = "pump-amm";
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

    if (!poolAddress) throw new PoolNotFoundError(this.name, tokenMint, WSOL_MINT);
    const poolPk = new PublicKey(poolAddress);

    // Fetch pool state
    const accountInfo = await connection.getAccountInfo(poolPk);
    if (!accountInfo) throw new Error(`Pool not found: ${poolAddress}`);
    const poolState = deserializePool(accountInfo.data as Buffer);

    // Detect token programs
    const baseTokenProgram = await detectTokenProgram(poolState.baseMint);
    const quoteTokenProgram = poolState.quoteMint.toBase58() === WSOL_MINT
      ? TOKEN_PROGRAM_ID
      : await detectTokenProgram(poolState.quoteMint);

    // Read pool reserves
    const [baseBalance, quoteBalance] = await Promise.all([
      connection.getTokenAccountBalance(poolState.poolBaseTokenAccount),
      connection.getTokenAccountBalance(poolState.poolQuoteTokenAccount),
    ]);
    const baseReserves = BigInt(baseBalance.value.amount);
    const quoteReserves = BigInt(quoteBalance.value.amount);

    const quoteAmountIn = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
    const baseAmountOut = calculateBuyBaseOut(baseReserves, quoteReserves, quoteAmountIn);
    if (baseAmountOut === 0n) throw new Error("Buy amount too small — would receive 0 tokens");

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    // Ensure user has ATAs for both base and quote tokens
    const userBaseAta = getAssociatedTokenAddressSync(
      poolState.baseMint, wallet.publicKey, false, baseTokenProgram,
    );
    const userQuoteAta = getAssociatedTokenAddressSync(
      poolState.quoteMint, wallet.publicKey, false, quoteTokenProgram,
    );

    const createBaseAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, userBaseAta, wallet.publicKey, poolState.baseMint, baseTokenProgram,
    );
    const createQuoteAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, userQuoteAta, wallet.publicKey, poolState.quoteMint, quoteTokenProgram,
    );

    // For WSOL: need to wrap SOL into the WSOL ATA
    const wrapIxs: TransactionInstruction[] = [];
    if (poolState.quoteMint.toBase58() === WSOL_MINT) {
      wrapIxs.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: userQuoteAta,
          lamports: quoteAmountIn,
        }),
        // syncNative to update WSOL balance
        new TransactionInstruction({
          programId: TOKEN_PROGRAM_ID,
          keys: [{ pubkey: userQuoteAta, isSigner: false, isWritable: true }],
          data: Buffer.from([17]), // SyncNative instruction
        }),
      );
    }

    const buyIx = buildBuyInstruction(
      poolPk, poolState, wallet.publicKey,
      new BN(baseAmountOut.toString()),
      new BN(quoteAmountIn.toString()), // max_quote_amount_in
      baseTokenProgram,
      quoteTokenProgram,
    );

    // Close WSOL ATA after swap to recover SOL
    const closeIxs: TransactionInstruction[] = [];
    if (poolState.quoteMint.toBase58() === WSOL_MINT) {
      closeIxs.push(
        new TransactionInstruction({
          programId: TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: userQuoteAta, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          ],
          data: Buffer.from([9]), // CloseAccount instruction
        }),
      );
    }

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createBaseAta,
      createQuoteAta,
      ...wrapIxs,
      buyIx,
      ...closeIxs,
    ];

    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    const baseDecimals = baseBalance.value.decimals;
    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: amountSol,
      amountInToken: "SOL",
      amountOut: Number(baseAmountOut) / Math.pow(10, baseDecimals),
      amountOutToken: poolState.baseMint.toBase58(),
      dex: this.name,
      poolAddress,
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const { tokenMint, percentage, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();

    if (!poolAddress) throw new PoolNotFoundError(this.name, tokenMint, WSOL_MINT);
    const poolPk = new PublicKey(poolAddress);

    // Fetch pool state
    const accountInfo = await connection.getAccountInfo(poolPk);
    if (!accountInfo) throw new Error(`Pool not found: ${poolAddress}`);
    const poolState = deserializePool(accountInfo.data as Buffer);

    const baseTokenProgram = await detectTokenProgram(poolState.baseMint);
    const quoteTokenProgram = poolState.quoteMint.toBase58() === WSOL_MINT
      ? TOKEN_PROGRAM_ID
      : await detectTokenProgram(poolState.quoteMint);

    // Get user's base token balance
    const userBaseAta = getAssociatedTokenAddressSync(
      poolState.baseMint, wallet.publicKey, false, baseTokenProgram,
    );
    const tokenAccount = await getAccount(connection, userBaseAta, "confirmed", baseTokenProgram);
    const sellAmount = BigInt(Math.floor((Number(tokenAccount.amount) * percentage) / 100));
    if (sellAmount === 0n) throw new Error(`No balance to sell for ${tokenMint}`);

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    // Ensure user has quote ATA (for receiving SOL/WSOL)
    const userQuoteAta = getAssociatedTokenAddressSync(
      poolState.quoteMint, wallet.publicKey, false, quoteTokenProgram,
    );
    const createQuoteAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, userQuoteAta, wallet.publicKey, poolState.quoteMint, quoteTokenProgram,
    );

    const sellIx = buildSellInstruction(
      poolPk, poolState, wallet.publicKey,
      new BN(sellAmount.toString()),
      new BN(0), // min_quote_amount_out = 0 (no slippage protection)
      baseTokenProgram,
      quoteTokenProgram,
    );

    // Close WSOL ATA to unwrap SOL
    const closeIxs: TransactionInstruction[] = [];
    if (poolState.quoteMint.toBase58() === WSOL_MINT) {
      closeIxs.push(
        new TransactionInstruction({
          programId: TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: userQuoteAta, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: false, isWritable: true },
            { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          ],
          data: Buffer.from([9]), // CloseAccount instruction
        }),
      );
    }

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createQuoteAta,
      sellIx,
      ...closeIxs,
    ];

    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    // Human-readable sell amount
    let tokenDecimals = PUMP_TOKEN_DECIMALS;
    try {
      const mintData = await connection.getTokenSupply(poolState.baseMint);
      tokenDecimals = mintData.value.decimals;
    } catch { /* fallback to 6 */ }
    const humanSellAmount = Number(sellAmount) / Math.pow(10, tokenDecimals);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: humanSellAmount,
      amountInToken: tokenMint,
      dex: this.name,
      poolAddress,
    };
  }

  // ----- Snipe -----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const accountInfo = await connection.getAccountInfo(poolPk);
    if (!accountInfo) throw new Error(`Pool not found: ${poolAddress}`);
    const poolState = deserializePool(accountInfo.data as Buffer);

    const baseTokenProgram = await detectTokenProgram(poolState.baseMint);
    const quoteTokenProgram = poolState.quoteMint.toBase58() === WSOL_MINT
      ? TOKEN_PROGRAM_ID
      : await detectTokenProgram(poolState.quoteMint);

    // Read pool reserves
    const [baseBalance, quoteBalance] = await Promise.all([
      connection.getTokenAccountBalance(poolState.poolBaseTokenAccount),
      connection.getTokenAccountBalance(poolState.poolQuoteTokenAccount),
    ]);
    const baseReserves = BigInt(baseBalance.value.amount);
    const quoteReserves = BigInt(quoteBalance.value.amount);

    const quoteAmountIn = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
    const baseAmountOut = calculateBuyBaseOut(baseReserves, quoteReserves, quoteAmountIn);

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? 40_000_000;

    const userBaseAta = getAssociatedTokenAddressSync(
      poolState.baseMint, wallet.publicKey, false, baseTokenProgram,
    );
    const userQuoteAta = getAssociatedTokenAddressSync(
      poolState.quoteMint, wallet.publicKey, false, quoteTokenProgram,
    );

    const createBaseAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, userBaseAta, wallet.publicKey, poolState.baseMint, baseTokenProgram,
    );
    const createQuoteAta = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, userQuoteAta, wallet.publicKey, poolState.quoteMint, quoteTokenProgram,
    );

    // WSOL wrapping
    const wrapIxs: TransactionInstruction[] = [];
    if (poolState.quoteMint.toBase58() === WSOL_MINT) {
      wrapIxs.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: userQuoteAta,
          lamports: quoteAmountIn,
        }),
        new TransactionInstruction({
          programId: TOKEN_PROGRAM_ID,
          keys: [{ pubkey: userQuoteAta, isSigner: false, isWritable: true }],
          data: Buffer.from([17]), // SyncNative
        }),
      );
    }

    const buyIx = buildBuyInstruction(
      poolPk, poolState, wallet.publicKey,
      new BN(baseAmountOut.toString()),
      new BN(quoteAmountIn.toString()),
      baseTokenProgram,
      quoteTokenProgram,
    );

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createBaseAta,
      createQuoteAta,
      ...wrapIxs,
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
      const p = params as SellParams;
      if (!p.poolAddress) throw new Error("poolAddress required for pumpfun-amm buildSwapIxs");
      const poolPk = new PublicKey(p.poolAddress);
      const accountInfo = await connection.getAccountInfo(poolPk);
      if (!accountInfo) throw new Error("Pool not found");
      const poolState = deserializePool(accountInfo.data as Buffer);

      const baseTokenProgram = await detectTokenProgram(poolState.baseMint);
      const quoteTokenProgram = poolState.quoteMint.toBase58() === WSOL_MINT
        ? TOKEN_PROGRAM_ID : await detectTokenProgram(poolState.quoteMint);

      const userBaseAta = getAssociatedTokenAddressSync(
        poolState.baseMint, wallet.publicKey, false, baseTokenProgram,
      );
      const tokenAccount = await getAccount(connection, userBaseAta, "confirmed", baseTokenProgram);
      const sellAmount = BigInt(Math.floor((Number(tokenAccount.amount) * p.percentage) / 100));

      const sellIx = buildSellInstruction(
        poolPk, poolState, wallet.publicKey,
        new BN(sellAmount.toString()), new BN(0),
        baseTokenProgram, quoteTokenProgram,
      );
      return { instructions: [sellIx], signers: [] };
    }

    // Buy
    const p = params as BuyParams;
    if (!p.poolAddress) throw new Error("poolAddress required for pumpfun-amm buildSwapIxs");
    const poolPk = new PublicKey(p.poolAddress);
    const accountInfo = await connection.getAccountInfo(poolPk);
    if (!accountInfo) throw new Error("Pool not found");
    const poolState = deserializePool(accountInfo.data as Buffer);

    const baseTokenProgram = await detectTokenProgram(poolState.baseMint);
    const quoteTokenProgram = poolState.quoteMint.toBase58() === WSOL_MINT
      ? TOKEN_PROGRAM_ID : await detectTokenProgram(poolState.quoteMint);

    const [baseBalance, quoteBalance] = await Promise.all([
      connection.getTokenAccountBalance(poolState.poolBaseTokenAccount),
      connection.getTokenAccountBalance(poolState.poolQuoteTokenAccount),
    ]);
    const quoteAmountIn = BigInt(Math.floor(p.amountSol * LAMPORTS_PER_SOL));
    const baseAmountOut = calculateBuyBaseOut(
      BigInt(baseBalance.value.amount),
      BigInt(quoteBalance.value.amount),
      quoteAmountIn,
    );

    const buyIx = buildBuyInstruction(
      poolPk, poolState, wallet.publicKey,
      new BN(baseAmountOut.toString()), new BN(quoteAmountIn.toString()),
      baseTokenProgram, quoteTokenProgram,
    );
    return { instructions: [buyIx], signers: [] };
  }

  // ----- getPrice -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolPk = new PublicKey(poolAddress);

    const accountInfo = await connection.getAccountInfo(poolPk);
    if (!accountInfo) throw new Error(`Pool not found: ${poolAddress}`);
    const poolState = deserializePool(accountInfo.data as Buffer);

    // Read pool reserves for price calculation
    const [baseBalance, quoteBalance] = await Promise.all([
      connection.getTokenAccountBalance(poolState.poolBaseTokenAccount),
      connection.getTokenAccountBalance(poolState.poolQuoteTokenAccount),
    ]);

    const baseReserves = Number(baseBalance.value.amount);
    const quoteReserves = Number(quoteBalance.value.amount);
    const baseDecimals = baseBalance.value.decimals;
    const quoteDecimals = quoteBalance.value.decimals;

    // Price = (quoteReserves / 10^quoteDecimals) / (baseReserves / 10^baseDecimals)
    const price =
      (quoteReserves / Math.pow(10, quoteDecimals)) /
      (baseReserves / Math.pow(10, baseDecimals));

    return {
      price,
      baseMint: poolState.baseMint.toBase58(),
      quoteMint: poolState.quoteMint.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }

  // ----- Create pool -----

  /**
   * Create a new PumpSwap AMM pool with initial liquidity.
   *
   * @param baseMint - Base token mint address
   * @param quoteMint - Quote token mint address (usually WSOL)
   * @param baseAmountIn - Amount of base tokens to deposit (human-readable)
   * @param quoteAmountIn - Amount of quote tokens to deposit (human-readable)
   * @param index - Pool index (default: 1; 0 is reserved for canonical pump pools)
   * @returns TxResult with pool address
   */
  async createPool(
    baseMint: string,
    quoteMint: string,
    baseAmountIn: number,
    quoteAmountIn: number,
    index: number = 1,
  ): Promise<TxResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const baseMintPk = new PublicKey(baseMint);
    const quoteMintPk = new PublicKey(quoteMint);

    const baseTokenProgram = await detectTokenProgram(baseMintPk);
    const quoteTokenProgram = quoteMintPk.toBase58() === WSOL_MINT
      ? TOKEN_PROGRAM_ID : await detectTokenProgram(quoteMintPk);

    // Get decimals for amount conversion
    const [baseMintInfo, quoteMintInfo] = await Promise.all([
      connection.getTokenSupply(baseMintPk),
      connection.getTokenSupply(quoteMintPk),
    ]);

    const baseRaw = new BN(
      Math.floor(baseAmountIn * Math.pow(10, baseMintInfo.value.decimals)).toString(),
    );
    const quoteRaw = new BN(
      Math.floor(quoteAmountIn * Math.pow(10, quoteMintInfo.value.decimals)).toString(),
    );

    const createPoolIx = buildCreatePoolInstruction(
      wallet.publicKey,
      baseMintPk,
      quoteMintPk,
      index,
      baseRaw,
      quoteRaw,
      wallet.publicKey, // coin_creator = wallet
      baseTokenProgram,
      quoteTokenProgram,
    );

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: DEFAULT_COMPUTE_UNIT_LIMIT }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS }),
      createPoolIx,
    ];

    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    const poolPda = getPoolPda(index, wallet.publicKey, baseMintPk, quoteMintPk);
    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      poolAddress: poolPda.toBase58(),
      dex: this.name,
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new PumpFunAmmAdapter());
