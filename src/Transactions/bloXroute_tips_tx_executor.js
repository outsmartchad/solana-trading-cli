const {
  createTraderAPIMemoInstruction,
  HttpProvider,
  MAINNET_API_UK_HTTP,
} = require("@bloxroute/solana-trader-client-ts");
const { private_key, bloXRoute_auth_header } = require("../helpers/config");
const {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
  SystemProgram,
} = require("@solana/web3.js");
const base58 = require("bs58");
const { Transaction } = require("@solana/web3.js");
const TRADER_API_TIP_WALLET = "HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY";
const provider = new HttpProvider(
  bloXRoute_auth_header,
  private_key,
  MAINNET_API_UK_HTTP
);
async function CreateTraderAPITipTransaction(
  senderAddress,
  tipAmountInLamports
) {
  const tipAddress = new PublicKey(TRADER_API_TIP_WALLET);
  return new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderAddress,
      toPubkey: tipAddress,
      lamports: tipAmountInLamports,
    })
  );
}
async function bloXroute_executeAndConfirm(transaction, signers) {
  const memo = createTraderAPIMemoInstruction("");
  const wallet = Keypair.fromSecretKey(base58.decode(private_key));
  const recentBlockhash = await provider.getRecentBlockHash({});
  let tx = new Transaction({
    recentBlockhash: recentBlockhash.blockHash,
    feePayer: wallet.publicKey,
  });
  tx.add(transaction);
  tx.add(memo);
  tx.add(await CreateTraderAPITipTransaction(wallet.publicKey, 0.001 * LAMPORTS_PER_SOL));
  tx.sign(wallet);
  const serializeTxBytes = tx.serialize();
  const buffTx = Buffer.from(serializeTxBytes);
  const encodedTx = buffTx.toString("base64");
  console.log("Submitting transaction to bloXroute...");
  const response = await provider.postSubmit({
    transaction: { content: encodedTx, isCleanup: false },
    skipPreFlight: false,
  });

  if (response.signature) {
    console.log(
      `✅ txn landed successfully\nSignature: https://solscan.io/tx/${response.signature}`
    );
  } else {
    console.log("❌ Transaction failed");
  }
}

module.exports = { bloXroute_executeAndConfirm };
