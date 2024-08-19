const {
  LightSystemProgram,
  Rpc,
  confirmTx,
  createRpc,
} = require("@lightprotocol/stateless.js");
const {
  createMint,
  mintTo,
  transfer,
  compressToken,
} = require("@lightprotocol/compressed-token");
const { Keypair } = require("@solana/web3.js");
const { req } = require("pino-std-serializers");

const payer = Keypair.generate();
const tokenRecipient = Keypair.generate();

const connection = createRpc();

async function main() {
  console.log("Payer: ", payer.publicKey.toBase58());
  console.log("Token recipient: ", tokenRecipient.publicKey.toBase58());
  await confirmTx(
    connection,
    await connection.requestAirdrop(payer.publicKey, 10e9)
  );
  await confirmTx(
    connection,
    await connection.requestAirdrop(tokenRecipient.publicKey, 1e6)
  );
  const { mint, transactionSignature } = await createMint(
    // create a mint
    connection,
    payer,
    payer.publicKey,
    9
  );
  console.log("Mint created: ", mint.toBase58());
  console.log("create-mint success! Txn signature: ", transactionSignature);

  const mintToTxId = await mintTo(
    // mint to your own account
    connection,
    payer,
    mint,
    payer.publicKey,
    payer,
    1e9
  );
  console.log("mint-to success! Txn signature: ", mintToTxId);

  const transferTxId = await transfer(
    // transfer to another account
    connection,
    payer,
    mint,
    7e8,
    payer,
    tokenRecipient.publicKey
  );
  console.log("transfer success! Txn signature: ", transferTxId);
}

main();
