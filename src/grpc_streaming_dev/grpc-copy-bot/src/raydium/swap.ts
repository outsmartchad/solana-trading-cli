import {
  Liquidity,
  Percent,
  Token,
  TOKEN_PROGRAM_ID,
  TokenAmount,
} from "@raydium-io/raydium-sdk";
import {
  PublicKey,
  TransactionMessage,
  ComputeBudgetProgram,
  VersionedTransaction,
} from "@solana/web3.js";
import { Decimal } from "decimal.js";
import { BN } from "@project-serum/anchor";
import { getSPLBalance } from "../../../../helpers/utils";
import { getDecimals } from "../../../../helpers/util";
import { DEFAULT_TOKEN } from "../constants";
import { fetchAMMPoolId } from "./utils";
import {
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import { formatAmmKeysById_swap } from "./formatAmmKeys";
import { Keypair } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";

let tokenToPoolId:any = {};
let walletPublicKeyToWSOLAta:any = {};
let walletPublicKeyToTokenAta:any = {};
let tokenToDecimal:any = {};
/**
 * Performs a swap operation using an Automated Market Maker (AMM) pool in Raydium.
 * @param {Object} input - The input parameters for the swap operation.
 * @returns {Object} - The transaction IDs of the executed swap operation.
 */
async function swapOnlyAmm(input: any): Promise<VersionedTransaction> {
  // -------- pre-action: get pool info --------\
  const poolKeys = await formatAmmKeysById_swap(
    new PublicKey(input.targetPool)
  );
  const poolInfo = await Liquidity.fetchInfo({
    connection: input.connection_obj,
    poolKeys: poolKeys,
  });
  // -------- step 1: coumpute amount out --------
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: poolInfo,
    amountIn: input.inputTokenAmount,
    currencyOut: input.outputToken,
    slippage: input.slippage,
  });
  // -------- step 2: create instructions by SDK function --------
  const { innerTransaction } = await Liquidity.makeSwapFixedInInstruction(
    {
      poolKeys: poolKeys,
      userKeys: {
        tokenAccountIn: input.ataIn,
        tokenAccountOut: input.ataOut,
        owner: input.master_wallet.publicKey,
      },
      amountIn: input.inputTokenAmount.raw,
      minAmountOut: minAmountOut.raw,
    },
    poolKeys.version
  );

  let latestBlockhash = await input.connection_obj.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: input.master_wallet.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ...[
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 70000,
        }),
      ],
      ...(input.side === "buy"
        ? [
            createAssociatedTokenAccountIdempotentInstruction(
              input.master_wallet.publicKey,
              input.ataOut,
              input.master_wallet.publicKey,
              input.outputToken.mint
            ),
          ]
        : []),
      ...innerTransaction.instructions,
    ],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([input.master_wallet, ...innerTransaction.signers]);
  return transaction;
}

/**
 * Performs a swap operation.
 *
 * @param {string} side - The side of the swap operation ("buy" or "sell").
 * @param {string} tokenAddr - The address of the token involved in the swap.
 * @param {number} buy_AmountOfSol - The amount of SOL to buy (only applicable for "buy" side).
 * @param {number} sell_AmountOfToken - The amount of Token to sell (only applicable for "sell" side).
 * @param {object} payer_wallet - The payer's wallet object.
 * @param {string} usage - The usage of the swap operation.
 * @param {object} connection_obj - The connection object.
 * @returns {Promise<void>} - A promise that resolves when the swap operation is completed.
 */
export async function swap(
  side: string,
  tokenAddr: string,
  buy_AmountOfSol: number,
  sell_AmountOfToken: number,
  payer_wallet: Keypair,
  usage: string,
  connection_obj: Connection
): Promise<any> {
  const tokenAddress: string = tokenAddr;
  const tokenAccount: PublicKey = new PublicKey(tokenAddress);
  let mintAta: any = null,
    quoteAta: any = null,
    targetPool: string = "";

  // to avoid creating associated token account multiple times
  if (!(payer_wallet.publicKey.toBase58() in walletPublicKeyToTokenAta)) {
    walletPublicKeyToTokenAta[payer_wallet.publicKey.toBase58()] = {};
    walletPublicKeyToTokenAta[payer_wallet.publicKey.toBase58()][tokenAddress] =
      await getAssociatedTokenAddress(tokenAccount, payer_wallet.publicKey);
    mintAta =
      walletPublicKeyToTokenAta[payer_wallet.publicKey.toBase58()][
        tokenAddress
      ];
  } else {
    if (
      !(
        tokenAddress in
        walletPublicKeyToTokenAta[payer_wallet.publicKey.toBase58()]
      )
    ) {
      walletPublicKeyToTokenAta[payer_wallet.publicKey.toBase58()][
        tokenAddress
      ] = await getAssociatedTokenAddress(tokenAccount, payer_wallet.publicKey);
    }
    mintAta =
      walletPublicKeyToTokenAta[payer_wallet.publicKey.toBase58()][
        tokenAddress
      ];
  }
  // to avoid creating associated WSOL account multiple times
  if (!(payer_wallet.publicKey.toBase58() in walletPublicKeyToWSOLAta)) {
    quoteAta = await getAssociatedTokenAddressSync(
      Token.WSOL.mint,
      payer_wallet.publicKey
    );
    walletPublicKeyToWSOLAta[payer_wallet.publicKey.toBase58()] = quoteAta;
  } else {
    quoteAta = walletPublicKeyToWSOLAta[payer_wallet.publicKey.toBase58()];
  }
  // to avoid getting the same pool id multiple times
  if (!(tokenAddress in tokenToPoolId)) {
    targetPool = await fetchAMMPoolId(tokenAddress);
    tokenToPoolId[tokenAddress] = targetPool;
  } else {
    targetPool = tokenToPoolId[tokenAddress];
  }
  // to avoid getting the same decimal multiple times
  if (!(tokenAddress in tokenToDecimal)) {
    tokenToDecimal[tokenAddress] = await getDecimals(tokenAccount);
  }
  if (side === "buy") {
    // buy - use sol to swap to the token
    //const { tokenName, tokenSymbol } = await getTokenMetadata(tokenAddress);
    const outputToken = new Token(
      TOKEN_PROGRAM_ID,
      tokenAccount,
      tokenToDecimal[tokenAddress]
    );
    const inputToken = DEFAULT_TOKEN.WSOL; // SOL
    if (targetPool === null) {
      console.log(
        "Pool not found or raydium is not supported for this token. Exiting..."
      );
      return Object.create(null);
    }
    const amountOfSol = new Decimal(buy_AmountOfSol);
    const inputTokenAmount = new TokenAmount(
      inputToken,
      new BN(amountOfSol.mul(10 ** inputToken.decimals).toFixed(0))
    );
    const slippage = new Percent(3, 100);
    const input = {
      outputToken,
      targetPool,
      inputTokenAmount,
      slippage,
      ataIn: quoteAta,
      ataOut: mintAta,
      side,
      usage,
      connection_obj: connection_obj,
      master_wallet: payer_wallet,
    };

    return { pool: new PublicKey(targetPool), txn: await swapOnlyAmm(input) };
  } else {
    // sell
    const inputToken = new Token(
      TOKEN_PROGRAM_ID,
      tokenAccount,
      tokenToDecimal[tokenAddress],
      "",
      ""
    );
    const outputToken = DEFAULT_TOKEN.WSOL; // WSOL

    if (targetPool === null) {
      console.log(
        "Pool not found or raydium is not supported for this token. Exiting..."
      );
      return Object.create(null);
    }
    const amount = new Decimal(sell_AmountOfToken);
    const slippage = new Percent(5, 100);
    const inputTokenAmount = new TokenAmount(
      inputToken,
      new BN(amount.mul(10 ** inputToken.decimals).toFixed(0))
    );
    const input = {
      outputToken,
      targetPool,
      inputTokenAmount,
      slippage,
      ataIn: mintAta,
      ataOut: quoteAta,
      side,
      usage,
      tokenAddress: tokenAddress,
      connection_obj: connection_obj,
      master_wallet: payer_wallet,
    };
    return { pool: new PublicKey(targetPool), txn: await swapOnlyAmm(input) };
  }
}
