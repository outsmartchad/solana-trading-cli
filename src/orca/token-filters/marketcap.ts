import {fetchWhirlPool} from "../Pool";
import {getCurrentPriceInUSD} from "../fetch-price";
import { PublicKey } from "@solana/web3.js";
import { connection } from "../../helpers/config";
export async function getCurrentMarketCap(token_address:string):Promise<any> {
    const priceInUSD = await getCurrentPriceInUSD(token_address);
    const tokenSupply: any = await connection.getTokenSupply(
        new PublicKey(token_address)
      );
      const marketCap: number = priceInUSD * tokenSupply.value.uiAmount;
      return marketCap;
}

//getCurrentMarketCap("7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr");