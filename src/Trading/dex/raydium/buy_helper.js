const { swap } = require("../../../Pool/swap.js");
/**
 * Buys a specified amount of a token using a amount of sol.
 *
 * @param {string} side - The side of the trade (buy/sell).
 * @param {string} address - The address of the token.
 * @param {number} no_of_sol - The number of SOL to be used for the trade.
 * @param {string} payer - The payer of the transaction.
 * @returns {Promise<void>} - A promise that resolves when the trade is completed.
 */
async function buy(side, address, no_of_sol, payer) {
  await swap(side, address, no_of_sol, -1, payer);
}

module.exports = { buy };