import { wsol } from "../constants";
import { getCurrentPriceInUSD } from "../fetch-price";
import { connection } from "../../helpers/config";
import { PublicKey } from "@solana/web3.js";

export async function getCurrentMarketCap(
  tokenAddress: string
): Promise<number> {
  let priceInUSD: number = await getCurrentPriceInUSD(tokenAddress);
  const tokenSupply: any = await connection.getTokenSupply(
    new PublicKey(tokenAddress)
  );
  const marketCap: number = priceInUSD * tokenSupply.value.uiAmount;
  return marketCap;
}

//getCurrentMarketCap("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");
