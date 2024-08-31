import { Keypair } from "@solana/web3.js";
import {swap} from "./swap";
import {connection} from "../constants"
import { VersionedTransaction } from "@solana/web3.js";


export async function sell(side = "sell", address: string, sell_amount: number, payer: Keypair): Promise<any> {
    return await swap(side, address, -1, sell_amount, payer, "trade", connection);
}
