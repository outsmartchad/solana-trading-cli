const {
  Raydium,
  TxVersion,
  parseTokenAccountResp,
} = require("@raydium-io/raydium-sdk-v2");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const {
  wallet,
  connection,
  second_connection,
  third_connection,
} = require("../helpers/config");

const txVersion = TxVersion.V0;
const cluster = "mainnet";
let raydium = Raydium | null;

const initSdk = async (params) => {
  if (raydium) return raydium;

  raydium = await Raydium.load({
    wallet,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: "finalized",
  });

  return raydium;
};

module.exports = { initSdk };
