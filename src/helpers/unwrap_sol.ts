import { NATIVE_MINT, getOrCreateAssociatedTokenAccount, createCloseAccountInstruction } from "@solana/spl-token";
import { getWallet, getConnection, jito_fee } from "./config";
import { Transaction, LAMPORTS_PER_SOL, TransactionMessage, ComputeBudgetProgram, VersionedTransaction } from "@solana/web3.js";
import { jito_executeAndConfirm } from "../transactions/jito_tips_tx_executor";

export async function unwrapSol(): Promise<void> {
  const wallet = getWallet();
  const connection = getConnection();

  // wSol ATA
  const wSolAta = await getOrCreateAssociatedTokenAccount(connection, wallet, NATIVE_MINT, wallet.publicKey);

  // close wSol account instruction
  const transaction = new Transaction();
  transaction.add(
    createCloseAccountInstruction(
      wSolAta.address,
      wallet.publicKey,
      wallet.publicKey
    )
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
  const new_sol_balance = await connection.getBalance(wallet.publicKey);
  console.log(`new sol balance: ${new_sol_balance / LAMPORTS_PER_SOL}`);
}

// CLI entry point -- only runs when executed directly
if (require.main === module) {
  const { program } = require("commander");
  const { logger } = require("./logger");

  program
    .option("-h, --help", "display help for command")
    .action(async (options: any) => {
      if (options.help) {
        logger.info("ts-node src/helpers/unwrap_sol.ts");
        process.exit(0);
      }
      await unwrapSol();
    });

  program.parse();
}
