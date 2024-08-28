import { PublicKey } from "@solana/web3.js";
import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
} from "@orca-so/whirlpools-sdk";
import {
  MAINNET_WHIRLPOOLS_CONFIG,
  WSOL,
  tick_spacing,
  client
} from "../constants";

export async function fetchWhirlPoolId(tokenAddress:string) {
    const tokenMint = new PublicKey(tokenAddress);
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
      ORCA_WHIRLPOOL_PROGRAM_ID,
      MAINNET_WHIRLPOOLS_CONFIG,
      WSOL.mint,
      tokenMint,
      tick_spacing
    ).publicKey;
    console.log("Pool Id: ", whirlpool_pubkey.toBase58());
    return whirlpool_pubkey.toBase58();
}
export async function fetchWhirlPool(tokenAddress:string) {
  const whirlPoolId = await fetchWhirlPoolId(tokenAddress);  
  const whirlpool = await client.getPool(new PublicKey(whirlPoolId));
  return whirlpool;
}

//fetchWhirlPool("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");
