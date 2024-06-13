const {
  BlockhashWithExpiryBlockHeight,
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
} = require("@solana/web3.js");
const { connection } = require("../helpers/config.js");
async function simple_executeAndConfirm(transaction, payer, lastestBlockhash) {
  console.log("Executing transaction...");
  const signature = await simple_execute(transaction);
  console.log("Transaction executed. Confirming transaction...");
  return simple_confirm(signature, lastestBlockhash);
}

async function simple_execute(transaction) {
  return connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: true,
    maxRetries: 0,
  });
}

async function simple_confirm(signature, latestBlockhash) {
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    },
    connection.commitment
  );
  return { confirmed: !confirmation.value.err, signature };
}

module.exports = { simple_executeAndConfirm };
