import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { connection, wallet, wsol } from "../constants";
import { formatAmmKeysById_swap } from "./formatAmmKeys";
import { PublicKey } from "@solana/web3.js";
import { logger } from "../../../../utils";

export const initSdk = async () => {
  const raydium = await Raydium.load({
    owner: wallet,
    connection: connection,
    cluster: "mainnet",
    disableFeatureCheck: true,
    disableLoadToken: true,
    blockhashCommitment: "confirmed",
  });
  return raydium;
};

export async function fetchAMMPoolId(tokenAddress: string): Promise<string> {
  const raydium = await initSdk();
  const data:any = await raydium.api.fetchPoolByMints({
    mint1: wsol,
    mint2: tokenAddress,
  });
  const listOfPools = data.data;
  for (const obj of listOfPools) {
    if (obj.type === "Standard") {
      // return the first AMM pool ID
      console.log("AMM Pool ID: ", obj.id);
      return obj.id;
    }
  }
  logger.error("No AMM pool ID found for the given token address");
  return ""; // return empty string if no AMM pool ID is found
}
// async function main() {
//   const tokenAddress = "3B5wuUrMEi5yATD7on46hKfej3pfmd7t1RKgrsN3pump"; // billy
//   const poolId = await fetchAMMPoolId(tokenAddress);
//   console.log(await formatAmmKeysById_swap(new PublicKey(poolId)));

// }

// main();
