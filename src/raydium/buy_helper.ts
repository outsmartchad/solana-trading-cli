import { Keypair } from "@solana/web3.js";
import { swap } from "./Pool/swap";
/**
 * Buys a specified amount of a token using a amount of sol.
 *
 * @param {string} side - The side of the trade (buy/sell).
 * @param {string} address - The address of the token.
 * @param {number} no_of_sol - The number of SOL to be used for the trade.
 * @param {Keypair} payer - The payer of the transaction.
 * @returns {Promise<void>} - A promise that resolves when the trade is completed.
 */
export async function buy(side:string, address:string, no_of_sol:number, payer:Keypair) {
  await swap(side, address, no_of_sol, -1, payer, "trade");
}

export async function get_buy_transaction(
  side:string,
  tokenAddr:string,
  buy_AmountOfSol:number,
  payer_wallet:Keypair
) {
  const innerTransaction = await swap(
    side,
    tokenAddr,
    buy_AmountOfSol,
    -1,
    payer_wallet,
    "volume"
  );
  return innerTransaction;
}
