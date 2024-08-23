const DLMM = require('@meteora-ag/dlmm');
const { PublicKey, Keypair } = require("@solana/web3.js");
const BN = require("bn.js");
const { Wallet, AnchorProvider, Program } = require("@project-serum/anchor");
const { connection, wallet } = require("../../../helpers/config.js");
const {PROGRAM_ID} = require("./constants.js")
const {fetchDLMMPoolId} = require("./fetch-pool.js")

console.log("PROGRAM_ID", PROGRAM_ID);
const ourWallet = new Wallet(wallet);
const provider = new AnchorProvider(connection, Wallet, {
  commitment: "confirmed",
});

async function swap(tokenAddress){
    const poolId = await fetchDLMMPoolId(tokenAddress);
    const dlmmPool = await DLMM.create(connection, new PublicKey(poolId));
    console.log(dlmmPool);


}
async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    await swap(tokenAddress);
}
main();