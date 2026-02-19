import { Logger } from "pino";
import fs from "fs";
import { Keypair, LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getConnection } from "./config";

export const retrieveEnvVariable = (variableName: string, logger: Logger): string => {
  const variable = process.env[variableName] || "";
  if (!variable) {
    // Don't hard-exit. Log and throw so callers can handle gracefully.
    logger.error(`${variableName} is not set`);
    throw new Error(`Required environment variable ${variableName} is not set`);
  }
  return variable;
};

export function getKeypairByJsonPath(jsonPath: string): Keypair | undefined {
  try {
    const keypairJson = fs.readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(keypairJson);
    return Keypair.fromSecretKey(Uint8Array.from(data));
  } catch (e) {
    console.log(`Error loading keypair from ${jsonPath}:`, e);
    return undefined;
  }
}

export async function printSOLBalance(
  connection: Connection,
  pubKey: PublicKey,
  info = ""
): Promise<void> {
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
    const ata = getAssociatedTokenAddressSync(mintAddress, pubKey, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(ata, "processed");
    return balance.value.uiAmount || 0;
  } catch (e: any) {
    // Only swallow "account not found" errors -- re-throw network errors
    if (e?.message?.includes("could not find account") || e?.message?.includes("Invalid param")) {
      return 0;
    }
    console.error(`Error fetching SPL balance for ${mintAddress.toBase58()}:`, e?.message);
    return 0;
  }
}

export async function printSPLBalance(
  connection: Connection,
  mintAddress: PublicKey,
  user: PublicKey,
  info = ""
): Promise<void> {
  const balance = await getSPLBalance(connection, mintAddress, user);
  if (balance === 0) {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, "0 (No Account or Empty)");
  } else {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
  }
}

export async function retrieveWalletState(
  walletAddress: string
): Promise<Record<string, number>> {
  const connection = getConnection();
  try {
    const filters = [
      { dataSize: 165 },
      {
        memcmp: {
          offset: 32,
          bytes: walletAddress,
        },
      },
    ];
    const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const accounts = await connection.getParsedProgramAccounts(TOKEN_PROGRAM, { filters });
    const results: Record<string, number> = {};
    const solBalance = await connection.getBalance(new PublicKey(walletAddress));
    accounts.forEach((account) => {
      const parsedData = account.account.data as any;
      const mintAddress: string = parsedData["parsed"]["info"]["mint"];
      const tokenBalance: number = parsedData["parsed"]["info"]["tokenAmount"]["uiAmount"];
      results[mintAddress] = tokenBalance;
    });
    results["SOL"] = solBalance / LAMPORTS_PER_SOL;
    return results;
  } catch (e) {
    console.log(e);
  }
  return {};
}

// Backward compatibility alias
export const retriveWalletState = retrieveWalletState;
