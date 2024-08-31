import { Keypair } from "@solana/web3.js";
import {swap} from "./swap";
import {connection} from "../constants"
import { VersionedTransaction } from "@solana/web3.js";


export async function buy(side = "buy", address: string, no_of_sol: number, payer: Keypair): Promise<any> {    
    return await swap(side, address, no_of_sol, -1, payer, "trade", connection);
}
  