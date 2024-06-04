const { PublicKey } = require("@solana/web3.js");
const { AnchorProvider } = require("@coral-xyz/anchor");
const { DecimalUtil, Percentage } = require("@orca-so/common-sdk");
const {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  swapQuoteByInputToken,
  IGNORE_CACHE,
} = require("@orca-so/whirlpools-sdk");
const Decimal = require("decimal.js");
const {
  connection,
  dev_connection,
  wallet,
} = require("../../../helpers/config");

async function main() {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const ctx = WhirlpoolContext.withProvider(
    provider,
    ORCA_WHIRLPOOL_PROGRAM_ID
  );
  const client = buildWhirlpoolClient(ctx);
  console.log("RPC endpoint: ", ctx.connection.rpcEndpoint);
  console.log("Wallet public key: ", ctx.wallet.publicKey.toString());
}

main();
