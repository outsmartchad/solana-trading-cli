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
const fs = require("fs");
const { currencyEquals } = require("@raydium-io/raydium-sdk");
const { sol } = require("@metaplex-foundation/js");

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
 * Reads a JSON file and returns an array of wallet addresses.
 * @param {string} file_path - The path to the JSON file.
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of wallet addresses.
 */
async function read_json(file_path) {
  try {
    let wallet_addresses = [];
    // Read the JSON file
    const data = await fs.promises.readFile(file_path, "utf8");

    // Parse the JSON data
    const jsonData = JSON.parse(data);

    // Iterate over the array-like object
    jsonData.forEach((address) => {
      wallet_addresses.push(address);
    });
    return wallet_addresses;
  } catch (err) {
    console.error("Error reading file:", err);
  }
}
/**
 * Adds wallets to the list of wallets to listen for.
 * @returns {Promise<void>} A promise that resolves once the wallets are added.
 */
async function addWallet() {
  const wallets = await read_json("path/to/your/wallets.json");
  wallets.forEach((wallet) => {
    walletsToListen.push(new PublicKey(wallet));
  });

  console.log(walletsToListen);
}
/**
 * Listens to changes in multiple wallets and performs trading actions based on the changes.
 * @returns {Promise<void>} A promise that resolves once the wallet listening is set up.
 */
async function listenToWallets() {
  walletsToListen = walletsToListen.forEach((address) => {
    connection.onProgramAccountChange(
      TOKEN_PROGRAM_ID,
      async (temp) => {
        // realize in smart money wallet there is a token's balance changed
        // then we look at trader's portfolio
        console.log("Wallet state changed");
        const current_wallet_state = await retriveWalletState(address);
        console.log(current_wallet_state);

        // Compare the current wallet state with the previous state
        // to determine if the trader is buying or selling
        const prevState = previous_trader_wallet_state || {};
        const currentState = current_wallet_state;

        // Check if there is one token that decreased and one token that increased
        let increasedToken = null;
        let decreasedToken = null;
        let increasedTokenPercentage = 0;
        let decreasedTokenPercentage = 0;

        for (const mint in currentState) {
          const prevBalance = prevState[mint] || 0;
          const currentBalance = currentState[mint];

          if (currentBalance > prevBalance) {
            increasedToken = mint;
            increasedTokenPercentage =
              (currentBalance - prevBalance) / prevBalance;
          } else if (currentBalance < prevBalance) {
            decreasedToken = mint;
            decreasedTokenPercentage =
              (currencyEquals - prevBalance) / prevBalance;
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
            return;
            // The trader is swapping tokens,
            // we need to check if both tokens are in our wallet as well
            // if missing one token, buy the output token of the swapping
            await buyToken(wallet_address, increasedToken, solperorder);
            // if both tokens are in the wallet, we can directly swap them using JUP swap API
            // Swap the tokens
            await swapToken(
              wallet_address,
              increasedToken,
              decreasedToken,
              Math.abs(decreasedTokenPercentage) / 100
            );
          } else if (quoteToken.includes(increasedToken)) {
            console.log(`case2: The trader is selling ${decreasedToken}`);
            return;
            // The trader is selling
            await sellToken(
              wallet_address,
              decreasedToken,
              Math.abs(decreasedTokenPercentage) / 100
            );
          } else if (quoteToken.includes(decreasedToken)) {
            console.log(`case3: The trader is buying ${increasedToken}`);
            return;
            // The trader is buying
            await buyToken(
              wallet_address,
              increasedToken,
              Math.abs(increasedTokenPercentage) / 100
            );
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
        previous_trader_wallet_state = currentState;
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
  });
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

    //Log results
  });
  console.log(results);
  return results;
}

/**
 * Copies trades based on predefined parameters.
 * @returns {Promise<void>} A promise that resolves when the trade copying is complete.
 */
async function copy_trade() {
  // ***predefined parameters***
  // wallet object
  let payer_wallet = wallet;
  // 0.1 SOL, fixed order size
  let buyPercentage = 0;
  // depends the account's token balance changes
  // 20 A -> 10 A, (10 - 20) / 20 = -50% == sell 50%
  // (current token balance - previous token balance /  previous token balance) * 100
  let sellPercentage = 0;
  // smart money wallet address
  let smart_money_address = "your_smart_money_wallet_address_here";
  // our wallet address
  let our_wallet_address = wallet.publicKey.toBase58();
  previous_trader_wallet_state = await retriveWalletState(smart_money_address);
  previous_our_wallet_state = await retriveWalletState(our_wallet_address);
  // subscribe to the smart money wallet
  walletsToListen.push(new PublicKey(smart_money_address));
  await listenToWallets();
}

copy_trade();
module.exports = {
  listenToWallets,
};
