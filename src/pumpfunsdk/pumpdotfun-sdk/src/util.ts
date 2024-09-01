import {
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Finality,
  Keypair,
  PublicKey,
  SendTransactionError,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  VersionedTransactionResponse,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PumpFunSDK, DEFAULT_DECIMALS } from "./pumpfun";
import { PriorityFee, TransactionResult } from "./types";
import { jito_executeAndConfirm } from "../../../transactions/jito_tips_tx_executor";
import fs from "fs";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
export const DEFAULT_COMMITMENT = "finalized";
export const DEFAULT_FINALITY = "finalized";

export const calculateWithSlippageBuy = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount + (amount * basisPoints) / 10000n;
};

export const calculateWithSlippageSell = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount - (amount * basisPoints) / 10000n;
};

function readCSVFile(filePath: string) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data;
  } catch (err) {
    console.error("Error reading the CSV file:", err);
    return null;
  }
}

export async function sendTxToJito(
  connection: Connection,
  tx: any,
  payer: Keypair,
  signers: Keypair[],
  jitofee: any
) {
  const blockhash = await connection.getLatestBlockhash();
  let final_tx = new Transaction();
  final_tx.add(tx);
  let versionedTx = await buildVersionedTx(
    connection,
    payer.publicKey,
    final_tx,
    connection.commitment
  );
  versionedTx.sign(signers);
  try {
    const { confirmed, signature } = await jito_executeAndConfirm(
      versionedTx,
      payer,
      blockhash,
      jitofee
    );
    // let txResult = await getTxDetails(connection, signature, connection.commitment, DEFAULT_FINALITY);
    if (!confirmed) {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
    return {
      success: true,
      signature: signature,
    };
  } catch (e) {
    if (e instanceof SendTransactionError) {
      let ste = e;
    } else {
      console.error(e);
    }
    return {
      error: e,
      success: false,
    };
  }
}

export async function sendTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  priorityFees?: PriorityFee,
  commitment: any = DEFAULT_COMMITMENT,
  finality: any = DEFAULT_FINALITY
): Promise<TransactionResult> {
  let newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }

  newTx.add(tx);

  let versionedTx = await buildVersionedTx(
    connection,
    payer,
    newTx,
    commitment
  );
  versionedTx.sign(signers);

  try {
    const sig = await connection.sendTransaction(versionedTx, {
      skipPreflight: false,
    });
    console.log("sig:", `https://solscan.io/tx/${sig}`);

    let txResult = await getTxDetails(connection, sig, commitment, finality);
    if (!txResult) {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
    return {
      success: true,
      signature: sig,
      results: txResult,
    };
  } catch (e) {
    if (e instanceof SendTransactionError) {
      let ste = e as SendTransactionError;
    } else {
      console.error(e);
    }
    return {
      error: e,
      success: false,
    };
  }
}

export const buildVersionedTx = async (
  connection: Connection,
  payer: PublicKey,
  tx: Transaction,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<VersionedTransaction> => {
  const blockHash = (await connection.getLatestBlockhash(commitment)).blockhash;

  let messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockHash,
    instructions: tx.instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

export const getTxDetails = async (
  connection: Connection,
  sig: string,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransactionResponse | null> => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig,
    },
    commitment
  );

  return connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: finality,
  });
};

export function generateKeysAndAllocateSol(
  targetNumberOfKeys: number,
  targetTotalSol: number
) {
  // Generate private keys
  const keys = [];
  let sum = 0;
  for (let i = 0; i < targetNumberOfKeys; i++) {
    const keypair = Keypair.generate();
    keys.push(bs58.encode(keypair.secretKey));
  }

  // Allocate SOL with randomness
  const averageAllocation = targetTotalSol / targetNumberOfKeys;
  const maxDeviation = averageAllocation * 0.2; // 10% deviation

  const allocations = [];
  let totalAllocated = 0;

  for (let i = 0; i < targetNumberOfKeys - 1; i++) {
    const randomDeviation = (Math.random() * 2 - 1) * maxDeviation;
    const allocation = parseFloat(
      (averageAllocation + randomDeviation).toFixed(10)
    );
    allocations.push({ privateKey: keys[i], sol: allocation });
    sum += allocation + 0.004;
    totalAllocated += allocation;
  }

  // Adjust the last allocation to match the target total precisely
  const lastAllocation = parseFloat(
    (targetTotalSol - totalAllocated).toFixed(10)
  );

  allocations.push({
    privateKey: keys[targetNumberOfKeys - 1],
    sol: lastAllocation,
  });
  console.log("sum", sum);
  return allocations;
}

export async function generateWalletsAndDropSOL(
  connection: Connection,
  masterWallet: Keypair,
  amountOfSol: number,
  numberOfNewWallet: number,
  pathToSave: string
) {
  // Check if the file already exists
  let existingWallets = [];
  try {
    const fileContents = await fs.promises.readFile(pathToSave, "utf8");
    existingWallets = JSON.parse(fileContents);
  } catch (error) {
    // If the file doesn't exist, it's okay, we'll just create a new one
  }
  let final_tx = new Transaction();
  for (let i = 0; i < existingWallets.length; i++) {
    const wallet = Keypair.fromSecretKey(bs58.decode(existingWallets[i]));
    console.log("Existing wallet: ", wallet.publicKey.toBase58());
    final_tx.add(
      SystemProgram.transfer({
        fromPubkey: masterWallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: amountOfSol * LAMPORTS_PER_SOL,
      })
    );
  }
  // Generate new wallets and append to the existing array
  for (let i = 0; i < numberOfNewWallet; i++) {
    let newWallet = Keypair.generate();

    console.log("New wallet created: ", newWallet.publicKey.toBase58());
    const privateKey = bs58.encode(newWallet.secretKey);
    existingWallets.push(privateKey);
    // Transfer SOL to the new wallet
    final_tx.add(
      SystemProgram.transfer({
        fromPubkey: masterWallet.publicKey,
        toPubkey: newWallet.publicKey,
        lamports: amountOfSol * LAMPORTS_PER_SOL,
      })
    );
  }

  // Send the transaction
  const blockhash = await connection.getLatestBlockhash("confirmed");
  final_tx.feePayer = masterWallet.publicKey;
  final_tx.recentBlockhash = blockhash.blockhash;
  await sendTxToJito(
    connection,
    final_tx,
    masterWallet,
    [masterWallet],
    0.0001
  );

  // Save the updated array to the file
  try {
    await fs.promises.writeFile(
      pathToSave,
      JSON.stringify(existingWallets, null, 2)
    );
    console.log(`Wallets saved to ${pathToSave}`);
  } catch (error) {
    console.error(`Error saving wallets to ${pathToSave}:`, error);
  }

  return existingWallets;
}

export async function checkIfBondingCurveComplete(
  connection: Connection,
  wallet: any,
  mintKeypair: any
) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });

  const sdk = new PumpFunSDK(provider);
  const bondingCurveAccount = await sdk.getBondingCurveAccount(
    mintKeypair.publicKey
  );
  console.log("bondingCurveAccount: ", bondingCurveAccount);
  return bondingCurveAccount?.complete;
}
