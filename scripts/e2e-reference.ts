/**
 * Exact copy of percolator-launch e2e-devnet-test.ts, adapted to use
 * outsmart-cli's vendored core SDK and wallet config.
 *
 * Run: npx ts-node scripts/e2e-reference.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getWallet } from "../src/helpers/config";
import { dev_connection } from "../src/helpers/config";

// Import vendored core SDK
import {
  encodeInitMarket,
  encodeInitLP,
  encodeInitUser,
  encodeDepositCollateral,
  encodeTopUpInsurance,
  encodeKeeperCrank,
  encodeSetOracleAuthority,
  encodePushOraclePrice,
  encodeTradeCpi,
  encodeInitVamm,
  ACCOUNTS_INIT_MARKET,
  ACCOUNTS_INIT_LP,
  ACCOUNTS_INIT_USER,
  ACCOUNTS_DEPOSIT_COLLATERAL,
  ACCOUNTS_TOPUP_INSURANCE,
  ACCOUNTS_KEEPER_CRANK,
  ACCOUNTS_SET_ORACLE_AUTHORITY,
  ACCOUNTS_PUSH_ORACLE_PRICE,
  ACCOUNTS_TRADE_CPI,
  buildAccountMetas,
  buildIx,
  WELL_KNOWN,
  deriveVaultAuthority,
  deriveLpPda,
  SLAB_TIERS,
} from "../src/dex/percolator/core";

const PROGRAM_ID = new PublicKey("FxfD37s1AZTeWfFQps9Zpebi2dNQ9QSSDtfMKdbsfKrD");
const MATCHER_PROGRAM_ID = new PublicKey("4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy");
const MATCHER_CTX_SIZE = 320;

const conn = dev_connection!;
const payer = getWallet();

function ok(label: string) { console.log(`  ✅ ${label}`); }

async function send(tx: Transaction, signers: Keypair[], label: string): Promise<string> {
  tx.feePayer = payer.publicKey;
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  try {
    const sig = await sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
    ok(`${label} → ${sig.slice(0, 12)}...`);
    return sig;
  } catch (e: any) {
    const logs = e?.logs || e?.message || e;
    console.error(`  ❌ ${label}:`, logs);
    throw e;
  }
}

async function main() {
  console.log("🧪 E2E Reference Test (using outsmart-cli SDK)");
  console.log(`   Payer: ${payer.publicKey.toBase58()}`);
  console.log(`   Balance: ${(await conn.getBalance(payer.publicKey)) / LAMPORTS_PER_SOL} SOL`);
  console.log(`   Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`   Matcher: ${MATCHER_PROGRAM_ID.toBase58()}`);
  console.log("");

  // 1. Create SPL token mint (exactly like reference)
  console.log("Step 1: Create token mint");
  const mintKp = Keypair.generate();
  const mintRent = await getMinimumBalanceForRentExemptMint(conn);
  const createMintTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKp.publicKey,
      lamports: mintRent,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mintKp.publicKey, 9, payer.publicKey, payer.publicKey)
  );
  await send(createMintTx, [payer, mintKp], `Mint created: ${mintKp.publicKey.toBase58().slice(0, 12)}...`);

  // 2. Create ATA + mint tokens
  console.log("Step 2: Mint tokens");
  const payerAta = await getAssociatedTokenAddress(mintKp.publicKey, payer.publicKey);
  const mintToTx = new Transaction().add(
    createAssociatedTokenAccountInstruction(payer.publicKey, payerAta, payer.publicKey, mintKp.publicKey),
    createMintToInstruction(mintKp.publicKey, payerAta, payer.publicKey, 1_000_000_000_000_000n)
  );
  await send(mintToTx, [payer], `Minted 1M tokens to ${payerAta.toBase58().slice(0, 12)}...`);

  // 3. Create slab (micro tier — cheapest, 64 slots, 16320 bytes)
  console.log("Step 3: Create slab");
  const tier = { maxAccounts: 64, dataSize: 16320, label: 'Micro' };
  const slabKp = Keypair.generate();
  const slabRent = await conn.getMinimumBalanceForRentExemption(tier.dataSize);
  console.log(`   Slab rent: ${slabRent / LAMPORTS_PER_SOL} SOL`);
  const createSlabTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }),
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: slabKp.publicKey,
      lamports: slabRent,
      space: tier.dataSize,
      programId: PROGRAM_ID,
    })
  );
  await send(createSlabTx, [payer, slabKp], `Slab: ${slabKp.publicKey.toBase58().slice(0, 12)}...`);

  // 4. Create vault ATA
  console.log("Step 4: Create vault ATA");
  const [vaultPda] = deriveVaultAuthority(PROGRAM_ID, slabKp.publicKey);
  const vaultAta = await getAssociatedTokenAddress(mintKp.publicKey, vaultPda, true);
  const createVaultTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
    createAssociatedTokenAccountInstruction(payer.publicKey, vaultAta, vaultPda, mintKp.publicKey)
  );
  await send(createVaultTx, [payer], `Vault ATA: ${vaultAta.toBase58().slice(0, 12)}...`);

  // 5. InitMarket (admin oracle mode — all zeros feed)
  console.log("Step 5: InitMarket");
  const initMarketData = encodeInitMarket({
    admin: payer.publicKey,
    collateralMint: mintKp.publicKey,
    indexFeedId: "0".repeat(64),
    maxStalenessSecs: 50n,
    confFilterBps: 0,
    invert: 0,
    unitScale: 0,
    initialMarkPriceE6: 1_000_000n, // $1.00
    warmupPeriodSlots: 0n,
    maintenanceMarginBps: 500n,
    initialMarginBps: 1000n,
    tradingFeeBps: 30n,
    maxAccounts: BigInt(tier.maxAccounts),
    newAccountFee: 1_000_000n,
    riskReductionThreshold: 0n,
    maintenanceFeePerSlot: 0n,
    maxCrankStalenessSlots: 100n,
    liquidationFeeBps: 100n,
    liquidationFeeCap: 0n,
    liquidationBufferBps: 50n,
    minLiquidationAbs: 0n,
  });
  const initMarketKeys = buildAccountMetas(ACCOUNTS_INIT_MARKET, [
    payer.publicKey, slabKp.publicKey, mintKp.publicKey, vaultAta,
    WELL_KNOWN.tokenProgram, WELL_KNOWN.clock, WELL_KNOWN.rent, vaultAta, WELL_KNOWN.systemProgram,
  ]);
  const initMarketTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    buildIx({ programId: PROGRAM_ID, keys: initMarketKeys, data: initMarketData })
  );
  await send(initMarketTx, [payer], "InitMarket");

  // 6. Create matcher context + InitLP
  console.log("Step 6: InitLP with matcher");
  const matcherCtxKp = Keypair.generate();
  const matcherRent = await conn.getMinimumBalanceForRentExemption(MATCHER_CTX_SIZE);
  const lpIdx = 0;
  const [lpPda] = deriveLpPda(PROGRAM_ID, slabKp.publicKey, lpIdx);

  const initLpData = encodeInitLP({
    matcherProgram: MATCHER_PROGRAM_ID,
    matcherContext: matcherCtxKp.publicKey,
    feePayment: 0n,
  });
  const initLpKeys = buildAccountMetas(ACCOUNTS_INIT_LP, [
    payer.publicKey, slabKp.publicKey, payerAta, vaultAta, WELL_KNOWN.tokenProgram,
  ]);

  // 6a: Create matcher context account
  const createMatcherTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }),
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: matcherCtxKp.publicKey,
      lamports: matcherRent,
      space: MATCHER_CTX_SIZE,
      programId: MATCHER_PROGRAM_ID,
    })
  );
  await send(createMatcherTx, [payer, matcherCtxKp], "Create matcher ctx");

  // 6b: Init matcher context (Tag 1 = passthrough — exactly like reference)
  const initMatcherTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }),
    {
      programId: MATCHER_PROGRAM_ID,
      keys: [
        { pubkey: lpPda, isSigner: false, isWritable: false },
        { pubkey: matcherCtxKp.publicKey, isSigner: false, isWritable: true },
      ],
      data: Buffer.from([1]),
    }
  );
  await send(initMatcherTx, [payer], "Init matcher ctx (tag=1)");

  // 6c: Init LP in percolator
  const initLpTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    buildIx({ programId: PROGRAM_ID, keys: initLpKeys, data: initLpData })
  );
  await send(initLpTx, [payer], "InitLP");

  // 7. Deposit collateral + TopUp insurance
  console.log("Step 7: Deposit + Insurance");
  const depositData = encodeDepositCollateral({ userIdx: 0, amount: 1_000_000_000_000n }); // 1000 tokens
  const depositKeys = buildAccountMetas(ACCOUNTS_DEPOSIT_COLLATERAL, [
    payer.publicKey, slabKp.publicKey, payerAta, vaultAta, WELL_KNOWN.tokenProgram, WELL_KNOWN.clock,
  ]);
  const topupData = encodeTopUpInsurance({ amount: 100_000_000_000n }); // 100 tokens
  const topupKeys = buildAccountMetas(ACCOUNTS_TOPUP_INSURANCE, [
    payer.publicKey, slabKp.publicKey, payerAta, vaultAta, WELL_KNOWN.tokenProgram,
  ]);
  const depositTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    buildIx({ programId: PROGRAM_ID, keys: depositKeys, data: depositData }),
    buildIx({ programId: PROGRAM_ID, keys: topupKeys, data: topupData })
  );
  await send(depositTx, [payer], "Deposit 1000 + Insurance 100");

  // 8. Set oracle authority + Push price + Crank
  console.log("Step 8: Oracle setup + Crank");
  const setAuthData = encodeSetOracleAuthority({ newAuthority: payer.publicKey });
  const setAuthKeys = buildAccountMetas(ACCOUNTS_SET_ORACLE_AUTHORITY, [payer.publicKey, slabKp.publicKey]);

  const now = Math.floor(Date.now() / 1000);
  const pushData = encodePushOraclePrice({ priceE6: 1_000_000n, timestamp: BigInt(now) });
  const pushKeys = buildAccountMetas(ACCOUNTS_PUSH_ORACLE_PRICE, [payer.publicKey, slabKp.publicKey]);

  const crankData = encodeKeeperCrank({ callerIdx: 65535, allowPanic: false });
  const crankKeys = buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
    payer.publicKey, slabKp.publicKey, WELL_KNOWN.clock, slabKp.publicKey,
  ]);

  const oracleTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    buildIx({ programId: PROGRAM_ID, keys: setAuthKeys, data: setAuthData }),
    buildIx({ programId: PROGRAM_ID, keys: pushKeys, data: pushData }),
    buildIx({ programId: PROGRAM_ID, keys: crankKeys, data: crankData })
  );
  await send(oracleTx, [payer], "SetOracleAuth + PushPrice + Crank");

  // 9. InitUser
  console.log("Step 9: InitUser (trader)");
  const initUserData = encodeInitUser({ feePayment: 1_000_000n });
  const initUserKeys = buildAccountMetas(ACCOUNTS_INIT_USER, [
    payer.publicKey, slabKp.publicKey, payerAta, vaultAta, WELL_KNOWN.tokenProgram,
  ]);
  const initUserTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    buildIx({ programId: PROGRAM_ID, keys: initUserKeys, data: initUserData })
  );
  await send(initUserTx, [payer], "InitUser");

  // 10. Deposit trader collateral
  console.log("Step 10: Deposit trader collateral");
  const traderDepositData = encodeDepositCollateral({ userIdx: 1, amount: 500_000_000_000n }); // 500 tokens
  const traderDepositKeys = buildAccountMetas(ACCOUNTS_DEPOSIT_COLLATERAL, [
    payer.publicKey, slabKp.publicKey, payerAta, vaultAta, WELL_KNOWN.tokenProgram, WELL_KNOWN.clock,
  ]);
  const traderDepositTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    buildIx({ programId: PROGRAM_ID, keys: traderDepositKeys, data: traderDepositData })
  );
  await send(traderDepositTx, [payer], "Deposit 500 to trader");

  // 11. TradeCpi
  console.log("Step 11: TradeCpi (open long)");
  const tradeData = encodeTradeCpi({ lpIdx: 0, userIdx: 1, size: 100_000_000n }); // 0.1 token
  const tradeKeys = buildAccountMetas(ACCOUNTS_TRADE_CPI, [
    payer.publicKey,
    payer.publicKey, // LP owner = payer
    slabKp.publicKey,
    WELL_KNOWN.clock,
    slabKp.publicKey, // oracle = slab for hyperp
    MATCHER_PROGRAM_ID,
    matcherCtxKp.publicKey,
    lpPda,
  ]);
  const tradeTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    buildIx({ programId: PROGRAM_ID, keys: tradeKeys, data: tradeData })
  );
  await send(tradeTx, [payer], "TradeCpi — opened long position");

  console.log("\n🎉 ALL STEPS PASSED!");
  console.log(`   Slab: ${slabKp.publicKey.toBase58()}`);
  console.log(`   Mint: ${mintKp.publicKey.toBase58()}`);
}

main().catch((e) => {
  console.error("\n💀 Test failed:", e.message || e);
  process.exit(1);
});
