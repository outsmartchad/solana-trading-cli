import 'rpc-websockets/dist/lib/client';
import { PublicKey, Keypair } from "@solana/web3.js";
import DLMM from '@meteora-ag/dlmm';
//const BN =require("bn.js");
import { Wallet, AnchorProvider, Program } from "@project-serum/anchor";
import { connection, wallet } from "../../../helpers/config";
import {PROGRAM_ID} from "./constants";
import {fetchDLMMPoolId} from "./fetch-pool";

const ourWallet = new Wallet(wallet);
const provider = new AnchorProvider(connection, ourWallet, {
  commitment: "confirmed",
});

async function swap(tokenAddress:string){
    const poolId = await fetchDLMMPoolId(tokenAddress);
    const dlmmPool = await DLMM.create(connection, new PublicKey(poolId));
    console.log(dlmmPool);


}
async function main(){
    const tokenAddress = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
    await swap(tokenAddress);
}
main();