const { AuthorityType, setAuthority } = require("@solana/spl-token");
const bs58 = require("bs58");
const fs = require("fs");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { program } = require("commander");
const { connection, dev_connection } = "../Pool/config.js";

let newConnection = null;
// node revoke_authority --payer <PATH_TO_SECRET_KEY> --token-address <ADDRESS_TOKEN> mint freeze
let payer_keypair_path = null,
  token_address = null,
  mint = false,
  freeze = false;
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--mint_address <ADDRESS_TOKEN>", "Specify the token address")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("-m, --mint", "Specify the mint")
  .option("-f, --freeze", "Specify the freeze")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node revoke_authority --payer <PATH_TO_SECRET_KEY> --mint_address <ADDRESS_TOKEN> --cluster <CLUSTER> --mint --freeze"
      );
      process.exit(0);
    }
    if (!options.payer || !options.mint_address || !options.cluster) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    payer_keypair_path = options.payer;
    token_address = options.mint_address;
    if (options.mint) {
      mint = true;
    }
    if (options.freeze) {
      freeze = true;
    }
    cluster = options.cluster;
    if (cluster === "devnet") {
      newConnection = connection;
    } else if (cluster === "mainnet") {
      newConnection = dev_connection;
    } else {
      console.error("❌ Cluster not supported");
      process.exit(1);
    }
  });
program.parse();
function loadOrCreateKeypair(filepath) {
  try {
    const keypairStringArr = fs.readFileSync(filepath, {
      encoding: "utf8",
    });
    const res = Uint8Array.from(JSON.parse(keypairStringArr));
    return res;
  } catch (error) {
    console.log(error);
    console.log(`File ${filepath} not Found!`);
    process.exit(1);
  }
}
async function revokeMint(mint, payer, owner) {
  console.log("Disabling the mint authority...");
  await setAuthority(
    newConnection,
    payer,
    mint,
    owner,
    AuthorityType.MintTokens,
    null
  ).catch((error) => {
    console.error(error);
    console.log("Error: try again...");
    revokeMint(mint, payer, owner);
  });
}
async function revokeFreeze(mint, payer, owner) {
  console.log("Disabling the freeze authority...");
  await setAuthority(
    newConnection,
    payer,
    mint,
    owner,
    AuthorityType.FreezeAccount,
    null
  ).catch((error) => {
    console.error(error);
    console.log("Error: try again...");
    revokeFreeze(mint, payer, owner);
  });
}

async function revokeAuthority() {
  const payerSecretKey = loadOrCreateKeypair(payer_keypair_path);
  const payer = Keypair.fromSecretKey(payerSecretKey);
  const token_mint = new PublicKey(token_address);
  if (mint) {
    await revokeMint(token_mint, payer, payer);
  }
  if (freeze) {
    await revokeFreeze(token_mint, payer, payer);
  }
}

revokeAuthority();
