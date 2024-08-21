const { NATIVE_MINT, getOrCreateAssociatedTokenAccount, createCloseAccountInstruction } = require("@solana/spl-token");
const { wallet, connection } = require("./config");
const { Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require("@solana/web3.js");
const { program } = require("commander");
program
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node unwrap_sol.js"
      );
      process.exit(0);
    }
  });
program.parse();
async function unwrapSol(){
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