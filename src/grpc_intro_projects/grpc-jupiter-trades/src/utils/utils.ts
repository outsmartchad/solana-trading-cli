import { Logger } from 'pino';
import dotenv from 'dotenv';
import fs from "fs";
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
dotenv.config();

export const retrieveEnvVariable = (variableName: string, logger: Logger) => {
  const variable = process.env[variableName] || '';
  if (!variable) {
    logger.error(`${variableName} is not set`);
    process.exit(1);
  }
  return variable;
};

export function getKeypairByJsonPath(jsonPath: string): any {
  try {
    const keypairJson = fs.readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(keypairJson);
    const mintKeypair = Keypair.fromSecretKey(Uint8Array.from(data));
    return mintKeypair
  } catch (e) {
    console.log(e);
  }
}
export async function printSOLBalance  (
  connection: Connection,
  pubKey: PublicKey,
  info = ""
) {
  const balance = await connection.getBalance(pubKey);
  console.log(
    `${info ? info + " " : ""}${pubKey.toBase58()}:`,
    balance / LAMPORTS_PER_SOL,
    `SOL`
  );
};

export async function getSPLBalance  (
  connection: Connection,
  mintAddress: PublicKey,
  pubKey: PublicKey,
  allowOffCurve = false
) {
  try {
    let ata = getAssociatedTokenAddressSync(mintAddress, pubKey, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(ata, "processed");
    return balance.value.uiAmount;
  } catch (e) {}
  return null;
};
async function printSPLBalance (
  connection: Connection,
  mintAddress: PublicKey,
  user: PublicKey,
  info = ""
) {
  const balance = await getSPLBalance(connection, mintAddress, user);
  if (balance === null) {
    console.log(
      `${info ? info + " " : ""}${user.toBase58()}:`,
      "No Account Found"
    );
  } else {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
  }
};