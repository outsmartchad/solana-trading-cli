import { Keypair } from "@solana/web3.js";
import { swap } from "./Pool/swap";

/**
 * Sells a specified percentage of a token.
 * @param {string} side - The side of the trade (buy or sell).
 * @param {string} address - The address of the token.
 * @param {number} sell_percentage - The percentage of the token to sell.
 * @param {string} payer - The payer of the transaction.
 * @returns {Promise<void>} - A promise that resolves when the sell operation is complete.
 */
export async function sell(side:string, address:string, sell_percentage:number, payer:Keypair) {
  await swap(side, address, -1, sell_percentage, payer, "trade");
}
export async function get_sell_transaction(side:string, tokenAddr:string, payer_wallet:Keypair) {
  const innerTransaction = await swap(
    side,
    tokenAddr,
    -1,
    100,
    payer_wallet,
    "volume"
  );
  return innerTransaction;
}
