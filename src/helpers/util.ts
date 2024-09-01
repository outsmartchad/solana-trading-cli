import {
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
  buildSimpleTransaction,
} from "@raydium-io/raydium-sdk";
import { PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import {
  addLookupTableInfo,
  connection,
  makeTxVersion,
  wallet,
} from "./config";
import { Metaplex } from "@metaplex-foundation/js";
import fs from "fs";
import {
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";

/**
 * Retrieves the metadata of a token based on its address.
 * @param {string} address - The address of the token.
 * @returns {Promise<{ tokenName: string, tokenSymbol: string }>} The token metadata, including the token name and symbol.
 */
export async function getTokenMetadata(address:string) {
  const metaplex = Metaplex.make(connection);

  const mintAddress = new PublicKey(address);

  let tokenName;
  let tokenSymbol;

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
  }
  return { tokenName, tokenSymbol };
}
/**
 * Sends multiple transactions to the Solana blockchain.
 * @param {Connection} connection - The Solana connection object.
 * @param {Account} payer - The payer account for signing the transactions.
 * @param {Array<Transaction>} txs - An array of transactions to be sent.
 * @param {TransactionSendOptions} options - The options for sending the transactions.
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of transaction IDs.
 */
export async function sendTx(connection:Connection, payer:Keypair, txs:any, options:any) {
  const txids = [];
  try {
    for (const iTx of txs) {
      if (iTx instanceof VersionedTransaction) {
        iTx.sign([payer]);

        txids.push(
          await connection.sendRawTransaction(iTx.serialize(), options)
        );
      } else {
        txids.push(await connection.sendTransaction(iTx, [payer], options));
      }
    }
  } catch (e) {
    console.log(e);
    return txids;
  }
  return txids;
}

/**
 * Retrieves the token account associated with a wallet.
 * @param {Connection} localconnection - The connection object.
 * @param {Wallet} localwallet - The wallet object.
 * @returns {Array} An array of token account objects.
 */
export async function getWalletTokenAccount(localconnection:Connection, localwallet:PublicKey) {
  const walletTokenAccount = await localconnection.getTokenAccountsByOwner(
    localwallet,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

/**
 * Builds and sends a transaction using the provided innerSimpleV0Transaction and options.
 * @param {Object} innerSimpleV0Transaction - The inner transaction object.
 * @param {Object} options - The options for the transaction.
 * @returns {Promise} - A promise that resolves with the result of the transaction.
 */
export async function buildAndSendTx(innerSimpleV0Transaction:any, options:any) {
  try {
    const recentBlockhash = await connection.getLatestBlockhash("confirmed");
    const priority_fee_arr = [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 101337,
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 421197,
      }),
    ];
    console.log(innerSimpleV0Transaction);
    const original_inner_instructions =
      innerSimpleV0Transaction[0].instructions;
    innerSimpleV0Transaction[0].instructions = [
      ...priority_fee_arr,
      ...original_inner_instructions,
    ];
    console.log("innerSimpleV0Transaction: ", innerSimpleV0Transaction);
    const willSendTx = await buildSimpleTransaction({
      connection: connection,
      makeTxVersion: makeTxVersion,
      payer: wallet.publicKey,
      innerTransactions: innerSimpleV0Transaction,
      addLookupTableInfo: addLookupTableInfo,
    });
    console.log("willSendTx", willSendTx);

    return await sendTx(connection, wallet, willSendTx, options);
  } catch (e) {
    console.log(e);
  }
}

/**
 * Sleeps for a specified amount of time.
 * @param {number} ms - The duration to sleep in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the specified duration.
 */
export async function sleepTime(ms:any) {
  console.log(new Date().toLocaleString(), "sleepTime", ms);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads or creates a Solana keypair from a file.
 * If the file exists, it reads the keypair from the file and returns it.
 * If the file does not exist, it generates a new keypair, saves it to the file, and returns it.
 *
 * @param {string} filepath - The path to the file where the keypair is stored or will be stored.
 * @returns {Promise<Keypair>} The loaded or newly created keypair.
 */
export async function loadOrCreateKeypair_wallet(filepath:string) {
  try {
    const keypairString = fs.readFileSync(filepath, { encoding: "utf8" });
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairString)));
  } catch (error) {
    const newKeypair = Keypair.generate();
    fs.writeFileSync(
      filepath,
      JSON.stringify(Array.from(newKeypair.secretKey))
    );
    console.log(`New keypair created and saved to ${filepath}`);
    return newKeypair;
  }
}
export async function isBlockhashExpired(lastValidBlockHeight:number) {
  let currentBlockHeight = await connection.getBlockHeight("finalized");
  console.log("                           ");
  console.log("Current Block height:             ", currentBlockHeight);
  console.log(
    "Last Valid Block height - 150:     ",
    lastValidBlockHeight - 150
  );
  console.log("--------------------------------------------");
  console.log(
    "Difference:                      ",
    currentBlockHeight - (lastValidBlockHeight - 150)
  ); // If Difference is positive, blockhash has expired.
  console.log("                           ");

  return currentBlockHeight > lastValidBlockHeight - 150;
}
export const sleep = (ms:number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
export async function checkTx(txId:string) {
  const blockhashResponse = await connection.getLatestBlockhashAndContext(
    "finalized"
  );
  const lastValidHeight = blockhashResponse.value.lastValidBlockHeight;
  console.log("Last Valid Height: ", lastValidHeight);
  const START_TIME = new Date();
  // Check transaction status and blockhash status until the transaction succeeds or blockhash expires
  let hashExpired = false;
  let txSuccess = false;
  while (!hashExpired && !txSuccess) {
    const { value: status } = await connection.getSignatureStatus(txId);

    // Break loop if transaction has succeeded
    if (
      status &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      txSuccess = true;
      const endTime = new Date();
      const elapsed = (endTime.getTime() - START_TIME.getTime()) / 1000;
      console.log(`Transaction Success. Elapsed time: ${elapsed} seconds.`);
      return true;
    }

    hashExpired = await isBlockhashExpired(lastValidHeight);

    // Break loop if blockhash has expired
    if (hashExpired) {
      const endTime = new Date();
      const elapsed = (endTime.getTime() - START_TIME.getTime()) / 1000;
      console.log(`Blockhash has expired. Elapsed time: ${elapsed} seconds.`);
      return false;
    }

    // Check again after 2.5 sec
    await sleep(2500);
  }
}

export async function getDecimals(mintAddress: PublicKey): Promise<number> {
  const info: any = await connection.getParsedAccountInfo(mintAddress);
  const result = (info.value?.data).parsed.info.decimals || 0;
  return result;
}