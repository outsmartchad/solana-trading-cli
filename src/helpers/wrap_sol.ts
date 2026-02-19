import { NATIVE_MINT, getOrCreateAssociatedTokenAccount, createSyncNativeInstruction } from "@solana/spl-token";
import { getWallet, getConnection, jito_fee } from "./config";
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionMessage, ComputeBudgetProgram, VersionedTransaction } from "@solana/web3.js";
import { getSPLTokenBalance } from "./check_balance";
import { jito_executeAndConfirm } from "../transactions/jito_tips_tx_executor";

export async function wrap_sol(amount: number): Promise<void> {
  const wallet = getWallet();
  const connection = getConnection();

  if (amount <= 0) {
    console.log("Amount must be greater than 0");
    return;
  }

  // wSol ATA
  const wSolAta = await getOrCreateAssociatedTokenAccount(connection, wallet, NATIVE_MINT, wallet.publicKey);
  console.log(`wsol ATA: ${wSolAta.address.toBase58()}`);

  // wrap Sol
  const lamports = Math.round(amount * LAMPORTS_PER_SOL);
  let transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: wSolAta.address,
      lamports,
    }),
    createSyncNativeInstruction(wSolAta.address)
  );

  let latestBlockhash = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 70000 }),
      ...transaction.instructions,
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);
  tx.sign([wallet]);

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const res = await jito_executeAndConfirm(tx, wallet, latestBlockhash, jito_fee);
      const signature = res.signature;

      if (signature) {
        console.log(`Transaction successful: ${signature}`);
        break;
      } else {
        console.log("jito fee transaction failed");
        console.log(`Retry attempt ${attempts}`);
      }
    } catch (e: any) {
      console.log(e);
    }
    latestBlockhash = await connection.getLatestBlockhash();
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
  await check_wsol_balance();
}

export async function check_wsol_balance(): Promise<void> {
  const wallet = getWallet();
  const connection = getConnection();
  const wsolBalance = await getSPLTokenBalance(connection, NATIVE_MINT, wallet.publicKey);
  console.log(`new wsol balance: ${wsolBalance}`);
}

// CLI entry point -- only runs when executed directly
if (require.main === module) {
  const { program } = require("commander");
  const { logger } = require("./logger");

  program
    .option("-s, --size <size>", "size of sol to wrap")
    .option("-h, --help", "display help for command")
    .action(async (options: any) => {
      if (options.help) {
        logger.info("ts-node src/helpers/wrap_sol.ts --size <size>");
        process.exit(0);
      }
      if (!options.size) {
        console.error("Missing required option: --size");
        process.exit(1);
      }
      await wrap_sol(parseFloat(options.size));
    });

  program.parse();
}
