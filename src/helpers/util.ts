import {
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
  buildSimpleTransaction,
} from "@raydium-io/raydium-sdk";
import { PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
import {
  addLookupTableInfo,
  getConnection,
  getWallet,
  makeTxVersion,
  DEFAULT_SLIPPAGE_BPS,
} from "./config";
import { Metaplex } from "@metaplex-foundation/js";
import fs from "fs";
import {
  Connection,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";

/**
 * Retrieves the metadata of a token based on its address.
 */
export async function getTokenMetadata(address: string) {
  const connection = getConnection();
  const metaplex = Metaplex.make(connection);
  const mintAddress = new PublicKey(address);

  let tokenName: string | undefined;
  let tokenSymbol: string | undefined;

  const metadataAccount = metaplex.nfts().pdas().metadata({ mint: mintAddress });
  const metadataAccountInfo = await connection.getAccountInfo(metadataAccount);

  if (metadataAccountInfo) {
    const token = await metaplex.nfts().findByMint({ mintAddress });
    tokenName = token.name;
    tokenSymbol = token.symbol;
  }
  return { tokenName, tokenSymbol };
}

/**
 * Sends multiple transactions to the Solana blockchain.
 */
export async function sendTx(
  connection: Connection,
  payer: Keypair,
  txs: (VersionedTransaction | any)[],
  options?: { skipPreflight?: boolean; maxRetries?: number }
): Promise<string[]> {
  const txids: string[] = [];
  for (const iTx of txs) {
    try {
      if (iTx instanceof VersionedTransaction) {
        iTx.sign([payer]);
        txids.push(await connection.sendRawTransaction(iTx.serialize(), options));
      } else {
        txids.push(await connection.sendTransaction(iTx, [payer], options));
      }
    } catch (e) {
      console.error("sendTx error on transaction:", e);
      // Continue with remaining transactions but surface the error
      throw e;
    }
  }
  return txids;
}

/**
 * Retrieves the token account associated with a wallet.
 */
export async function getWalletTokenAccount(localconnection: Connection, localwallet: PublicKey) {
  const walletTokenAccount = await localconnection.getTokenAccountsByOwner(localwallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

/**
 * Builds and sends a transaction with configurable compute budget.
 */
export async function buildAndSendTx(
  innerSimpleV0Transaction: any[],
  options?: { skipPreflight?: boolean; maxRetries?: number },
  computeUnits: number = 101337,
  priorityFeeMicroLamports: number = 421197
): Promise<string[] | undefined> {
  const connection = getConnection();
  const wallet = getWallet();
  try {
    const recentBlockhash = await connection.getLatestBlockhash("confirmed");
    const priority_fee_arr = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFeeMicroLamports }),
    ];
    const original_inner_instructions = innerSimpleV0Transaction[0].instructions;
    innerSimpleV0Transaction[0].instructions = [...priority_fee_arr, ...original_inner_instructions];

    const willSendTx = await buildSimpleTransaction({
      connection,
      makeTxVersion,
      payer: wallet.publicKey,
      innerTransactions: innerSimpleV0Transaction,
      addLookupTableInfo,
    });

    return await sendTx(connection, wallet, willSendTx, options);
  } catch (e) {
    console.error("buildAndSendTx error:", e);
    return undefined;
  }
}

/**
 * Sleeps for a specified amount of time.
 */
export async function sleepTime(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads or creates a Solana keypair from a file.
 */
export async function loadOrCreateKeypair_wallet(filepath: string): Promise<Keypair> {
  try {
    const keypairString = fs.readFileSync(filepath, { encoding: "utf8" });
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairString)));
  } catch (error) {
    const newKeypair = Keypair.generate();
    fs.writeFileSync(filepath, JSON.stringify(Array.from(newKeypair.secretKey)), { mode: 0o600 });
    console.log(`New keypair created and saved to ${filepath}`);
    return newKeypair;
  }
}

export async function isBlockhashExpired(lastValidBlockHeight: number): Promise<boolean> {
  const connection = getConnection();
  const currentBlockHeight = await connection.getBlockHeight("finalized");
  return currentBlockHeight > lastValidBlockHeight - 150;
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Polls transaction status until confirmed or blockhash expires.
 */
export async function checkTx(txId: string): Promise<boolean> {
  const connection = getConnection();
  const blockhashResponse = await connection.getLatestBlockhashAndContext("finalized");
  const lastValidHeight = blockhashResponse.value.lastValidBlockHeight;

  let hashExpired = false;
  let txSuccess = false;
  const maxPolls = 60;
  let polls = 0;

  while (!hashExpired && !txSuccess && polls < maxPolls) {
    polls++;
    const { value: status } = await connection.getSignatureStatus(txId);

    if (
      status &&
      (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")
    ) {
      txSuccess = true;
      console.log(`Transaction confirmed.`);
      return true;
    }

    hashExpired = await isBlockhashExpired(lastValidHeight);

    if (hashExpired) {
      console.log(`Blockhash has expired.`);
      return false;
    }

    await sleep(2500);
  }

  if (polls >= maxPolls) {
    console.log(`Transaction status polling timed out after ${maxPolls} attempts.`);
  }
  return false;
}

/**
 * Gets the decimals for a given SPL token mint.
 */
export async function getDecimals(mintAddress: PublicKey): Promise<number> {
  const connection = getConnection();
  const info = await connection.getParsedAccountInfo(mintAddress);
  if (!info.value || !info.value.data) {
    throw new Error(`Could not find mint account: ${mintAddress.toBase58()}`);
  }
  const parsed = info.value.data as any;
  if (!parsed.parsed?.info?.decimals && parsed.parsed?.info?.decimals !== 0) {
    throw new Error(`Could not parse decimals for mint: ${mintAddress.toBase58()}`);
  }
  return parsed.parsed.info.decimals;
}
