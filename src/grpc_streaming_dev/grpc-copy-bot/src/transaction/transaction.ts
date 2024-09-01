import {
  Liquidity,
  LiquidityPoolKeys,
  LiquidityStateV4,
  Token,
  TokenAmount,
} from "@raydium-io/raydium-sdk";
import {
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  Transaction,
} from "@solana/web3.js";
import fs from "fs";
import bs58 from "bs58";
import {
  COMMITMENT_LEVEL,
  LOG_LEVEL,
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
} from "../constants";
import {
  AccountLayout,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { TokenInstructions } from "@project-serum/serum";
import { logger } from "../../../../helpers/logger";
import {
  retrieveEnvVariable,
  getKeypairByJsonPath,
  printSOLBalance,
  getSPLBalance,
} from "../../../../utils";
import { populateJitoLeaderArray } from "../streaming/stream-trader";
import { sendBundle } from "../jito/bundle";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
let wallet: Keypair;
let quoteAmount: TokenAmount;
export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
});

// Init funtions right here

export async function init(): Promise<void> {
  logger.level = LOG_LEVEL;

  // get wallet
  wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  logger.info(`Wallet Address: ${wallet.publicKey}`);

  logger.info(`Any Buys using WSOL`);

  // check existing wallet for associated token account of quote mint
  const SOLBalance = await solanaConnection.getBalance(wallet.publicKey);
  if (SOLBalance === 0) {
    throw new Error(`No SOL balance left in wallet: ${wallet.publicKey}`);
  }

  await populateJitoLeaderArray();
}
