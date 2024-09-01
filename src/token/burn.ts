import fs from "fs";
import {
  Connection,
  PublicKey,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { program } from "commander";
import {
  getAccount,
  getMint,
  getAssociatedTokenAddress,
  createBurnCheckedInstruction,
} from "@solana/spl-token";
import { connection, dev_connection } from "../helpers/config";
import { wallet } from "../helpers/config";
import { logger } from "../helpers/logger";

let payer_keypair_path = null,
  token_address:any = null,
  percentage:any = null,
  decimals = null,
  cluster = null,
  payerKeypair = null,
  newConnection:any = null;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--token_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--percentage <BURN_PERCENTAGE>", "Specify the percentage to burn")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      logger.info(
        "ts-node burn --payer <PATH_TO_SECRET_KEY> --token_address <ADDRESS_TOKEN> --percentage <BURN_PERCENTAGE> --cluster <CLUSTER>"
      );
      process.exit(0);
    }
    if (!options.token_address || !options.cluster || !options.percentage) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    if (options.payer) {
      payer_keypair_path = options.payer;
    }
    token_address = new PublicKey(options.token_address);
    percentage = options.percentage;
    cluster = options.cluster;
  });
program.parse();
if (cluster === "devnet") {
  newConnection = dev_connection;
} else if (cluster === "mainnet") {
  newConnection = connection;
}
/**
 * Loads or creates a keypair from the specified file path.
 * @param {string} filepath - The path to the keypair file.
 * @returns {Uint8Array} - The loaded or created keypair.
 */
export function loadOrCreateKeypair(filepath:string) {
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
/**
 * Retrieves the token balance for a given token account.
 * @param {PublicKey} tokenAccount - The token account address.
 * @returns {number} The token balance.
 */
export async function getTokenBalance(tokenAccount:PublicKey) {
  const info = await getAccount(newConnection, tokenAccount); // token account right here
  const amount = Number(info.amount);
  const mint = await getMint(newConnection, info.mint);
  const decimals = mint.decimals;
  const balance = amount / 10 ** decimals;
  return balance;
}

/**
 * Retrieves the decimal value of a token.
 * @param {PublicKey} tokenAddress - The address of the token.
 * @returns {Promise<number>} The decimal value of the token.
 */
export async function getTokenDecimal(tokenAddress:PublicKey) {
  const mint = await getMint(newConnection, tokenAddress);
  return mint.decimals;
}
/**
 * Burns a specified percentage of tokens from a given token address.
 * @param {PublicKey} tokenAddress - The address of the token to burn.
 * @param {object} payer - The payer's public key and associated token address.
 * @param {number} percentage - The percentage of tokens to burn.
 * @returns {Promise<void>} - A promise that resolves when the burning process is complete.
 */
export async function burnToken(tokenAddress:PublicKey, payer:Keypair, percentage:number) {
  try {
    decimals = await getTokenDecimal(tokenAddress);
    console.log("Decimals: ", decimals);
    const account = await getAssociatedTokenAddress(
      tokenAddress,
      payer.publicKey
    );
    const amtToBurn = Math.floor(
      (await getTokenBalance(account)) * (percentage / 100)
    );
    console.log("Will burn: ", amtToBurn);
    // 1: fetch token account
    // 2: create burn instruction
    const burnInstruction = createBurnCheckedInstruction(
      account,
      tokenAddress,
      payer.publicKey,
      amtToBurn * 10 ** decimals,
      decimals
    );
    // 3: fetch the latest blockhash
    const { blockhash, lastValidBlockHeight } =
      await newConnection.getLatestBlockhash("finalized");
    // 4: assemble the transaction
    const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions: [burnInstruction],
    }).compileToV0Message();
    const transaction = new VersionedTransaction(messageV0);
    // 5: sign the transaction
    transaction.sign([payer]);
    console.log("🔥 Burning Token...");
    // 6: execute and confirm the transaction (sending to Solana blockchain)
    const txid = await newConnection.sendTransaction(transaction);
    const confirmation = await newConnection.confirmTransaction({
      signature: txid,
      blockhash,
      lastValidBlockHeight,
    });
    if (confirmation.value.err) {
      console.error("❌ Transaction failed");
      process.exit(1);
    }
    console.log(
      "✅ Transaction confirmed, https://explorer.solana.com/tx/" + txid
    );
  } catch (e) {
    console.log(e);
    console.log("❌ Burn failed");
    console.log("Maybe the network is congested, trying again...");
    burnToken(tokenAddress, payer, percentage);
  }
}

if (payer_keypair_path) {
  payerKeypair = Keypair.fromSecretKey(loadOrCreateKeypair(payer_keypair_path));
} else {
  payerKeypair = Keypair.fromSecretKey(wallet.secretKey);
}

burnToken(token_address, payerKeypair, percentage);
