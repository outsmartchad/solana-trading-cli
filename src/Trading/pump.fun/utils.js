const { PublicKey, Connection } = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
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
    // const associatedTokenAddress = await getAssociatedTokenAddress(
    //   ASSOCIATED_TOKEN_PROGRAM_ID,
    //   TOKEN_PROGRAM_ID,
    //   tokenAddress,
    //   walletPubKey
    // );
    const associatedTokenAddress = await getAssociatedTokenAddress(
      tokenAddress,
      walletPubKey,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Get account info
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);

    if (accountInfo) {
      return associatedTokenAddress;
    } else {
      return false;
    }
  } catch (e) {
    console.log("Error while checking associated token account: ", e);
  }
}

/**
 * Finds the associated token address for a given wallet address and token address.
 * @param {PublicKey} walletAddress - The wallet address.
 * @param {PublicKey} tokenAddress - The token address.
 * @returns {Promise<PublicKey>} - The associated token address.
 */
async function findAssociatedTokenAddress(walletAddress, tokenAddress) {
  const result = PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return result[0];
}

/**
 * Retrieves the bonding curve and associated bonding curve details for a given token.
 * @param {string} tokenAddress - The address of the token.
 * @returns {Promise<{bondingCurve: string, associatedBondingCurve: string}>} - The bonding curve and associated bonding curve details.
 */
async function getbondingCurveFromToken(tokenAddress) {
  const response = await fetch(
    `https://client-api-2-74b1891ee9f9.herokuapp.com/coins/${tokenAddress}` // or your API
  );
  console.log("response: ", response);
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
