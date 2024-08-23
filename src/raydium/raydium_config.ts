import {
  Raydium,
  TxVersion,
  parseTokenAccountResp,
} from "@raydium-io/raydium-sdk-v2";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { wallet, connection } from "../helpers/config";

const txVersion = TxVersion.V0;
const cluster = "mainnet";
export const initSdk = async () => {

  const raydium = await Raydium.load({
    owner: wallet,
    connection: connection,
    cluster: cluster,
    disableFeatureCheck: true,
    disableLoadToken: true,
    blockhashCommitment: "confirmed",
  });
  return raydium;
};
