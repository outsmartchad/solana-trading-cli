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
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  COMMITMENT_LEVEL,
  LOG_LEVEL,
  PRIVATE_KEY,
  QUOTE_AMOUNT,
  QUOTE_MINT,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
} from "../constants";
import {
  AccountLayout,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { TokenInstructions } from "@project-serum/serum";
import { sendBundle } from "../jito/bundle";
import { logger } from "../utils/logger";
import { MinimalMarketLayoutV3, getMinimalMarketV3 } from "../market";
import { createPoolKeys, getTokenAccounts } from "../liquidity";
import { populateJitoLeaderArray } from "../streaming/raydium";
import { retrieveEnvVariable } from "../utils";

let wallet: Keypair;
let quoteToken: Token;
let quoteTokenAssociatedAddress: PublicKey;
let quoteAmount: TokenAmount;

wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
quoteAmount = new TokenAmount(Token.WSOL, QUOTE_AMOUNT, false);

export interface MinimalTokenAccountData {
  mint: PublicKey;
  address: PublicKey;
  poolKeys?: LiquidityPoolKeys;
  market?: MinimalMarketLayoutV3;
}

const existingTokenAccounts: Map<string, MinimalTokenAccountData> = new Map<
  string,
  MinimalTokenAccountData
>();

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
});

// Init Function

export async function init(): Promise<void> {
  logger.level = LOG_LEVEL;

  // get wallet
  wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  logger.info(`Wallet Address: ${wallet.publicKey}`);

  // get quote mint and amount
  switch (QUOTE_MINT) {
    case "WSOL": {
      quoteToken = Token.WSOL;
      quoteAmount = new TokenAmount(Token.WSOL, QUOTE_AMOUNT, false);
      break;
    }
    case "USDC": {
      quoteToken = new Token(
        TOKEN_PROGRAM_ID,
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        6,
        "USDC",
        "USDC"
      );
      quoteAmount = new TokenAmount(quoteToken, QUOTE_AMOUNT, false);
      break;
    }
    default: {
      throw new Error(
        `Unsupported quote mint "${QUOTE_MINT}". Supported values are USDC and WSOL`
      );
    }
  }

  logger.info(
    `Script will buy all new tokens using ${QUOTE_MINT}. Amount that will be used to buy each token is: ${quoteAmount.toFixed().toString()}`
  );

  // check existing wallet for associated token account of quote mint
  const tokenAccounts = await getTokenAccounts(
    solanaConnection,
    wallet.publicKey,
    COMMITMENT_LEVEL
  );

  for (const ta of tokenAccounts) {
    existingTokenAccounts.set(ta.accountInfo.mint.toString(), <
      MinimalTokenAccountData
    >{
      mint: ta.accountInfo.mint,
      address: ta.pubkey,
    });
  }

  const tokenAccount = tokenAccounts.find(
    (acc) => acc.accountInfo.mint.toString() === quoteToken.mint.toString()
  )!;

  if (!tokenAccount) {
    throw new Error(
      `No ${quoteToken.symbol} token account found in wallet: ${wallet.publicKey}`
    );
  }

  quoteTokenAssociatedAddress = tokenAccount.pubkey;

  await populateJitoLeaderArray();
}

async function simple_executeAndConfirm(
  transaction: VersionedTransaction,
  payer: Keypair,
  lastestBlockhash: string,
  tokenToBuy: string
) {
  console.log("Executing transaction...");
  const signature = await simple_execute(transaction);
  console.log("Transaction executed.");
  logger.info(`Sent tx! https://solscan.io/tx/${signature}`);

  logger.info({
    dex: `https://dexscreener.com/solana/${tokenToBuy}?maker=${payer.publicKey}`,
  });
}

async function simple_execute(transaction: VersionedTransaction) {
  return solanaConnection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: true,
    maxRetries: 0,
  });
}

// Create transaction

export async function buy(
  latestBlockhash: string,
  newTokenAccount: PublicKey,
  poolState: LiquidityStateV4,
  marketDetails: MinimalMarketLayoutV3,
  tokenType: string
): Promise<void> {
  try {
    let ata:any = null;
    if (tokenType === "pump")
      ata = getAssociatedTokenAddressSync(
        poolState.quoteMint,
        wallet.publicKey
      );
    else
      ata = getAssociatedTokenAddressSync(poolState.baseMint, wallet.publicKey);
    const poolKeys = createPoolKeys(newTokenAccount, poolState, marketDetails!);
    const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
      {
        poolKeys: poolKeys,
        userKeys: {
          tokenAccountIn: quoteTokenAssociatedAddress,
          tokenAccountOut: ata,
          owner: wallet.publicKey,
        },
        amountIn: quoteAmount.raw,
        minAmountOut: 0,
      },
      poolKeys.version
    );

    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: latestBlockhash,
      instructions: [
        ...[
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 80000,
          }),
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 0.04 * LAMPORTS_PER_SOL,
          }),
        ],
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          ata,
          wallet.publicKey,
          tokenType == "pump" ? poolState.quoteMint : poolState.baseMint
        ),
        ...innerTransaction.instructions,
      ],
    }).compileToV0Message();

    let commitment: Commitment = retrieveEnvVariable(
      "COMMITMENT_LEVEL",
      logger
    ) as Commitment;

    const transaction = new VersionedTransaction(messageV0);

    transaction.sign([wallet, ...innerTransaction.signers]);

    //await sleep(30000);

    /*const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
        preflightCommitment: commitment,
      });
*/
    //logger.info(`Sending bundle transaction with mint - ${signature}`);
    // //
    // if(tokenType==="pump") sendBundle(latestBlockhash, messageV0, poolState.quoteMint);
    // else sendBundle(latestBlockhash, messageV0, poolState.baseMint);

    if (tokenType === "pump")
      simple_executeAndConfirm(
        transaction,
        wallet,
        latestBlockhash,
        poolState.quoteMint.toBase58()
      );
    else
      simple_executeAndConfirm(
        transaction,
        wallet,
        latestBlockhash,
        poolState.baseMint.toBase58()
      );
  } catch (error) {
    logger.error(error);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
