import { Logger } from "pino";
import dotenv from "dotenv";
import fs from "fs";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { connection } from "./config";
dotenv.config();

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const retrieveEnvVariable = (variableName: string, logger: Logger) => {
  const variable = process.env[variableName] || "";
  if(variableName === "GRPC_XTOKEN") return variable;
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
    return mintKeypair;
  } catch (e) {
    console.log(e);
  }
}
export async function printSOLBalance(
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
}

export async function getSPLBalance(
  connection: Connection,
  mintAddress: PublicKey,
  pubKey: PublicKey,
  allowOffCurve = false
): Promise<number> {
  try {
    let ata = getAssociatedTokenAddressSync(mintAddress, pubKey, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(ata, "processed");
    return balance.value.uiAmount || 0;
  } catch (e) {}
  return 0;
}
export async function printSPLBalance(
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
}
export async function retriveWalletState(wallet_address: string) {
  try {
    const filters = [
      {
        dataSize: 165, //size of account (bytes)
      },
      {
        memcmp: {
          offset: 32, //location of our query in the account (bytes)
          bytes: wallet_address, //our search criteria, a base58 encoded string
        },
      },
    ];
    const accounts = await connection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      { filters: filters }
    );
    let results: any = {};
    const solBalance = await connection.getBalance(
      new PublicKey(wallet_address)
    );
    accounts.forEach((account, i) => {
      //Parse the account data
      const parsedAccountInfo: any = account.account.data;
      const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
      const tokenBalance =
        parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];
      results[mintAddress] = tokenBalance;
    });
    results["SOL"] = solBalance / 10 ** 9;
    return results || {};
  } catch (e) {
    console.log(e);
  }
  return {};
}

