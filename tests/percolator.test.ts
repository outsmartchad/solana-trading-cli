/**
 * Percolator adapter integration tests — devnet.
 *
 * Tests the full lifecycle of a Percolator perpetual futures market:
 *   1. Create market (10-step)
 *   2. Init user (trader account)
 *   3. Deposit collateral
 *   4. Push oracle price
 *   5. Crank
 *   6. Trade (open long)
 *   7. Read market state
 *   8. Read position
 *   9. Trade (close position)
 *  10. Withdraw collateral
 *  11. Close account
 *  12. Discover markets
 *
 * Requirements:
 *   - PRIVATE_KEY env var
 *   - DEVNET_ENDPOINT env var (Helius devnet RPC)
 *   - Wallet funded with devnet SOL (tests use ~0.1 SOL for rent + collateral)
 *
 * Run: npm run test:percolator
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import { getWallet } from "../src/helpers/config";
import { dev_connection } from "../src/helpers/config";
import { PercolatorAdapter } from "../src/dex/percolator/adapter";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Collateral: wrapped SOL on devnet */
const COLLATERAL_MINT = NATIVE_MINT.toBase58(); // So11111111111111111111111111111111111111112

/** Initial oracle price: $1.00 in e6 format (matching reference e2e test) */
const INITIAL_PRICE_E6 = 1_000_000n;

/** LP collateral: 0.5 SOL in lamports (500M lamports — enough to absorb trades) */
const LP_COLLATERAL = 500_000_000n; // 0.5 SOL

/** Trader deposit: 0.5 SOL */
const TRADER_DEPOSIT = 500_000_000n;

/** Trade size: 100M units (matching reference e2e test — 0.1 token notional) */
const TRADE_SIZE = 100_000_000n;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDevnetConnection(): Connection {
  if (!dev_connection) {
    throw new Error(
      "DEVNET_ENDPOINT not set. Add it to ~/.outsmart/config.env or set env var.",
    );
  }
  return dev_connection;
}

async function ensureDevnetReady(): Promise<void> {
  const wallet = getWallet();
  const connection = getDevnetConnection();

  const balance = await connection.getBalance(wallet.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;

  if (solBalance < 2.0) {
    throw new Error(
      `Devnet wallet ${wallet.publicKey.toBase58()} has only ${solBalance} SOL. ` +
        `Need at least 2.0 SOL. Use: solana airdrop 2 ${wallet.publicKey.toBase58()} --url devnet`,
    );
  }

  console.log(
    `Devnet wallet: ${wallet.publicKey.toBase58()} | Balance: ${solBalance.toFixed(4)} SOL`,
  );
}

/**
 * Wrap SOL into WSOL ATA for the wallet.
 * Creates the ATA if needed, transfers lamports, syncs.
 */
async function wrapSol(amount: bigint): Promise<void> {
  const wallet = getWallet();
  const connection = getDevnetConnection();
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey, false);

  const tx = new Transaction();
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      ata,
      wallet.publicKey,
      NATIVE_MINT,
    ),
  );
  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: ata,
      lamports: amount,
    }),
  );
  tx.add(createSyncNativeInstruction(ata));

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;
  tx.sign(wallet);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, "confirmed");
  console.log(`Wrapped ${Number(amount) / LAMPORTS_PER_SOL} SOL → WSOL: ${sig}`);
}

function delay(ms: number = 3000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PercolatorAdapter (devnet)", () => {
  const adapter = new PercolatorAdapter();
  let slabAddress: string;
  let lpIdx: number;
  let userIdx: number;

  beforeAll(async () => {
    await ensureDevnetReady();
    // Wrap enough SOL for LP collateral + trader deposit + buffer
    await wrapSol(LP_COLLATERAL + TRADER_DEPOSIT + 50_000_000n); // extra buffer for fees + new account fees
  });

  afterAll(async () => {
    // Tear down the market to recover slab rent (~0.44 SOL)
    if (slabAddress) {
      console.log("\nTearing down test market to recover SOL...");
      try {
        const result = await adapter.teardownMarket(slabAddress, "devnet", "small");
        console.log(`  Closed ${result.closedAccounts} accounts, slab closed: ${result.slabClosed}`);
      } catch (e: any) {
        console.warn(`  Teardown failed: ${e.message}`);
      }
    }
  }, 120_000);

  // ── Market Creation ─────────────────────────────────────────────────

  it("should create a perp market", async () => {
    const result = await adapter.createMarket({
      collateralMint: COLLATERAL_MINT,
      initialPriceE6: INITIAL_PRICE_E6,
      tier: "small",
      network: "devnet",
      lpCollateral: LP_COLLATERAL,
    });

    expect(result.slabAddress).toBeTruthy();
    expect(result.vaultAddress).toBeTruthy();
    expect(result.matcherCtxAddress).toBeTruthy();
    expect(result.signatures.length).toBe(4); // 4 TXs: slab+init, oracle+crank, matcher+LP, deposit
    expect(typeof result.lpIndex).toBe("number");

    slabAddress = result.slabAddress;
    lpIdx = result.lpIndex;

    console.log(`Market created: ${slabAddress}`);
    console.log(`LP index: ${lpIdx}`);
    console.log(`Signatures: ${result.signatures.join(", ")}`);
  }, 120_000);

  // ── Init User ───────────────────────────────────────────────────────

  it("should register a trader account", async () => {
    await delay();

    const result = await adapter.initUser(slabAddress, "devnet", "small");

    expect(result.userIdx).toBeDefined();
    expect(typeof result.userIdx).toBe("number");
    expect(result.signature).toBeTruthy();

    userIdx = result.userIdx;
    console.log(`Trader registered: idx=${userIdx}, sig=${result.signature}`);
  }, 60_000);

  // ── Deposit ─────────────────────────────────────────────────────────

  it("should deposit collateral", async () => {
    await delay();

    const sig = await adapter.deposit(
      slabAddress,
      userIdx,
      TRADER_DEPOSIT,
      "devnet",
      "small",
    );

    expect(sig).toBeTruthy();
    console.log(`Deposited ${Number(TRADER_DEPOSIT)} lamports: ${sig}`);
  }, 60_000);

  // ── Push Oracle Price ───────────────────────────────────────────────

  it("should push oracle price", async () => {
    await delay();

    const sig = await adapter.pushOraclePrice(
      slabAddress,
      INITIAL_PRICE_E6,
      "devnet",
      "small",
    );

    expect(sig).toBeTruthy();
    console.log(`Oracle price pushed: ${sig}`);
  }, 60_000);

  // ── Crank ───────────────────────────────────────────────────────────

  it("should run keeper crank", async () => {
    await delay();

    const sig = await adapter.crank(slabAddress, "devnet", "small");

    expect(sig).toBeTruthy();
    console.log(`Crank executed: ${sig}`);
  }, 60_000);

  // ── Trade (Open Long) ──────────────────────────────────────────────

  it("should open a long position", async () => {
    await delay();

    try {
      const sig = await adapter.trade({
        slabAddress,
        userIdx,
        lpIdx,
        size: TRADE_SIZE,
        network: "devnet",
      });
      expect(sig).toBeTruthy();
      console.log(`Long opened (size=${TRADE_SIZE}): ${sig}`);
    } catch (e: any) {
      // On failure, simulate with full logs for debugging
      console.log("Trade failed, running simulation for full logs...");
      const connection = getDevnetConnection();
      const wallet = getWallet();
      const { PercolatorAdapter: PA } = await import("../src/dex/percolator/adapter");
      const {
        encodeTradeCpi, encodeKeeperCrank,
        ACCOUNTS_TRADE_CPI, ACCOUNTS_KEEPER_CRANK,
        buildAccountMetas, buildIx, deriveLpPda,
        fetchSlab, parseAccount, parseConfig, parseEngine,
      } = await import("../src/dex/percolator/core");
      const { getProgramId } = await import("../src/dex/percolator/core/config/program-ids");

      const slab = new PublicKey(slabAddress);
      const programId = getProgramId("devnet", "small");
      const slabData = await fetchSlab(connection, slab);
      const engine = parseEngine(slabData);
      const lp = parseAccount(slabData, lpIdx);
      const user = parseAccount(slabData, userIdx);
      const config = parseConfig(slabData);

      console.log("=== Engine State ===");
      console.log(`  vault=${engine.vault} cTot=${engine.cTot} insurance=${engine.insuranceFund.balance}`);
      console.log(`  fundingIndex=${engine.fundingIndexQpbE6} lastCrankSlot=${engine.lastCrankSlot}`);
      console.log(`  lastSweepStartSlot=${engine.lastSweepStartSlot}`);
      console.log(`  pnlPosTot=${engine.pnlPosTot} numUsed=${engine.numUsedAccounts}`);
      console.log(`  LP: cap=${lp.capital} pos=${lp.positionSize} entry=${lp.entryPrice} fi=${lp.fundingIndex} feeSlot=${lp.lastFeeSlot} feeCredits=${lp.feeCredits}`);
      console.log(`  User: cap=${user.capital} pos=${user.positionSize} entry=${user.entryPrice} fi=${user.fundingIndex} feeSlot=${user.lastFeeSlot} feeCredits=${user.feeCredits}`);
      console.log(`  Config: price=${config.lastEffectivePriceE6} oracleCapE2bps=${config.oraclePriceCapE2bps}`);

      // Build same TX for simulation
      const [lpPda] = deriveLpPda(programId, slab, lpIdx);
      const crankIx = buildIx({
        programId,
        keys: buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
          wallet.publicKey, slab, SYSVAR_CLOCK_PUBKEY, slab,
        ]),
        data: encodeKeeperCrank({ callerIdx: 65535, allowPanic: false }),
      });
      const { ComputeBudgetProgram: CBP } = await import("@solana/web3.js");
      const tradeIx = buildIx({
        programId,
        keys: buildAccountMetas(ACCOUNTS_TRADE_CPI, [
          wallet.publicKey,
          new PublicKey(lp.owner),
          slab,
          SYSVAR_CLOCK_PUBKEY,
          slab,
          new PublicKey(lp.matcherProgram),
          new PublicKey(lp.matcherContext),
          lpPda,
        ]),
        data: encodeTradeCpi({ lpIdx, userIdx, size: TRADE_SIZE }),
      });

      const tx = new Transaction();
      tx.add(CBP.setComputeUnitLimit({ units: 400_000 }));
      tx.add(crankIx);
      tx.add(tradeIx);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      const sim = await connection.simulateTransaction(tx, [wallet]);
      console.log("=== Full Simulation Logs ===");
      for (const log of sim.value.logs ?? []) {
        console.log(`  ${log}`);
      }
      console.log(`Error: ${JSON.stringify(sim.value.err)}`);

      throw e; // re-throw to fail the test
    }
  }, 120_000);

  // ── Read Market State ──────────────────────────────────────────────

  it("should read market state", async () => {
    await delay(1000);

    const state = await adapter.getMarketState(slabAddress, "devnet");

    expect(state.slabAddress).toBe(slabAddress);
    expect(state.header).toBeDefined();
    expect(state.config).toBeDefined();
    expect(state.engine).toBeDefined();
    expect(state.params).toBeDefined();
    expect(state.accounts.length).toBeGreaterThan(0);

    console.log(`Market state:`);
    console.log(`  Accounts: ${state.accounts.length}`);
    console.log(`  Total OI: ${state.engine.totalOpenInterest}`);
    console.log(`  Net LP pos: ${state.engine.netLpPos}`);
    console.log(`  Vault: ${state.engine.vault}`);
  }, 30_000);

  // ── Read Position ──────────────────────────────────────────────────

  it("should find my position", async () => {
    const pos = await adapter.getMyPosition(slabAddress, "devnet");

    expect(pos).not.toBeNull();
    expect(BigInt(pos!.account.positionSize)).toBe(TRADE_SIZE);

    console.log(`Position:`);
    console.log(`  Index: ${pos!.idx}`);
    console.log(`  Size: ${pos!.account.positionSize}`);
    console.log(`  Capital: ${pos!.account.capital}`);
    console.log(`  PnL: ${pos!.account.pnl}`);
    console.log(`  Entry price: ${pos!.account.entryPrice}`);
  }, 30_000);

  // ── Trade (Close Position) ─────────────────────────────────────────

  it("should close the position", async () => {
    await delay();

    // Close by trading opposite direction with same size
    const sig = await adapter.trade({
      slabAddress,
      userIdx,
      lpIdx,
      size: -TRADE_SIZE,
      network: "devnet",
    });

    expect(sig).toBeTruthy();
    console.log(`Position closed: ${sig}`);
  }, 60_000);

  // ── Verify Flat ────────────────────────────────────────────────────

  it("should be flat after closing", async () => {
    await delay(1000);

    const pos = await adapter.getMyPosition(slabAddress, "devnet");

    expect(pos).not.toBeNull();
    expect(pos!.account.positionSize).toBe(0n);

    console.log(`Position after close: size=${pos!.account.positionSize}, capital=${pos!.account.capital}`);
  }, 30_000);

  // ── Withdraw ───────────────────────────────────────────────────────

  it("should withdraw collateral", async () => {
    await delay();

    // Read actual remaining capital (trading fees reduce it below deposit)
    const pos = await adapter.getMyPosition(slabAddress, "devnet");
    expect(pos).not.toBeNull();
    const availableCapital = BigInt(pos!.account.capital);
    // Withdraw most of it (leave small buffer for rounding)
    const withdrawAmount = availableCapital - 1_000n;
    expect(withdrawAmount).toBeGreaterThan(0n);

    const sig = await adapter.withdraw(
      slabAddress,
      userIdx,
      withdrawAmount,
      "devnet",
      "small",
    );

    expect(sig).toBeTruthy();
    console.log(`Withdrew ${Number(withdrawAmount)} lamports (of ${Number(availableCapital)} available): ${sig}`);
  }, 60_000);

  // ── Close Account ──────────────────────────────────────────────────

  it("should close the trader account", async () => {
    await delay();

    // Withdraw remaining first
    const pos = await adapter.getMyPosition(slabAddress, "devnet");
    if (pos && pos.account.capital > 0n) {
      await adapter.withdraw(slabAddress, userIdx, pos.account.capital, "devnet", "small");
      await delay();
    }

    const sig = await adapter.closeAccount(slabAddress, userIdx, "devnet", "small");

    expect(sig).toBeTruthy();
    console.log(`Account closed: ${sig}`);
  }, 60_000);

  // ── Discover Markets ───────────────────────────────────────────────

  it("should discover markets on devnet", async () => {
    const markets = await adapter.discoverMarkets("devnet");

    // Should find at least the market we just created
    expect(markets.length).toBeGreaterThan(0);

    const ours = markets.find((m) => m.slabAddress.toBase58() === slabAddress);
    expect(ours).toBeDefined();

    console.log(`Discovered ${markets.length} markets on devnet`);
    console.log(`Our market found: ${!!ours}`);
  }, 60_000);
});
