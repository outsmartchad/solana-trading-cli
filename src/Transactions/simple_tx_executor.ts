const {
  BlockhashWithExpiryBlockHeight,
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
} = require("@solana/web3.js");
const { connection } = require("../helpers/config.js");

/**
 * Executes a transaction and confirms it on the Solana blockchain.
 * @param {Transaction} transaction - The transaction to be executed.
 * @param {Account} payer - The account that will pay for the transaction fees.
 * @param {string} lastestBlockhash - The latest blockhash of the Solana blockchain.
 * @returns {Promise<boolean>} - A promise that resolves to true if the transaction is confirmed, false otherwise.
 */
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
