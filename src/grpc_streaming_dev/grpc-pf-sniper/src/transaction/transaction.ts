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
  QUOTE_AMOUNT,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  //PRIVATE_KEY_1,
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
import { logger } from "../utils/logger";
import {
  retrieveEnvVariable,
  getKeypairByJsonPath,
  printSOLBalance,
  getSPLBalance,
} from "../utils";
import { populateJitoLeaderArray } from "../streaming/pump.fun";
import { sendBundle } from "../jito/bundle";
import { PumpFunSDK } from "../pumpdotfun-sdk/src/pumpfun";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { printSPLBalance } from "../pumpdotfun-sdk/example/util";
let wallet: Keypair;
let dev_wallet: Keypair;
let quoteAmount: TokenAmount;
quoteAmount = new TokenAmount(Token.WSOL, QUOTE_AMOUNT, false);
export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
});

// Init funtions right here

export async function init(): Promise<void> {
  logger.level = LOG_LEVEL;

  // get wallet
  wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  //dev_wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY_1));
  logger.info(`Wallet Address: ${wallet.publicKey}`);
  //logger.info(`Dev Wallet Address: ${dev_wallet.publicKey}`);

  logger.info(
    `Script will buy all new tokens on Pump.fun using SOL. Amount that will be used to buy each token is: ${quoteAmount.toFixed().toString()}`
  );

  // check existing wallet for associated token account of quote mint
  const SOLBalance = await solanaConnection.getBalance(wallet.publicKey);
  // const dev_SOLBalance = await solanaConnection.getBalance(
  //   dev_wallet.publicKey
  // );
  if (SOLBalance === 0) {
    throw new Error(`No SOL balance left in wallet: ${wallet.publicKey}`);
  }
  // if (dev_SOLBalance === 0) {
  //   throw new Error(`No SOL balance left in wallet: ${dev_wallet.publicKey}`);
  // }
  const quote_amt = Number(QUOTE_AMOUNT);
  if (SOLBalance < quote_amt * LAMPORTS_PER_SOL) {
    throw new Error(`Insufficient SOL balance in wallet: ${wallet.publicKey}`);
  }

  await populateJitoLeaderArray();
}

// non-jito execution functions
async function simple_executeAndConfirm(transaction: VersionedTransaction) {
  logger.info("Sent tx!");
  const signature = await simple_execute(transaction);
  logger.info(`https://solscan.io/tx/${signature}`);
}

async function simple_execute(transaction: VersionedTransaction) {
  return solanaConnection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: true,
    maxRetries: 0,
  });
}

// trading functions right here

export async function sell(
  mintPublicKey: PublicKey,
  isJito: Boolean
): Promise<void> {
  const Wallet = new NodeWallet(wallet);
  const provider = new AnchorProvider(solanaConnection, Wallet, {
    commitment: "finalized",
  });
  const latestBlockhash = await solanaConnection.getLatestBlockhash({
    commitment: "confirmed",
  });
  const sdk = new PumpFunSDK(provider);
  console.log("Fetching balance of mint: ", mintPublicKey.toBase58());
  const currentBalanceOfMint = await sdk.getBalance(
    wallet.publicKey,
    mintPublicKey
  );
  if (currentBalanceOfMint === 0) {
    logger.info("No balance to sell");
    return;
  }
  console.log("Current balance of mint: ", currentBalanceOfMint);

  let ata = await getAssociatedTokenAddress(mintPublicKey, wallet.publicKey);
  const sellInstruction: Transaction = await sdk.sell(
    wallet,
    mintPublicKey,
    currentBalanceOfMint,
    10000n,
    undefined,
    "confirmed",
    "finalized"
  );
  console.log("sellInstruction: ", sellInstruction);
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ...[
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 71999,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 0.0004 * LAMPORTS_PER_SOL,
        }),
      ],
      ...sellInstruction.instructions,
    ],
  }).compileToV0Message();
  let commitment: Commitment = retrieveEnvVariable(
    "COMMITMENT_LEVEL",
    logger
  ) as Commitment;
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([wallet]);
  logger.info("sell tx sent!");
  if (isJito) {
    sendBundle(latestBlockhash.blockhash, transaction, mintPublicKey, wallet); // with jito
    await new Promise((r) => setTimeout(r, 1000));
    sendBundle(
      latestBlockhash.blockhash,
      transaction,
      mintPublicKey,
      dev_wallet
    ); // with jito
  } else simple_executeAndConfirm(transaction); // without jito
}

export async function buy(
  mintPublicKey: PublicKey,
  isJito: Boolean
): Promise<void> {
  try {
    const Wallet = new NodeWallet(wallet);
    const provider = new AnchorProvider(solanaConnection, Wallet, {
      commitment: "processed",
    });
    const latestBlockhash = await solanaConnection.getLatestBlockhash({
      commitment: "processed",
    });
    const sdk = new PumpFunSDK(provider);
    let ata = await getAssociatedTokenAddressSync(
      mintPublicKey,
      wallet.publicKey
    );
    // this is where the buy instruction of pump.fun new token will be added
    logger.info(`Sniping token: ${mintPublicKey.toBase58()}`);
    const buyInstruction: Transaction = await sdk.buy(
      wallet,
      mintPublicKey,
      BigInt(Number(quoteAmount.toFixed()) * LAMPORTS_PER_SOL)
    );

    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...[
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 71900,
          }),
        ],
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          ata,
          wallet.publicKey,
          mintPublicKey
        ),
        ...buyInstruction.instructions,
      ],
    }).compileToV0Message();

    let commitment: Commitment = retrieveEnvVariable(
      "COMMITMENT_LEVEL",
      logger
    ) as Commitment;

    const transaction = new VersionedTransaction(messageV0);

    transaction.sign([wallet]);

    //await sleep(30000);
    logger.info("buy tx sent!");
    /*const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
          preflightCommitment: commitment,
        });
  */
    //logger.info(`Sending bundle transaction with mint - ${signature}`);
    if (isJito)
      sendBundle(latestBlockhash.blockhash, transaction, mintPublicKey, wallet); // with jito
    else simple_executeAndConfirm(transaction); // without jito
  } catch (error) {
    logger.error(error);
  }
}

export async function createAndBuy(
  pathToMintKeypair: string,
  tokenMetadata: any,
  initialBuySolAmount: number
) {
  const Wallet = new NodeWallet(dev_wallet);
  const provider = new AnchorProvider(solanaConnection, Wallet, {
    commitment: "processed",
  });

  const sdk = new PumpFunSDK(provider);
  const mintKeypair = await getKeypairByJsonPath(pathToMintKeypair);
  console.log("Mint keypair: ", mintKeypair);
  await printSOLBalance(
    solanaConnection,
    dev_wallet.publicKey,
    "Dev wallet keypair"
  );
  let bondingCurveAccount = await sdk.getBondingCurveAccount(
    mintKeypair.publicKey
  );
  if (!bondingCurveAccount) {
    // the mint is not exist in pump.fun yet
    const latestBlockhash = await solanaConnection.getLatestBlockhash({
      commitment: "processed",
    });
    let createAndBuyInstruction: Transaction = await sdk.createAndBuy(
      dev_wallet,
      mintKeypair,
      tokenMetadata,
      BigInt(initialBuySolAmount * LAMPORTS_PER_SOL)
    );
    const messageV0 = new TransactionMessage({
      payerKey: dev_wallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...[
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 250000,
          }),
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 0.004 * LAMPORTS_PER_SOL,
          }),
        ],
        ...createAndBuyInstruction.instructions,
      ],
    }).compileToV0Message();

    let commitment: Commitment = retrieveEnvVariable(
      "COMMITMENT_LEVEL",
      logger
    ) as Commitment;

    const transaction = new VersionedTransaction(messageV0);

    transaction.sign([dev_wallet, mintKeypair]);

    //await sleep(30000);
    logger.info("create and buy tx sent!");
    /*const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
          preflightCommitment: commitment,
        });
  */
    //logger.info(`Sending bundle transaction with mint - ${signature}`);
    // await simple_executeAndConfirm(transaction);
    await sendBundle(
      latestBlockhash.blockhash,
      transaction,
      mintKeypair.publicKey,
      dev_wallet
    ); // with jito
    // wait for 2 seconds for the transaction to be processed
    await new Promise((r) => setTimeout(r, 1000));
    bondingCurveAccount = await sdk.getBondingCurveAccount(
      mintKeypair.publicKey
    );
    logger.info("Bonding curve after create and buy", bondingCurveAccount);
    printSPLBalance(
      solanaConnection,
      mintKeypair.publicKey,
      dev_wallet.publicKey
    );
  }
}

async function main() {
  const pathToMintKeypair =
    "/Users/chiwangso/Desktop/beta-memecoin-cli/src/Trading/Sniper_dev/grpc-pump.fun-bot/test-token-keypairs/soC5qgyb82XUQiEPEYsHspNtiKYcYsQiKeNSoiihyG9.json";
  let tokenMetadata = {
    name: "Juice Wrld",
    symbol: "JW",
    description: "YES, how?",
    telegram: "",
    twitter: "",
    website: "",
    file: await fs.openAsBlob(
      "/Users/chiwangso/Desktop/beta-memecoin-cli/src/Trading/pumpfun-bundler-cli/pumpfunsdk-js/pumpdotfun-sdk/images/999.jpg" // change your own path
    ),
  };
  let initialBuySolAmount = 0.02;
  await init();
  await createAndBuy(pathToMintKeypair, tokenMetadata, initialBuySolAmount);
}
// main()
