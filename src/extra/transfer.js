const fs = require("fs");
const {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} = require("@solana/spl-token");
const {
  Connection,
  Keypair,
  ParsedAccountData,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} = require("@solana/web3.js");
const { Metaplex } = require("@metaplex-foundation/js");
const { program } = require("commander");
const { connection } = require("../Pool/config");
let payer_keypair_path = null,
  token_address = null,
  amount = null,
  destination = null,
  cluster = null;
// 4. node transfer --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --amount <AMOUNT> --destination <RECEIVE_ADDRESS>
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--amount <AMOUNT>", "Specify the amount to transfer")
  .option("--destination <RECEIVE_ADDRESS>", "Specify the destination address")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .action((options) => {
    if (
      !options.payer ||
      !options.token_address ||
      !options.amount ||
      !options.destination ||
      !options.cluster
    ) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    payer_keypair_path = options.payer;
    token_address = new PublicKey(options.token_address);
    amount = options.amount;
    destination = new PublicKey(options.destination);
    cluster = options.cluster;
    if (cluster === "devnet") {
      connection = new Connection(DEV_RPC_KEY, "confirmed");
    } else if (cluster === "mainnet") {
      connection = new Connection(MAIN_RPC_KEY, "confirmed");
    }
  });
program.parse();
const payerKeypair = Keypair.fromSecretKey(
  loadOrCreateKeypair(payer_keypair_path)
);

function loadOrCreateKeypair(filepath) {
  try {
    const keypairStringArr = fs.readFileSync(filepath, {
      encoding: "utf8",
    });
    const res = Uint8Array.from(JSON.parse(keypairStringArr));
    return res;
  } catch (error) {
    console.log(error);
    console.log(`File ${filepath} not Found!`);
    process.exit(1);
  }
}

async function getDecimals(mintAddress) {
  const info = await connection.getParsedAccountInfo(mintAddress);
  const result = (info.value?.data).parsed.info.decimals || 0;
  return result;
}
async function getTokenMetadata(Address) {
  const metaplex = Metaplex.make(connection);

  const mintAddress = new PublicKey(Address);

  let tokenName;
  let tokenSymbol;
  let tokenLogo;

  const metadataAccount = metaplex
    .nfts()
    .pdas()
    .metadata({ mint: mintAddress });

  const metadataAccountInfo = await connection.getAccountInfo(metadataAccount);

  if (metadataAccountInfo) {
    const token = await metaplex
      .nfts()
      .findByMint({ mintAddress: mintAddress });
    tokenName = token.name;
    tokenSymbol = token.symbol;
    console.log(tokenName);
    console.log(tokenSymbol);
    tokenLogo = token.json.image;
  }
}
/**
 * Transfers tokens from one account to another.
 * @returns {Promise<void>} A promise that resolves when the transfer is complete.
 * @throws {Error} If the transfer fails.
 */
async function transfer() {
  try {
    // 1: get source token account
    let sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      token_address,
      payerKeypair.publicKey
    );
    // 2: getting dest token account
    let destTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      token_address,
      destination
    );
    // 3: fetch the decimals of the token
    const decimals = await getDecimals(token_address);
    // 4: create and sending transfer instruction
    const tx = new Transaction();
    const creat_transfer_instruction = createTransferInstruction(
      sourceTokenAccount.address,
      destTokenAccount.address,
      payerKeypair.publicKey,
      amount * 10 ** decimals
    );
    tx.add(creat_transfer_instruction);
    // 5. fetch latest blockhash
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = await latestBlockhash.blockhash;
    const signature = await sendAndConfirmTransaction(connection, tx, [
      payerKeypair,
    ]);
    console.log(
      "congrats! transfer done, https://explorer.solana.com/tx/" + signature
    );
  } catch (e) {
    console.log(e);
    console.log("❌ Transfer failed");
    console.log("Maybe the network is congested, trying again...");
    transfer();
  }
}

transfer().catch((err) => {
  console.error(err);
  process.exit(1);
});
