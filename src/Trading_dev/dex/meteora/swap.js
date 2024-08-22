const { Amm, IDL } = require("./idl.js");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const BN = require("bn.js");
const { Wallet, AnchorProvider, Program } = require("@project-serum/anchor");
const AmmImpl = require("@mercurial-finance/dynamic-amm-sdk");
const { connection, wallet } = require("../../../helpers/config.js");
const {PROGRAM_ID} = require("./constants.js")

console.log("PROGRAM_ID", PROGRAM_ID);
const ourWallet = new Wallet(wallet);
const provider = new AnchorProvider(connection, Wallet, {
  commitment: "confirmed",
});

async function swapQuote(poolAddress, swapAmount, isSwapAtoB) {

}
