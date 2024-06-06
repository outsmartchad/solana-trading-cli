const { PublicKey, Connection } = require("@solana/web3.js");
const {
  Token,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
/**
 * Checks the associated token account for a given wallet and token address.
 * @param {Connection} connection - The connection object.
 * @param {PublicKey} walletPubKey - The public key of the wallet.
 * @param {PublicKey} tokenAddress - The public key of the token.
 * @returns {string|boolean} - The associated token address if it exists, otherwise false.
 */
async function checkAssociatedTokenAcount(
  connection,
  walletPubKey,
  tokenAddress
) {
  try {
    // Get the associated token address for your wallet and token mint
    const associatedTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenAddress,
      walletPubKey
    );

    // Get account info
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);

    if (accountInfo) {
      return associatedTokenAddress.toBase58();
    } else {
      return false;
    }
  } catch (e) {
    console.log("Error while checking associated token account: ", e);
  }
}

/**
 * Creates an associated token account for a given owner and mint public key.
 * @param {Connection} connection - The connection object.
 * @param {Account} owner - The owner account.
 * @param {PublicKey} mintPubKey - The mint public key.
 * @returns {string} - The base58 encoded associated token address.
 */
async function createAssociatedTokenAccount(connection, owner, mintPubKey) {
  try {
    const associatedTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubKey,
      owner.publicKey
    );
    // Check if the associated token account already exists
    const associatedTokenAccountInfo = await connection.getAccountInfo(
      associatedTokenAddress
    );
    const mint = new Token(connection, mintPubKey, TOKEN_PROGRAM_ID, owner);

    if (!associatedTokenAccountInfo) {
      // Create the associated token account if it doesn't exist
      await mint.createAssociatedTokenAccount(owner.publicKey);
    }
    return associatedTokenAddress.toBase58();
  } catch (e) {
    console.log("Error while creating associated token account: ", e);
  }
}

/**
 * Finds the associated token address for a given wallet address and token address.
 * @param {PublicKey} walletAddress - The wallet address.
 * @param {PublicKey} tokenAddress - The token address.
 * @returns {Promise<PublicKey>} - The associated token address.
 */
async function findAssociatedTokenAddress(walletAddress, tokenAddress) {
  const [result] = PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return result;
}

/**
 * Retrieves the bonding curve and associated bonding curve details for a given token.
 * @param {string} tokenAddress - The address of the token.
 * @returns {Promise<{bondingCurve: string, associatedBondingCurve: string}>} - The bonding curve and associated bonding curve details.
 */
async function getbondingCurveFromToken(tokenAddress) {
  const response = await fetch(
    `https://client-api-2-74b1891ee9f9.herokuapp.com/coins/${tokenMintAddress}`
  );
  const details = await response.json();

  return {
    bondingCurve: details.bonding_curve,
    associatedBondingCurve: details.associated_bonding_curve,
  };
}

module.exports = {
  getbondingCurveFromToken,
  findAssociatedTokenAddress,
  checkAssociatedTokenAcount,
  createAssociatedTokenAccount,
};
