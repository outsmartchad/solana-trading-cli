import { NATIVE_MINT, getOrCreateAssociatedTokenAccount, createSyncNativeInstruction,  } from "@solana/spl-token";
import { wallet, connection } from "./config";
import { Transaction, SystemProgram, LAMPORTS_PER_SOL,  sendAndConfirmTransaction } from "@solana/web3.js";
import {getSPLTokenBalance} from "./check_balance";
import { program } from "commander";
import { logger } from "./logger";
let wrap_size = 0;
program
  .option("-s, --size <size>", "size of sol to wrap")
  .option("-h, --help", "display help for command")
  .action((options:any) => {
    if (options.help) {
      logger.info(
        "ts-node wrap_sol.js --size <size>"
      );
      process.exit(0);
    }
    if (!options.size) {
        console.error("❌ Missing required options");
        process.exit(1);
      }
    if (options.size) {
        wrap_size = options.size;
    }
  });
program.parse();
export async function wrap_sol(
    amount:number
){
    // wSol ATA 
    const wSolAta = await getOrCreateAssociatedTokenAccount(connection, wallet, NATIVE_MINT, wallet.publicKey);
    console.log(`wsol ATA: ${wSolAta.address.toBase58()}`);
    // wrap Sol
    let transaction = new Transaction().add(
        // trasnfer SOL
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: wSolAta.address,
          lamports: amount*LAMPORTS_PER_SOL,
        }),
        // sync wrapped SOL balance
        createSyncNativeInstruction(wSolAta.address)
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
        console.log(`Error wrapping sol: ${error}`);
    };
    // await for 3 second
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await check_wsol_balance(wSolAta)

    return txSignature;
}

export async function check_wsol_balance(wSolAta:any){
    const wsolBalance = await getSPLTokenBalance(connection, NATIVE_MINT, wallet.publicKey);
    console.log(`new wsol balance: ${wsolBalance}`);
}

export async function main(){
    await wrap_sol(wrap_size);
    
}
main();