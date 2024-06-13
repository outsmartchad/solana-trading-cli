const {
  Connection,
  PublicKey,
  GetProgramAccountsFilter,
} = require("@solana/web3.js");
const {
  TOKEN_PROGRAM_ID,
  AccountLayout,
  getAssociatedTokenAddressSync,
} = require("@solana/spl-token");
const { connection, wallet } = require("../../../helpers/config");
const {
  checkBalanceByAddress,
  getSPLTokenBalance,
} = require("../../../helpers/check_balance");
const fs = require("fs");
const { currencyEquals } = require("@raydium-io/raydium-sdk");
const { sol } = require("@metaplex-foundation/js");
const { buy } = require("../../dex/jupiter/swap/buy-helper");
const { sell } = require("../../dex/jupiter/swap/sell-helper");
const { swap } = require("../../dex/jupiter/swap/swap-helper");
const { get } = require("http");

let walletsToListen = [];
var previous_trader_wallet_state = {};
var previous_our_wallet_state = {};
// [usdc, sol, usdt, wsol]
const quoteToken = [
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "SOL",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "So11111111111111111111111111111111111111112",
];

/**
 * Listens to changes in multiple wallets and performs trading actions based on the changes.
 * @returns {Promise<void>} A promise that resolves once the wallet listening is set up.
 */
async function listenToWallets(address) {
  connection.onProgramAccountChange(
    TOKEN_PROGRAM_ID,
    async (temp) => {
      // realize in smart money wallet there is a token's balance changed
      // then we look at trader's portfolio
      console.log("Wallet state changed");
      const current_trader_wallet_state = await retriveWalletState(
        address.toBase58()
      );
      const current_our_wallet_state = await retriveWalletState(
        wallet.publicKey.toBase58()
      );
      console.log(current_trader_wallet_state);

      // Compare the current wallet state with the previous state
      // to determine if the trader is buying or selling

      // trader's wallet state
      const prevState = previous_trader_wallet_state || {};
      const currentState = current_trader_wallet_state;

      // Check if there is one token that decreased and one token that increased
      let increasedToken = null;
      let decreasedToken = null;
      let increasedTokenPercentage = 0;
      let decreasedTokenPercentage = 0;

      for (const mint in currentState) {
        if (increasedToken && decreasedToken) {
          break;
        }
        const prevBalance = prevState[mint] || 0;
        const currentBalance = currentState[mint];

        if (currentBalance > prevBalance) {
          increasedToken = mint;
          increasedTokenPercentage =
            (currentBalance - prevBalance) / prevBalance;
        } else if (currentBalance < prevBalance) {
          decreasedToken = mint;
          decreasedTokenPercentage =
            (currentBalance - prevBalance) / prevBalance;
        }
      }
      // the Trader is trading
      if (increasedToken && decreasedToken) {
        if (
          !quoteToken.includes(increasedToken) &&
          !quoteToken.includes(decreasedToken)
        ) {
          console.log(
            `case1: The trader is swapping ${decreasedToken} to ${increasedToken}`
          );

          if (!current_our_wallet_state["SOL"]) {
            console.log("We don't have enough SOL to swap");
            throw new Error("We don't have enough SOL to swap");
          }

          // swap directly it if we have decreased token and balance > 0
          if (
            decreasedToken in current_our_wallet_state &&
            current_our_wallet_state[decreasedToken]
          ) {
            const buy_percentage = Math.abs(decreasedTokenPercentage);
            const amountOut =
              current_our_wallet_state[decreasedToken] * buy_percentage;
            await swap(decreasedToken, increasedToken, amountOut, 3);
          } else if (current_our_wallet_state["SOL"]) {
            // use sol to buy it if we don't have decreased token
            const buy_percentage = Math.abs(decreasedTokenPercentage);
            const amountOut = current_our_wallet_state["SOL"] * buy_percentage;
            await buy(increasedToken, amountOut, 3);
          }
        } else if (quoteToken.includes(increasedToken)) {
          // The trader is selling
          console.log(`case2: The trader is selling ${decreasedToken}`);
          if (!current_our_wallet_state["SOL"]) {
            console.log("We don't have enough SOL to swap");
            throw new Error("We don't have enough SOL to swap");
          }
          // if we don't have this token, skip it
          if (!current_our_wallet_state[decreasedToken]) {
            return;
          }
          const sell_percentage = Math.abs(decreasedTokenPercentage);
          const amountOut =
            current_our_wallet_state[decreasedToken] * sell_percentage;
          await sell(decreasedToken, amountOut, 3);
        } else if (quoteToken.includes(decreasedToken)) {
          // The trader is buying

          console.log(`case3: The trader is buying ${increasedToken}`);
          if (!current_our_wallet_state["SOL"]) {
            console.log("We don't have enough SOL to swap");
            throw new Error("We don't have enough SOL to swap");
          }

          const buy_percentage = Math.abs(decreasedTokenPercentage);
          const amountOut = current_our_wallet_state["SOL"] * buy_percentage;
          await buy(increasedToken, amountOut, 3);
        } else {
          // when the trader is swapping usdt to usdc, ignore it
        }
      } else {
        // someone send token to the wallet
        // wallet send token to someone
        // wallet send some token to limit order program or DCA program
        // ignore it for now, we only focus on trading for now
      }

      // Update the previous wallet state
      previous_trader_wallet_state = current_trader_wallet_state;
      previous_our_wallet_state = current_our_wallet_state;
    },
    "confirmed",
    [
      {
        dataSize: 165,
      },
      {
        memcmp: {
          offset: 32,
          bytes: address.toBase58(),
        },
      },
    ]
  );
}
/**
 * Retrieves the state of a wallet by querying the Solana blockchain.
 * @param {string} wallet_address - The address of the wallet to retrieve the state for.
 * @returns {Object} - An object containing the token balances of the wallet and the SOL balance.
 */
async function retriveWalletState(wallet_address) {
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
  let results = {};
  const solBalance = await connection.getBalance(new PublicKey(wallet_address));
  accounts.forEach((account, i) => {
    //Parse the account data
    const parsedAccountInfo = account.account.data;
    const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
    const tokenBalance =
      parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];

    results[mintAddress] = tokenBalance;
    results["SOL"] = solBalance / 10 ** 9;
  });
  return results;
}

/**
 * Copies trades based on predefined parameters.
 * @returns {Promise<void>} A promise that resolves when the trade copying is complete.
 */
async function copy_trade() {
  // smart money wallet address
  let smart_money_address = "smart_money_address_here";
  // our wallet address
  let our_wallet_address = wallet.publicKey.toBase58();
  previous_trader_wallet_state = await retriveWalletState(smart_money_address);
  previous_our_wallet_state = await retriveWalletState(our_wallet_address);
  console.log("trader wallet state: ", previous_trader_wallet_state);
  console.log("our wallet state: ", previous_our_wallet_state);
  // subscribe to the smart money wallet
  // walletsToListen.push(new PublicKey(smart_money_address));
  await listenToWallets(new PublicKey(smart_money_address));
}

copy_trade();
async function main() {
  // buy
  // const balanceOfSol = await checkBalanceByAddress(
  //   wallet.publicKey.toBase58(),
  //   connection
  // );
  // const buy_percentage = 10; // 10%
  // console.log(balanceOfSol);
  // const amountOut = (balanceOfSol * buy_percentage) / 100;
  // console.log(amountOut);
  // await buy("2fUFhZyd47Mapv9wcfXh5gnQwFXtqcYu9xAN4THBpump", amountOut, 1);
  // sell
  // const balanceOfToken = await getSPLTokenBalance(
  //   connection,
  //   new PublicKey("2fUFhZyd47Mapv9wcfXh5gnQwFXtqcYu9xAN4THBpump"),
  //   wallet.publicKey
  // );
  // const sell_percentage = 10; // 10%
  // console.log(balanceOfToken);
  // const amountOut = (balanceOfToken * sell_percentage) / 100;
  // console.log(amountOut);
  // await sell("2fUFhZyd47Mapv9wcfXh5gnQwFXtqcYu9xAN4THBpump", amountOut, 1);
  // swap
  // const balanceOfSellToken = await getSPLTokenBalance(
  //   connection,
  //   new PublicKey("2fUFhZyd47Mapv9wcfXh5gnQwFXtqcYu9xAN4THBpump"),
  //   wallet.publicKey
  // );
  // const sell_percentage = 10; // 10%
  // console.log(balanceOfSellToken);
  // const amountOut = (balanceOfSellToken * sell_percentage) / 100;
  // console.log(amountOut);
  // await swap(
  //   "2fUFhZyd47Mapv9wcfXh5gnQwFXtqcYu9xAN4THBpump",
  //   "7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3",
  //   amountOut,
  //   1
  // );
}
module.exports = {
  copy_trade,
};
