import { NATIVE_MINT, getOrCreateAssociatedTokenAccount, createCloseAccountInstruction } from "@solana/spl-token";
import { wallet, connection } from "./config";
import { Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from "@solana/web3.js";
import { program } from "commander";
import { logger } from "./logger";
program
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      logger.info(
        "ts-node unwrap_sol.js"
      );
      process.exit(0);
    }
  });
program.parse();
export async function unwrapSol(){
        // wSol ATA
        const wSolAta = await getOrCreateAssociatedTokenAccount(connection, wallet, NATIVE_MINT, wallet.publicKey);
    
        // close wSol account instruction
        const transaction = new Transaction;
        transaction.add(
            createCloseAccountInstruction(
              wSolAta.address,
              wallet.publicKey,
              wallet.publicKey
            )
        );
    
        // submit transaction
        const txSignature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    
        // validate transaction was successful
        try {
            const latestBlockhash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                signature: txSignature,
            }, 'confirmed');
        } catch (error) {
            console.log(`Error unwrapping sol: ${error}`);
        };
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const new_sol_balance = await connection.getBalance(wallet.publicKey);
        console.log(`new sol balance: ${new_sol_balance/LAMPORTS_PER_SOL}`);
        return txSignature;
}


async function main(){
    await unwrapSol();
}

main();