import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  swapQuoteByInputToken,
  IGNORE_CACHE,
} from "@orca-so/whirlpools-sdk";
import Decimal from "decimal.js";
import {
  connection,
  dev_connection,
  wallet,
} from "../helpers/config";
const ourWallet = new Wallet(wallet);
async function main() {
  const provider = new AnchorProvider(connection, ourWallet, {
    commitment: "confirmed",
  });
  const ctx = WhirlpoolContext.withProvider(
    provider,
    ORCA_WHIRLPOOL_PROGRAM_ID
  );
  const client = buildWhirlpoolClient(ctx);
  console.log("Whirlpool client: ", client);
  console.log("RPC endpoint: ", ctx.connection.rpcEndpoint);
  console.log("Wallet public key: ", ctx.wallet.publicKey.toString());
}

main();
