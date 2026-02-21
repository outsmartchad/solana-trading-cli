/**
 * Raydium AMM V4 DEX Adapter
 *
 * Implements IDexAdapter for Raydium's classic AMM V4 program (675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8).
 * Supports buy, snipe, findPool, getPrice, and buildSwapIxs.
 * No sell — the source module has no sell implementation.
 *
 * Ported from: 100x-algo-bots/trading-modules/raydium-amm-v4/
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
  getAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

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
  requireTokenMint,
  WSOL_MINT,
  USDC_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
} from "./types";
import { registerAdapter } from "./index";
import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";
import { sendAndConfirmVtx } from "../transactions/send-rpc";

// ---------------------------------------------------------------------------
// Program constants
// ---------------------------------------------------------------------------

const RAYDIUM_AMM_V4_PROGRAM_ID = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");
const SERUM_PROGRAM_ID = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
const TOKEN_PROGRAM_ID_PK = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const WSOL_MINT_PK = new PublicKey(WSOL_MINT);
const USDC_MINT_PK = new PublicKey(USDC_MINT);
const USDT_MINT_PK = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
const USD1_MINT_PK = new PublicKey("USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB");

// Swap instruction discriminator (from Rust: data.push(9))
const SWAP_DISCRIMINATOR = 9;

// ---------------------------------------------------------------------------
// AmmInfo decoder (ported from raydium-amm-v4/utils/amm-info.ts)
// ---------------------------------------------------------------------------

interface AmmInfoDecoded {
  nonce: number;
  coinVault: PublicKey;
  pcVault: PublicKey;
  coinVaultMint: PublicKey;
  pcVaultMint: PublicKey;
  openOrders: PublicKey;
  market: PublicKey;
  marketProgram: PublicKey;
  targetOrders: PublicKey;
}

function decodeAmmInfo(data: Buffer): AmmInfoDecoded {
  if (data.length < 752) {
    throw new Error(`AmmInfo data too short: ${data.length} bytes, expected at least 752`);
  }

  const nonceValue = data.readBigUInt64LE(8);
  const nonce = Number(nonceValue & BigInt(0xff));

  return {
    nonce,
    coinVault: new PublicKey(data.slice(336, 368)),
    pcVault: new PublicKey(data.slice(368, 400)),
    coinVaultMint: new PublicKey(data.slice(400, 432)),
    pcVaultMint: new PublicKey(data.slice(432, 464)),
    openOrders: new PublicKey(data.slice(496, 528)),
    market: new PublicKey(data.slice(528, 560)),
    marketProgram: new PublicKey(data.slice(560, 592)),
    targetOrders: new PublicKey(data.slice(592, 624)),
  };
}

async function fetchAmmInfo(connection: Connection, ammId: PublicKey): Promise<AmmInfoDecoded> {
  const accountInfo = await connection.getAccountInfo(ammId);
  if (!accountInfo) throw new Error(`AmmInfo account not found: ${ammId.toBase58()}`);
  if (!accountInfo.owner.equals(RAYDIUM_AMM_V4_PROGRAM_ID)) {
    throw new Error(`Invalid account owner for AmmInfo: ${accountInfo.owner.toBase58()}`);
  }
  return decodeAmmInfo(accountInfo.data);
}

// ---------------------------------------------------------------------------
// Market info decoder (ported from raydium-amm-v4/utils/market-info.ts)
// ---------------------------------------------------------------------------

interface MarketInfoDecoded {
  bids: PublicKey;
  asks: PublicKey;
  eventQueue: PublicKey;
  coinVault: PublicKey;
  pcVault: PublicKey;
  vaultSignerNonce: bigint;
}

function decodeMarketInfo(data: Buffer): MarketInfoDecoded {
  if (data.length < 388) {
    throw new Error(`Market data too short: ${data.length} bytes`);
  }
  return {
    bids: new PublicKey(data.slice(44, 76)),
    asks: new PublicKey(data.slice(76, 108)),
    eventQueue: new PublicKey(data.slice(108, 140)),
    coinVault: new PublicKey(data.slice(140, 172)),
    pcVault: new PublicKey(data.slice(172, 204)),
    vaultSignerNonce: data.readBigUInt64LE(204),
  };
}

async function fetchMarketInfo(connection: Connection, marketId: PublicKey): Promise<MarketInfoDecoded> {
  const accountInfo = await connection.getAccountInfo(marketId);
  if (!accountInfo) throw new Error(`Market account not found: ${marketId.toBase58()}`);
  return decodeMarketInfo(accountInfo.data);
}

function deriveMarketVaultSigner(marketId: PublicKey, marketProgramId: PublicKey): PublicKey {
  // Try nonces 0-254
  for (let nonce = 0; nonce < 255; nonce++) {
    try {
      const vaultSigner = PublicKey.createProgramAddressSync(
        [marketId.toBuffer(), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(nonce)]).buffer))],
        marketProgramId,
      );
      return vaultSigner;
    } catch {
      continue;
    }
  }
  throw new Error("Failed to derive market vault signer");
}

// ---------------------------------------------------------------------------
// Pool account derivation
// ---------------------------------------------------------------------------

interface AmmV4PoolAccounts {
  ammId: PublicKey;
  ammAuthority: PublicKey;
  ammOpenOrders: PublicKey;
  ammTargetOrders: PublicKey;
  poolCoinTokenAccount: PublicKey;
  poolPcTokenAccount: PublicKey;
  serumMarket: PublicKey;
  serumBids: PublicKey;
  serumAsks: PublicKey;
  serumEventQueue: PublicKey;
  serumCoinVaultAccount: PublicKey;
  serumPcVaultAccount: PublicKey;
  serumVaultSigner: PublicKey;
  coinMint: PublicKey;
  pcMint: PublicKey;
  coinTokenProgram: PublicKey;
  pcTokenProgram: PublicKey;
}

async function derivePoolAccounts(
  connection: Connection,
  ammId: PublicKey,
): Promise<AmmV4PoolAccounts> {
  const ammInfo = await fetchAmmInfo(connection, ammId);

  // Derive ammAuthority
  const AUTHORITY_AMM_SEED = Buffer.from("amm authority");
  let ammAuthority: PublicKey;
  try {
    ammAuthority = PublicKey.createProgramAddressSync(
      [AUTHORITY_AMM_SEED, Buffer.from([ammInfo.nonce])],
      RAYDIUM_AMM_V4_PROGRAM_ID,
    );
  } catch {
    const [authority] = PublicKey.findProgramAddressSync([AUTHORITY_AMM_SEED], RAYDIUM_AMM_V4_PROGRAM_ID);
    ammAuthority = authority;
  }

  // Fetch market info
  const marketInfo = await fetchMarketInfo(connection, ammInfo.market);
  const serumVaultSigner = deriveMarketVaultSigner(ammInfo.market, ammInfo.marketProgram);

  // Detect token programs
  const coinTokenProgram = await getTokenProgramForMint(connection, ammInfo.coinVaultMint);
  const pcTokenProgram = await getTokenProgramForMint(connection, ammInfo.pcVaultMint);

  return {
    ammId,
    ammAuthority,
    ammOpenOrders: ammInfo.openOrders,
    ammTargetOrders: ammInfo.targetOrders,
    poolCoinTokenAccount: ammInfo.coinVault,
    poolPcTokenAccount: ammInfo.pcVault,
    serumMarket: ammInfo.market,
    serumBids: marketInfo.bids,
    serumAsks: marketInfo.asks,
    serumEventQueue: marketInfo.eventQueue,
    serumCoinVaultAccount: marketInfo.coinVault,
    serumPcVaultAccount: marketInfo.pcVault,
    serumVaultSigner,
    coinMint: ammInfo.coinVaultMint,
    pcMint: ammInfo.pcVaultMint,
    coinTokenProgram,
    pcTokenProgram,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID_PK;
}

function isQuoteMint(mint: PublicKey): boolean {
  return (
    mint.equals(WSOL_MINT_PK) ||
    mint.equals(USDC_MINT_PK) ||
    mint.equals(USDT_MINT_PK) ||
    mint.equals(USD1_MINT_PK)
  );
}

// ---------------------------------------------------------------------------
// SDK instruction builder (ported from raydium-amm-v4/sdk.ts)
// ---------------------------------------------------------------------------

function createSwapIx(
  poolAccounts: AmmV4PoolAccounts,
  payer: PublicKey,
  userInputAta: PublicKey,
  userOutputAta: PublicKey,
  amountIn: bigint,
  minOut: bigint,
  inputTokenProgram: PublicKey,
): TransactionInstruction {
  const accounts = [
    { pubkey: inputTokenProgram, isSigner: false, isWritable: false },
    { pubkey: poolAccounts.ammId, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.ammAuthority, isSigner: false, isWritable: false },
    { pubkey: poolAccounts.ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SERUM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: poolAccounts.serumMarket, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.serumBids, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.serumAsks, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.serumEventQueue, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.serumVaultSigner, isSigner: false, isWritable: false },
    { pubkey: userInputAta, isSigner: false, isWritable: true },
    { pubkey: userOutputAta, isSigner: false, isWritable: true },
    { pubkey: payer, isSigner: true, isWritable: false },
  ];

  // Data: [9, amount_in (u64 LE), minimum_amount_out (u64 LE)] = 17 bytes
  const data = Buffer.alloc(17);
  data.writeUInt8(SWAP_DISCRIMINATOR, 0);
  data.writeBigUInt64LE(amountIn, 1);
  data.writeBigUInt64LE(minOut, 9);

  return new TransactionInstruction({
    keys: accounts,
    programId: RAYDIUM_AMM_V4_PROGRAM_ID,
    data,
  });
}

// ---------------------------------------------------------------------------
// Pool discovery via Raydium SDK API
// ---------------------------------------------------------------------------

async function discoverAmmV4Pool(
  connection: Connection,
  tokenMint: string,
  quoteMint: string,
): Promise<{ poolId: string } | null> {
  // Try fetching via Raydium API
  try {
    const { Raydium } = await import("@raydium-io/raydium-sdk-v2");
    const raydium = await Raydium.load({
      connection,
      disableLoadToken: true,
    });
    const listOfPools = await raydium.api.fetchPoolByMints({
      mint1: quoteMint,
      mint2: tokenMint,
    });
    for (const obj of listOfPools) {
      if (obj.type === "Standard" && obj.programId === RAYDIUM_AMM_V4_PROGRAM_ID.toBase58()) {
        return { poolId: obj.id };
      }
    }
  } catch {
    // API unavailable, fallback below
  }
  return null;
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

class RaydiumAmmV4Adapter implements IDexAdapter {
  readonly name = "raydium-amm-v4";
  readonly protocol = "amm-v4";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    canSnipe: true,
    canFindPool: true,
    canGetPrice: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMintPk = new PublicKey(tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const slippageBps = params.opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const computeUnits = params.opts?.computeUnitLimit ?? 300_000;

    // Resolve pool
    let poolId: PublicKey;
    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
    } else {
      const found = await discoverAmmV4Pool(connection, tokenMint, quoteMintPk.toBase58());
      if (!found) throw new PoolNotFoundError(this.name, tokenMint, params.quoteMint);
      poolId = new PublicKey(found.poolId);
    }

    // Derive all pool accounts
    const poolAccounts = await derivePoolAccounts(connection, poolId);

    // Detect base token program
    const baseTokenProgram = await getTokenProgramForMint(connection, tokenMintPk);

    // Calculate amounts
    const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
    const amountIn = BigInt(Math.floor(params.amountSol * 10 ** quoteDecimals));

    // Compute minOut from reserves
    let minOut = 0n;
    try {
      const [coinBal, pcBal] = await Promise.all([
        connection.getTokenAccountBalance(poolAccounts.poolCoinTokenAccount),
        connection.getTokenAccountBalance(poolAccounts.poolPcTokenAccount),
      ]);
      const coinReserve = BigInt(coinBal.value.amount);
      const pcReserve = BigInt(pcBal.value.amount);

      // Determine direction: if quoteMint == pcMint, swap pc -> coin
      let estOut: bigint;
      if (poolAccounts.pcMint.equals(quoteMintPk)) {
        // Buying coinMint with pcMint
        const k = coinReserve * pcReserve;
        const newPc = pcReserve + amountIn;
        estOut = coinReserve - k / newPc;
      } else {
        // Buying pcMint with coinMint (reversed pool)
        const k = coinReserve * pcReserve;
        const newCoin = coinReserve + amountIn;
        estOut = pcReserve - k / newCoin;
      }
      minOut = (estOut * BigInt(10000 - slippageBps)) / 10000n;
    } catch {
      // zero floor
    }

    // Build ATAs
    const inputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);
    const outputAta = await getAssociatedTokenAddress(
      tokenMintPk,
      wallet.publicKey,
      baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
      baseTokenProgram,
    );

    // Determine input token program
    let inputTokenProgram: PublicKey;
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      inputTokenProgram = TOKEN_PROGRAM_ID_PK;
    } else if (poolAccounts.pcMint.equals(quoteMintPk)) {
      inputTokenProgram = poolAccounts.pcTokenProgram;
    } else {
      inputTokenProgram = poolAccounts.coinTokenProgram;
    }

    // Build instructions
    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, inputAta, wallet.publicKey, quoteMintPk),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, outputAta, wallet.publicKey, tokenMintPk,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID_PK,
      ),
    ];

    // WSOL wrapping
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      const lamports = Math.floor(params.amountSol * LAMPORTS_PER_SOL);
      ixs.push(
        SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: inputAta, lamports }),
        createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID_PK),
      );
    }

    // Swap
    ixs.push(createSwapIx(poolAccounts, wallet.publicKey, inputAta, outputAta, amountIn, minOut, inputTokenProgram));

    // Close WSOL
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      ixs.push(createCloseAccountInstruction(inputAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID_PK));
    }

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: params.amountSol,
      amountInToken: quoteMintPk.equals(WSOL_MINT_PK) ? "SOL" : quoteMintPk.toBase58(),
      dex: this.name,
      poolAddress: poolId.toBase58(),
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMintPk = new PublicKey(tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const slippageBps = params.opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const computeUnits = params.opts?.computeUnitLimit ?? 300_000;

    // Resolve pool
    let poolId: PublicKey;
    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
    } else {
      const found = await discoverAmmV4Pool(connection, tokenMint, quoteMintPk.toBase58());
      if (!found) throw new PoolNotFoundError(this.name, tokenMint, params.quoteMint);
      poolId = new PublicKey(found.poolId);
    }

    // Derive all pool accounts
    const poolAccounts = await derivePoolAccounts(connection, poolId);

    // Detect base token program
    const baseTokenProgram = await getTokenProgramForMint(connection, tokenMintPk);

    // Get token balance
    const baseAta = await getAssociatedTokenAddress(
      tokenMintPk,
      wallet.publicKey,
      baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
      baseTokenProgram,
    );
    const tokenAccount = await getAccount(connection, baseAta, "confirmed", baseTokenProgram);
    const balance = tokenAccount.amount;

    // Calculate sell amount based on percentage
    const sellAmount = BigInt(Math.floor((Number(balance) * params.percentage) / 100));

    if (sellAmount === 0n) {
      throw new Error(`No balance to sell for ${tokenMint}`);
    }

    // Compute minOut from reserves (reversed direction vs buy)
    let minOut = 0n;
    try {
      const [coinBal, pcBal] = await Promise.all([
        connection.getTokenAccountBalance(poolAccounts.poolCoinTokenAccount),
        connection.getTokenAccountBalance(poolAccounts.poolPcTokenAccount),
      ]);
      const coinReserve = BigInt(coinBal.value.amount);
      const pcReserve = BigInt(pcBal.value.amount);

      // Selling token → receiving quote. Determine direction.
      let estOut: bigint;
      if (poolAccounts.coinMint.equals(tokenMintPk)) {
        // Selling coinMint → receiving pcMint
        const k = coinReserve * pcReserve;
        const newCoin = coinReserve + sellAmount;
        estOut = pcReserve - k / newCoin;
      } else {
        // Selling pcMint → receiving coinMint
        const k = coinReserve * pcReserve;
        const newPc = pcReserve + sellAmount;
        estOut = coinReserve - k / newPc;
      }
      minOut = (estOut * BigInt(10000 - slippageBps)) / 10000n;
    } catch {
      // zero floor
    }

    // Build ATAs — reversed from buy: input is token, output is quote
    const userInputAta = baseAta;
    const quoteTokenProgram = quoteMintPk.equals(WSOL_MINT_PK)
      ? TOKEN_PROGRAM_ID_PK
      : await getTokenProgramForMint(connection, quoteMintPk);
    const userOutputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);

    // Determine input token program (the token being sold)
    const inputTokenProgram = baseTokenProgram;

    // Build instructions
    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, userInputAta, wallet.publicKey, tokenMintPk,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID_PK,
      ),
      createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userOutputAta, wallet.publicKey, quoteMintPk),
    ];

    // WSOL output: create WSOL ATA so we can receive wrapped SOL, then close after
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      // ATA creation already handled above via idempotent instruction
    }

    // Swap — input is token ATA, output is quote ATA
    ixs.push(createSwapIx(poolAccounts, wallet.publicKey, userInputAta, userOutputAta, sellAmount, minOut, inputTokenProgram));

    // Close WSOL output ATA to unwrap back to SOL
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      ixs.push(createCloseAccountInstruction(userOutputAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID_PK));
    }

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    // Human-readable sell amount
    let tokenDecimals = 9;
    try {
      const mintData = await connection.getTokenSupply(tokenMintPk);
      tokenDecimals = mintData.value.decimals;
    } catch { /* fallback to 9 */ }
    const humanAmount = Number(sellAmount) / Math.pow(10, tokenDecimals);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: humanAmount,
      amountInToken: tokenMint,
      dex: this.name,
      poolAddress: poolId.toBase58(),
    };
  }

  // ----- Snipe -----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMint = new PublicKey(params.tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const poolId = new PublicKey(params.poolAddress);
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? 10_000_000;

    // Derive all pool accounts
    const poolAccounts = await derivePoolAccounts(connection, poolId);

    // Detect base token program
    const baseTokenProgram = await getTokenProgramForMint(connection, tokenMint);

    // Calculate amounts
    const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
    const amountIn = BigInt(Math.floor(params.amountSol * 10 ** quoteDecimals));
    const minOut = 0n; // Unlimited slippage for sniping

    // Build ATAs
    const inputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);
    const outputAta = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey,
      baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
      baseTokenProgram,
    );

    // Determine input token program
    let inputTokenProgram: PublicKey;
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      inputTokenProgram = TOKEN_PROGRAM_ID_PK;
    } else if (poolAccounts.pcMint.equals(quoteMintPk)) {
      inputTokenProgram = poolAccounts.pcTokenProgram;
    } else {
      inputTokenProgram = poolAccounts.coinTokenProgram;
    }

    // Build instructions
    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, inputAta, wallet.publicKey, quoteMintPk),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, outputAta, wallet.publicKey, tokenMint,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID_PK,
      ),
    ];

    // WSOL wrapping
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      const lamports = Math.floor(params.amountSol * LAMPORTS_PER_SOL);
      ixs.push(
        SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: inputAta, lamports }),
        createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID_PK),
      );
    }

    // Swap
    ixs.push(createSwapIx(poolAccounts, wallet.publicKey, inputAta, outputAta, amountIn, minOut, inputTokenProgram));

    // Close WSOL
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      ixs.push(createCloseAccountInstruction(inputAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID_PK));
    }

    // Submit via landing layer
    const { blockhash } = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "snipe",
      tipSol: params.tipSol,
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

  // ----- Build swap IXs -----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    if (!("amountSol" in params)) {
      throw new UnsupportedOperationError(this.name, "buildSwapIxs(sell)");
    }

    const tokenMint = requireTokenMint(params, this.name);
    const connection = getConnection();
    const wallet = getWallet();
    const buyParams = params as BuyParams;
    const tokenMintPk = new PublicKey(tokenMint);
    const quoteMintPk = buyParams.quoteMint ? new PublicKey(buyParams.quoteMint) : WSOL_MINT_PK;

    // Resolve pool
    let poolId: PublicKey;
    if (buyParams.poolAddress) {
      poolId = new PublicKey(buyParams.poolAddress);
    } else {
      const found = await discoverAmmV4Pool(connection, tokenMint, quoteMintPk.toBase58());
      if (!found) throw new PoolNotFoundError(this.name, tokenMint, buyParams.quoteMint);
      poolId = new PublicKey(found.poolId);
    }

    const poolAccounts = await derivePoolAccounts(connection, poolId);
    const baseTokenProgram = await getTokenProgramForMint(connection, tokenMintPk);

    const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
    const amountIn = BigInt(Math.floor(buyParams.amountSol * 10 ** quoteDecimals));

    const inputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);
    const outputAta = await getAssociatedTokenAddress(
      tokenMintPk,
      wallet.publicKey,
      baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
      baseTokenProgram,
    );

    let inputTokenProgram: PublicKey;
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      inputTokenProgram = TOKEN_PROGRAM_ID_PK;
    } else if (poolAccounts.pcMint.equals(quoteMintPk)) {
      inputTokenProgram = poolAccounts.pcTokenProgram;
    } else {
      inputTokenProgram = poolAccounts.coinTokenProgram;
    }

    const instructions: TransactionInstruction[] = [
      createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, inputAta, wallet.publicKey, quoteMintPk),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, outputAta, wallet.publicKey, tokenMintPk,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID_PK,
      ),
    ];

    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      const lamports = Math.floor(buyParams.amountSol * LAMPORTS_PER_SOL);
      instructions.push(
        SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: inputAta, lamports }),
        createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID_PK),
      );
    }

    instructions.push(createSwapIx(poolAccounts, wallet.publicKey, inputAta, outputAta, amountIn, 0n, inputTokenProgram));

    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      instructions.push(createCloseAccountInstruction(inputAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID_PK));
    }

    return { instructions, signers: [] };
  }

  // ----- Pool discovery -----

  async findPool(baseMint: string, quoteMint?: string): Promise<PoolInfo | null> {
    const connection = getConnection();
    const quoteMintStr = quoteMint ?? WSOL_MINT;

    const found = await discoverAmmV4Pool(connection, baseMint, quoteMintStr);
    if (!found) return null;

    const poolId = new PublicKey(found.poolId);

    try {
      const ammInfo = await fetchAmmInfo(connection, poolId);
      const [coinBal, pcBal] = await Promise.all([
        connection.getTokenAccountBalance(ammInfo.coinVault),
        connection.getTokenAccountBalance(ammInfo.pcVault),
      ]);

      return {
        address: found.poolId,
        dex: this.name,
        protocol: this.protocol,
        baseMint: ammInfo.coinVaultMint.toBase58(),
        quoteMint: ammInfo.pcVaultMint.toBase58(),
        baseDecimals: coinBal.value.decimals,
        quoteDecimals: pcBal.value.decimals,
      };
    } catch {
      return {
        address: found.poolId,
        dex: this.name,
        protocol: this.protocol,
        baseMint,
        quoteMint: quoteMintStr,
        baseDecimals: 6,
        quoteDecimals: 9,
      };
    }
  }

  // ----- Price -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolId = new PublicKey(poolAddress);
    const ammInfo = await fetchAmmInfo(connection, poolId);

    const [coinBal, pcBal] = await Promise.all([
      connection.getTokenAccountBalance(ammInfo.coinVault),
      connection.getTokenAccountBalance(ammInfo.pcVault),
    ]);

    const coinReserve = Number(coinBal.value.amount) / 10 ** coinBal.value.decimals;
    const pcReserve = Number(pcBal.value.amount) / 10 ** pcBal.value.decimals;

    // Determine which is base vs quote
    const pcIsQuote = isQuoteMint(ammInfo.pcVaultMint);
    let price: number;
    let baseMint: PublicKey;
    let quoteMintOut: PublicKey;

    if (pcIsQuote) {
      price = coinReserve > 0 ? pcReserve / coinReserve : 0;
      baseMint = ammInfo.coinVaultMint;
      quoteMintOut = ammInfo.pcVaultMint;
    } else {
      price = pcReserve > 0 ? coinReserve / pcReserve : 0;
      baseMint = ammInfo.pcVaultMint;
      quoteMintOut = ammInfo.coinVaultMint;
    }

    return {
      price,
      baseMint: baseMint.toBase58(),
      quoteMint: quoteMintOut.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }
}

// ---------------------------------------------------------------------------
// Register adapter
// ---------------------------------------------------------------------------

registerAdapter(new RaydiumAmmV4Adapter());
