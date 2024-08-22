const {
  createTraderAPIMemoInstruction,
  HttpProvider,
  MAINNET_API_UK_HTTP,
  MAINNET_API_NY_HTTP,
} = require("@bloxroute/solana-trader-client-ts");
const { private_key, bloXRoute_auth_header, bloXroute_fee } = require("../helpers/config");
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
  MAINNET_API_UK_HTTP // or MAINNET_API_NY_HTTP
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
  const memo = createTraderAPIMemoInstruction(
    "Powered by bloXroute Trader Api"
  ); // why not use empty string? see https://docs.bloxroute.com/solana/trader-api-v2/achieve-best-performance-for-landing-a-transaction
  const wallet = Keypair.fromSecretKey(base58.decode(private_key));
  const recentBlockhash = await provider.getRecentBlockHash({});
  let tx = new Transaction({
    recentBlockhash: recentBlockhash.blockHash,
    feePayer: wallet.publicKey,
  });
  tx.add(transaction);
  tx.add(memo);
  tx.add(
    await CreateTraderAPITipTransaction(
      wallet.publicKey,
      bloXroute_fee * LAMPORTS_PER_SOL
    )
  ); // why 0.001 SOL?
  tx.sign(wallet);
  const serializeTxBytes = tx.serialize();
  const buffTx = Buffer.from(serializeTxBytes);
  const encodedTx = buffTx.toString("base64");
  console.log("Submitting transaction to bloXroute...");

  const response = await provider.postSubmit({
    transaction: { content: encodedTx, isCleanup: false },
    frontRunningProtection: false,
    useStakedRPCs: true, // comment this line if you don't want to directly send txn to current blockleader
  });
  /**
   * For better performance,
   * you could include a high enough tip and set useStakedRPCs to True
   * await provider.postSubmit({
   * transaction: { content: encodedTxn, isCleanup: false },
   * frontRunningProtection: false,
   * useStakedRPCs: true,
   * });
   */

  if (response.signature) {
    console.log(
      `✅ txn landed successfully\nSignature: https://solscan.io/tx/${response.signature}`
    );
  } else {
    console.log("❌ Transaction failed");
  }
}

module.exports = { bloXroute_executeAndConfirm };
