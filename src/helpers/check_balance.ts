import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getDomainKeySync,
  NameRegistryState,
} from "@bonfida/spl-name-service";
import { main_endpoint, wallet } from "./config";
const connectionMain = new Connection(main_endpoint);
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

/**
 * Retrieves the public key associated with a given .sol domain.
 * @param {string} domain - The .sol domain to retrieve the public key for.
 * @returns {Promise<string>} The public key associated with the domain.
 */
export async function getPublicKeyFromSOLDomain(domain:string) {
  // check if the domain is a .sol domain
  // the last four characters should be ".sol"
  if (!domain.endsWith(".sol")) {
    console.error(`❌ The provided domain is not a .sol domain: ${domain}`);
    return;
  }
  const publicKey = await getDomainKeySync(domain);
  const owner = (
    await NameRegistryState.retrieve(connectionMain, publicKey.pubkey)
  ).registry.owner.toBase58();
  console.log(
    `🔍 Finished! The public key for the domain ${domain} is ${owner}!`
  );
  return owner;
}
/**
 * Checks the balance of a wallet address.
 * @param {string} address - The wallet address to check.
 * @param {object} connection - The connection object for interacting with the Solana network.
 * @returns {Promise<void>} - A promise that resolves when the balance is checked.
 */
export async function checkBalanceByAddress(address:string, connection:Connection) {
  // check if the address is valid
  // check the domain name of the address

  try {
    new PublicKey(address);
  } catch (error) {
    console.error(`❌ The provided address is invalid: ${address}`);
    return;
  }

  const publicKey = new PublicKey(address);
  const balanceInLamports = await connection.getBalance(publicKey);
  const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
  console.log(
    `💰 Finished! The balance for the wallet at address ${address} is ${balanceInSOL}!`
  );
  return balanceInSOL;
}
/**
 * Retrieves the balance of an SPL token associated with a given token account.
 * @param {Connection} connection - The connection object for interacting with the Solana network.
 * @param {PublicKey} tokenAccount - The public key of the token account.
 * @param {PublicKey} payerPubKey - The public key of the payer account.
 * @returns {Promise<number>} The balance of the SPL token.
 * @throws {Error} If no balance is found.
 */
export async function getSPLTokenBalance(connection:Connection, tokenAccount:PublicKey, payerPubKey:PublicKey) {
  const address = getAssociatedTokenAddressSync(tokenAccount, payerPubKey);
  const info = await connection.getTokenAccountBalance(address);
  if (info.value.uiAmount == null) throw new Error("No balance found");
  return info.value.uiAmount;
}
/**
 * Checks the balance of a wallet associated with a given domain.
 * @param {string} domain - The domain associated with the wallet.
 * @param {object} connection - The connection object for interacting with the Solana network.
 * @returns {Promise<void>} - A promise that resolves once the balance is checked.
 */
export async function checkBalanceByDomain(domain:string, connection:Connection) {
  // get the public key from the domain

  const owner:any = await getPublicKeyFromSOLDomain(domain);

  const balanceInLamports = await connection.getBalance(new PublicKey(owner));
  const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
  console.log(
    `💰 Finished! The balance for the wallet at domain ${domain} is ${balanceInSOL}!`
  );
}