import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token";
import { connection, wallet, smart_money_wallet } from "../../helpers/config";
import path from "path";
import { swap } from "../../jupiter/swap/swap-helper";
import { buy } from "../../raydium/buy_helper";
import { sell } from "../../raydium/sell_helper";
import fs from "fs";
const boughtTokensPath = path.join(__dirname, "bought-tokens.json");
let walletsToListen = [];
var previous_trader_wallet_state: any = {};
var previous_our_wallet_state: any = {};
// [usdc, sol, usdt, wsol]
const wsol = "So11111111111111111111111111111111111111112";
const quoteToken = [
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "SOL",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  wsol,
];
let boughtTokens = JSON.parse(fs.readFileSync(boughtTokensPath, "utf8"));

export async function saveToJson(token: string) {
  boughtTokens.push(token);
  fs.writeFileSync(boughtTokensPath, JSON.stringify(boughtTokens, null, 2));
}

/**
 * Listens to changes in multiple wallets and performs trading actions based on the changes.
 * @returns {Promise<void>} A promise that resolves once the wallet listening is set up.
 */
export async function listenToWallets(address: PublicKey) {
  try {
    connection.onProgramAccountChange(
      TOKEN_PROGRAM_ID,
      async (data) => {
        const changedMint = AccountLayout.decode(
          data.accountInfo.data
        ).mint.toBase58();
        console.log("changed mint: ", changedMint);
        // realize in smart money wallet there is a token's balance changed
        // then we look at trader's portfolio
        console.log("Wallet state changed");
        const current_trader_wallet_state: any = await retriveWalletState(
          address.toBase58()
        );
        const current_our_wallet_state: any = await retriveWalletState(
          wallet.publicKey.toBase58()
        );
        if (
          (changedMint in current_trader_wallet_state ||
            current_trader_wallet_state[changedMint] > 0) &&
          current_trader_wallet_state["SOL"] <
            previous_trader_wallet_state["SOL"]
        ) {
          console.log(`buying ${changedMint}...`);
          if (!current_our_wallet_state[wsol]) {
            console.log("We don't have enough SOL to swap");
            throw new Error("We don't have enough SOL to swap");
          }
          const buy_percentage = Math.abs(
            (current_trader_wallet_state["SOL"] -
              previous_trader_wallet_state["SOL"]) /
              previous_trader_wallet_state["SOL"]
          );
          const amountOut = current_our_wallet_state[wsol] * buy_percentage;
          console.log(`Using ${amountOut} SOL to buy ${changedMint}`);
          buy("buy", changedMint, amountOut, wallet);
          saveToJson(changedMint);
          previous_our_wallet_state = await retriveWalletState(
            wallet.publicKey.toBase58()
          );
          previous_trader_wallet_state = await retriveWalletState(
            address.toBase58()
          );
          return;
        } else if (
          (!(changedMint in current_trader_wallet_state) ||
            current_trader_wallet_state[changedMint] <=
              previous_trader_wallet_state[changedMint]) &&
          current_trader_wallet_state["SOL"] >
            previous_trader_wallet_state["SOL"]
        ) {
          console.log(`selling ${changedMint}...`);
          if (!current_our_wallet_state[wsol]) {
            console.log("We don't have enough SOL to swap");
            throw new Error("We don't have enough SOL to swap");
          }
          if (!(changedMint in current_trader_wallet_state)) {
            current_trader_wallet_state[changedMint] = 0;
          }
          const sell_percentage = Math.abs(
            (current_trader_wallet_state[changedMint] -
              previous_trader_wallet_state[changedMint]) /
              previous_trader_wallet_state[changedMint]
          );
          const amountOut =
            current_our_wallet_state[changedMint] * sell_percentage;
          console.log("amountOut: ", amountOut);
          sell("sell", changedMint, amountOut * 100, wallet);
          previous_our_wallet_state = await retriveWalletState(
            wallet.publicKey.toBase58()
          );
          previous_trader_wallet_state = await retriveWalletState(
            address.toBase58()
          );
          return;
        }
        // changed mint might dissapear in the current trader state if they sold all of it before
        // so we need to add it to the state with 0 balance
        // Compare the current wallet state with the previous state
        // to determine if the trader is buying or selling
        // trader's wallet state
        const prevState = previous_trader_wallet_state;
        const currentState = current_trader_wallet_state;
        let res_case = 0;
        // Check if there is one token that decreased and one token that increased
        let increasedToken = null,
          decreasedToken = null,
          increasedTokenPercentage = 0,
          decreasedTokenPercentage = 0;
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

            if (!current_our_wallet_state[wsol]) {
              console.log("We don't have enough SOL to swap");
              throw new Error("We don't have enough SOL to swap");
            }
            res_case = 1;
            // swap directly it if we have decreased token and balance > 0
            if (
              decreasedToken in current_our_wallet_state &&
              current_our_wallet_state[decreasedToken]
            ) {
              const buy_percentage = Math.abs(decreasedTokenPercentage);
              const amountOut =
                current_our_wallet_state[decreasedToken] * buy_percentage;

              swap(decreasedToken, increasedToken, amountOut, 5);
            } else if (current_our_wallet_state[wsol]) {
              // use sol to buy it if we don't have decreased token
              const buy_percentage = Math.abs(decreasedTokenPercentage);
              const amountOut = current_our_wallet_state[wsol] * buy_percentage;
              console.log(`Using ${amountOut} SOL to buy ${increasedToken}`);
              buy("buy", increasedToken, amountOut, wallet);
              saveToJson(increasedToken);
            }
          } else {
            // when the trader is swapping usdt to usdc, ignore it
          }
        } else {
          // someone send token to the wallet
          // wallet send token to someone
          // wallet send some token to limit order program or DCA program
          // ignore it for now, we only focus on trading for now
        }
        previous_our_wallet_state = await retriveWalletState(
          wallet.publicKey.toBase58()
        );
        previous_trader_wallet_state = await retriveWalletState(
          address.toBase58()
        );
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
  } catch (e) {
    console.log(e);
  }
}

/**
 * Retrieves the state of a wallet by querying the Solana blockchain.
 * @param {string} wallet_address - The address of the wallet to retrieve the state for.
 * @returns {Object} - An object containing the token balances of the wallet and the SOL balance.
 */
async function retriveWalletState(wallet_address: string) {
  try {
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
    let results: any = {};
    const solBalance = await connection.getBalance(
      new PublicKey(wallet_address)
    );
    accounts.forEach((account, i) => {
      //Parse the account data
      const parsedAccountInfo: any = account.account.data;
      const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
      const tokenBalance =
        parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];

      results[mintAddress] = tokenBalance;
      results["SOL"] = solBalance / 10 ** 9;
    });
    return results;
  } catch (e) {
    console.log(e);
  }
}

/**
 * Copies trades based on predefined parameters.
 * @returns {Promise<void>} A promise that resolves when the trade copying is complete.
 */
export async function copy_buy() {
  // smart money wallet address
  let smart_money_address: any = smart_money_wallet;
  // our wallet address
  let our_wallet_address = wallet.publicKey.toBase58();
  previous_trader_wallet_state = await retriveWalletState(smart_money_address);
  previous_our_wallet_state = await retriveWalletState(our_wallet_address);
  console.log("Our wallet state: ", previous_our_wallet_state);
  console.log("Trader wallet state: ", previous_trader_wallet_state);
  // subscribe to the smart money wallet
  // walletsToListen.push(new PublicKey(smart_money_address));
  await listenToWallets(new PublicKey(smart_money_address));
}

copy_buy();
