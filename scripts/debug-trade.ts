/**
 * Debug script: simulate a TradeCpi transaction and dump all program logs.
 * Usage: npx ts-node scripts/debug-trade.ts <slabAddress>
 */
import { Connection, PublicKey, Transaction, ComputeBudgetProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { getWallet } from "../src/helpers/config";
import { dev_connection } from "../src/helpers/config";
import {
  encodeTradeCpi,
  encodeKeeperCrank,
  ACCOUNTS_TRADE_CPI,
  ACCOUNTS_KEEPER_CRANK,
  buildAccountMetas,
  buildIx,
  deriveLpPda,
  fetchSlab,
  parseAccount,
  parseConfig,
  parseEngineState,
} from "../src/dex/percolator/core";
import { getProgramId, getMatcherProgramId } from "../src/dex/percolator/adapter";

async function main() {
  const wallet = getWallet();
  const connection = dev_connection!;
  const slabAddress = process.argv[2];
  if (!slabAddress) {
    console.error("Usage: npx ts-node scripts/debug-trade.ts <slabAddress>");
    process.exit(1);
  }
  const slab = new PublicKey(slabAddress);
  const programId = getProgramId("devnet", "small");
  const matcherProgramId = getMatcherProgramId("devnet");

  // Read slab state
  const slabData = await fetchSlab(connection, slab);
  const config = parseConfig(slabData);
  const engine = parseEngineState(slabData);
  const lpAccount = parseAccount(slabData, 0);
  const userAccount = parseAccount(slabData, 1);
  const [lpPda] = deriveLpPda(programId, slab, 0);

  console.log("=== Slab State ===");
  console.log(`  Price: ${config.lastEffectivePriceE6}`);
  console.log(`  Vault: ${engine.vault}`);
  console.log(`  Insurance: ${engine.insuranceFundBalance}`);
  console.log(`  c_tot: ${engine.cTot}`);
  console.log(`  pnl_pos_tot: ${engine.pnlPosTot}`);
  console.log(`  funding_index: ${engine.fundingIndexQpbE6}`);
  console.log(`  last_crank_slot: ${engine.lastCrankSlot}`);
  console.log(`  last_full_sweep_start_slot: ${engine.lastFullSweepStartSlot}`);
  console.log(`  num_used_accounts: ${engine.numUsedAccounts}`);
  console.log(`  LP: kind=${lpAccount.kind} cap=${lpAccount.capital} pos=${lpAccount.positionSize} entry=${lpAccount.entryPrice} fi=${lpAccount.fundingIndex} feeSlot=${lpAccount.lastFeeSlot}`);
  console.log(`  User: kind=${userAccount.kind} cap=${userAccount.capital} pos=${userAccount.positionSize} entry=${userAccount.entryPrice} fi=${userAccount.fundingIndex} feeSlot=${userAccount.lastFeeSlot}`);
  console.log(`  LP PDA: ${lpPda.toBase58()}`);
  console.log(`  LP matcherProg: ${new PublicKey(lpAccount.matcherProgram).toBase58()}`);
  console.log(`  LP matcherCtx: ${new PublicKey(lpAccount.matcherContext).toBase58()}`);

  // Build trade TX
  const crankIx = buildIx({
    programId,
    keys: buildAccountMetas(ACCOUNTS_KEEPER_CRANK, [
      wallet.publicKey, slab, SYSVAR_CLOCK_PUBKEY, slab,
    ]),
    data: encodeKeeperCrank({ callerIdx: 65535, allowPanic: false }),
  });

  const tradeIx = buildIx({
    programId,
    keys: buildAccountMetas(ACCOUNTS_TRADE_CPI, [
      wallet.publicKey,
      new PublicKey(lpAccount.owner),
      slab,
      SYSVAR_CLOCK_PUBKEY,
      slab,
      new PublicKey(lpAccount.matcherProgram),
      new PublicKey(lpAccount.matcherContext),
      lpPda,
    ]),
    data: encodeTradeCpi({ lpIdx: 0, userIdx: 1, size: 1n }),
  });

  const tx = new Transaction();
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  tx.add(crankIx);
  tx.add(tradeIx);

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;

  // Simulate and get all logs
  const sim = await connection.simulateTransaction(tx, [wallet]);
  console.log("\n=== Simulation Result ===");
  console.log(`  Error: ${JSON.stringify(sim.value.err)}`);
  console.log(`  Logs:`);
  for (const log of sim.value.logs ?? []) {
    console.log(`    ${log}`);
  }
}

main().catch(console.error);
