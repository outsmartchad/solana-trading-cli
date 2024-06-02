const {
  percentAmount,
  generateSigner,
  signerIdentity,
  createSignerFromKeypair,
  Umi,
  generatedSignerPayer,
} = require("@metaplex-foundation/umi");
const {
  TokenStandard,
  createAndMint,
} = require("@metaplex-foundation/mpl-token-metadata");
const {
  Metaplex,
  keypairIdentity,
  toMetaplexFile,
  irysStorage,
} = require("@metaplex-foundation/js");
const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const { mplCandyMachine } = require("@metaplex-foundation/mpl-candy-machine");
const { AuthorityType, setAuthority } = require("@solana/spl-token");
const bs58 = require("bs58");
const fs = require("fs");
const { PublicKey, Keypair } = require("@solana/web3.js");
const { program } = require("commander");
const {
  main_endpoint,
  dev_connection,
  dev_endpoint,
  connection,
  wallet,
} = require("../helpers/config");

// info
let payer_keypair_path = null,
  symbol = null,
  token_name = null,
  mintkeypair_path = null,
  supply = null,
  decimals = null,
  metadata_path = null,
  image_path = null,
  cluster = null,
  priority_fee = null,
  file_type = null,
  newConnection = null,
  endpoint = null;

// handle the input value from the user's command line here
program
  .option("--payer <PATH_TO_SECRET_KEY>", "Specify the path to the secret key")
  .option("--symbol <TOKEN_SYMBOL>", "Specify the token symbol")
  .option("--token_name <TOKEN_NAME>", "Specify the token name")
  .option(
    "--mint <PATH_TO_MINT_KEYPAIR>",
    "Specify the path to the mint keypair"
  )
  .option("--supply <SUPPLY_OF_TOKEN>", "Specify the supply of the token")
  .option("--decimals <DECIMALS>", "Specify the decimals")
  .option(
    "--metadata <PATH_METADATA_JSON>",
    "Specify the path to the metadata JSON"
  )
  .option("--image <PATH_TO_IMAGE>", "Specify the path to the image")
  .option("--cluster <CLUSTER>", "Specify the cluster")
  .option("--priority-fee <PRIORITY_FEE>", "Specify the priority fee")
  .option("--file_type <FILE_TYPE>", "Specify the file type")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node create --payer <PATH_TO_SECRET_KEY> --symbol <TOKEN_SYMBOL> --token_name <TOKEN_NAME> --mint <PATH_TO_MINT_KEYPAIR> --supply <SUPPLY_OF_TOKEN> --decimals <DECIMALS> --metadata <PATH_METADATA_JSON> --image <PATH_TO_IMAGE> --cluster <CLUSTER> --priority-fee <PRIORITY_FEE> --file_type <FILE_TYPE>"
      );
      process.exit(0);
    }
    if (
      !options.symbol ||
      !options.token_name ||
      !options.supply ||
      !options.decimals ||
      !options.metadata ||
      !options.image ||
      !options.cluster ||
      !options.file_type
    ) {
      console.log(
        "Please provide the required param's value, except the mint keypair path."
      );
      process.exit(1);
    }
    if (options.payer) {
      payer_keypair_path = options.payer;
    }

    symbol = options.symbol;
    token_name = options.token_name;
    mintkeypair_path = options.mint;
    supply = options.supply;
    decimals = options.decimals;
    metadata_path = options.metadata;
    image = options.image;
    cluster = options.cluster;
    priority_fee = options.priority;
    file_type = options.file_type;
    image_path = options.image;
    supply = parseInt(supply) * Math.pow(10, decimals);

    // Handle the logic for the create command
  });
program.parse();

// handle the cluster logic here
if (cluster === "devnet") {
  newConnection = dev_connection;
  endpoint = dev_endpoint;
} else if (cluster === "mainnet") {
  newConnection = connection;
  endpoint = main_endpoint;
} else {
  console.log("Please provide the correct cluster name");
  process.exit(1);
}

// creating the wallet and the mint keypair
let mintSecret, newKeypair; //

const metadata = JSON.parse(
  fs.readFileSync(metadata_path, { encoding: "utf8" })
);
if (!mintkeypair_path) {
  newKeypair = Keypair.generate();
  mintSecret = Uint8Array.from(newKeypair.secretKey);
  console.log("Mint address: ", newKeypair.publicKey.toBase58());
} else {
  mintSecret = loadOrCreateKeypair(mintkeypair_path);
}
let payerSecret = null,
  PayerWallet = null;
// create the Umi object
const umi = createUmi(endpoint); //Replace with your RPC Endpoint

// create the payer wallet
if (payer_keypair_path) {
  payerSecret = loadOrCreateKeypair(payer_keypair_path);
  PayerWallet = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(payerSecret)
  );
} else {
  PayerWallet = umi.eddsa.createKeypairFromSecretKey(wallet.secretKey);
}

const userWalletSigner = createSignerFromKeypair(umi, PayerWallet);

const mintKeypair = umi.eddsa.createKeypairFromSecretKey(
  new Uint8Array(mintSecret)
);
const mintSigner = createSignerFromKeypair(umi, mintKeypair);

// use the Umi object to create the token
umi.use(signerIdentity(userWalletSigner));
umi.use(mplCandyMachine());

/**
 * Loads or creates a keypair for the wallet.
 * If the keypair file exists at the specified filepath, it will be loaded.
 * Otherwise, a new keypair will be generated, saved to the filepath, and returned.
 *
 * @param {string} filepath - The filepath to the keypair file.
 * @returns {Keypair} - The loaded or newly created keypair.
 * @throws {Error} - If there is an error reading or writing the keypair file.
 */
async function loadOrCreateKeypair_wallet(filepath) {
  try {
    const keypairString = fs.readFileSync(filepath, { encoding: "utf8" });
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairString)));
  } catch (error) {
    const newKeypair = Keypair.generate();
    fs.writeFileSync(
      filepath,
      JSON.stringify(Array.from(newKeypair.secretKey))
    );
    console.log(`New keypair created and saved to ${filepath}`);
    return newKeypair;
  }
}
/**
 * Loads or creates a keypair from the specified file path.
 * @param {string} filepath - The path to the keypair file.
 * @returns {Uint8Array} - The loaded or created keypair.
 */
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
/**
 * Revokes the freeze authority for a given mint and owner.
 * @param {string} mint - The mint address.
 * @param {string} payer - The payer address.
 * @param {string} owner - The owner address.
 * @returns {Promise<void>} - A promise that resolves when the freeze authority is disabled.
 */
async function revokeFreeze(mint, payer, owner) {
  console.log("Disabling the freeze authority...");
  await setAuthority(
    newConnection,
    payer,
    mint,
    owner,
    AuthorityType.FreezeAccount,
    null
  ).catch((e) => {
    console.log(e);
    revokeFreeze(mint, payer, owner);
  });
}
/**
 * Revokes the mint authority for a given mint, payer, and owner.
 * @param {string} mint - The mint address.
 * @param {string} payer - The payer address.
 * @param {string} owner - The owner address.
 * @returns {Promise<void>} - A promise that resolves when the mint authority is revoked.
 */
async function revokeMint(mint, payer, owner) {
  console.log("Disabling the mint authority...");
  await setAuthority(
    newConnection,
    payer,
    mint,
    owner,
    AuthorityType.MintTokens,
    null
  ).catch((e) => {
    console.log(e);
    revokeMint(mint, payer, owner);
  });
}
/**
 * Retrieves the Metaplex instance for interacting with the Metaplex protocol.
 * @param {string} walletPath - The path to the wallet.
 * @returns {Promise<Metaplex>} The Metaplex instance.
 */
async function getMetaplex(walletPath) {
  let WALLET = null;
  if (walletPath === null) WALLET = wallet;
  else WALLET = await loadOrCreateKeypair_wallet(walletPath);
  const METAPLEX = Metaplex.make(newConnection)
    .use(keypairIdentity(WALLET))
    .use(
      irysStorage({
        address: "https://devnet.irys.xyz", // devnet
        providerUrl: endpoint,
        timeout: 120000,
      })
    );
  return METAPLEX;
}

/**
 * Uploads metadata for a token.
 * @param {string} imgUri - The URI of the token's image.
 * @param {string} imgType - The type of the token's image.
 * @param {string} nftName - The name of the token.
 * @param {string} description - The description of the token.
 * @param {string} website - The website associated with the token.
 * @param {string} twitter - The Twitter handle associated with the token.
 * @param {string} telegram - The Telegram handle associated with the token.
 * @param {Metaplex} METAPLEX - The Metaplex instance used for uploading metadata.
 * @returns {Promise<string>} - The URI of the uploaded metadata.
 */
async function uploadMetadata(
  imgUri,
  imgType,
  nftName,
  symbol,
  description,
  website,
  twitter,
  telegram,
  METAPLEX = Metaplex.make(newConnection)
) {
  const uri = await METAPLEX.nfts().uploadMetadata({
    name: nftName,
    symbol: symbol,
    image: imgUri,
    description: description,
    extensions: {
      website: website,
      twitter: twitter,
      telegram: telegram,
    },
    tags: ["Meme"],
    isMutable: true,
    properties: {
      files: [
        {
          type: imgType,
          uri: imgUri,
        },
      ],
    },
  });
  console.log("Metadata URI:", uri);
  return uri.uri;
}
/**
 * Uploads an image file to the Metaplex storage and returns the image URI.
 * @param {string} filePath - The path of the image file to upload.
 * @param {string} fileName - The name of the image file.
 * @param {Metaplex} METAPLEX - The Metaplex instance.
 * @returns {Promise<string>} The image URI.
 */
async function uploadImage(
  filePath,
  fileName,
  METAPLEX = Metaplex.make(newConnection)
) {
  const imgBuffer = fs.readFileSync(filePath);
  const imgMetaplexFile = toMetaplexFile(imgBuffer, fileName);
  const imgUri = await METAPLEX.storage().upload(imgMetaplexFile);
  console.log("Image URI:", imgUri);
  return imgUri;
}
/**
 * Creates a meme token with a given cap that is minted to the owner's wallet.
 * @param {string} name - The name of the meme token.
 * @param {string} symbol - The symbol of the meme token.
 * @param {string} filetype - The file type of the meme image.
 * @param {string} description - The description of the meme token.
 * @param {string} website - The website URL of the meme token.
 * @param {string} twitter - The Twitter handle of the meme token.
 * @param {string} telegram - The Telegram handle of the meme token.
 * @param {string} ownerWallet - The public key of the owner's wallet.
 * @param {number} max_supply - The maximum supply of the meme token.
 * @param {number} decimals - The number of decimal places for the meme token.
 * @param {string} imgURI - The URI of the meme image.
 * @param {string} uri - The URI of the meme token metadata.
 * @param {object} mintSigner - The mint signer object.
 * @returns {Promise<void>} A promise that resolves when the meme token is created.
 */
async function createMeme(
  name,
  symbol,
  filetype,
  description,
  website,
  twitter,
  telegram,
  ownerWallet,
  max_supply,
  decimals,
  imgURI,
  uri,
  mintSigner
) {
  const CONFIG = {
    uploadPath: image_path,
    imgFileName: `${name}.${filetype}`,
    imgType: `image/${filetype}`,
    imgName: name,
    description: description,
    website: website,
    twitter: twitter,
    telegram: telegram,
    sellerFeeBasisPoints: percentAmount(0), //200 bp = 2%
    symbol: symbol,
    creators: [{ address: ownerWallet.publicKey, share: 100 }],
  };
  // 1: upload the metadata and get the uri
  const metaplex = await getMetaplex(payer_keypair_path);
  if (imgURI === "") {
    console.log("Uploading the medata and get the uri...");
    const imgUri = await uploadImage(
      CONFIG.uploadPath,
      CONFIG.imgFileName,
      metaplex
    );
    imgURI = imgUri;
  }
  if (uri === "") {
    console.log("Uploading the metadata and get the uri...");
    uri = await uploadMetadata(
      imgURI,
      CONFIG.imgType,
      CONFIG.imgName,
      CONFIG.symbol,
      CONFIG.description,
      CONFIG.website,
      CONFIG.twitter,
      CONFIG.telegram,
      metaplex
    );
  }
  // 2: mint the token to the ownerWallet
  const mint = mintSigner;
  console.log(`Minting CA(${mint.publicKey}) to ${ownerWallet.publicKey}`);
  await mint_token(
    umi,
    mint,
    name,
    symbol,
    uri,
    ownerWallet,
    max_supply,
    decimals
  ).catch((e) => {
    console.log(e);
  });
  let ownerWallet_keypair = null;
  if (payerSecret === null) {
    ownerWallet_keypair = Keypair.fromSecretKey(wallet.secretKey);
  } else {
    ownerWallet_keypair = Keypair.fromSecretKey(new Uint8Array(payerSecret));
  }
  await revokeMint(
    new PublicKey(mint.publicKey),
    ownerWallet_keypair,
    ownerWallet_keypair
  ).catch((e) => {
    console.log(e);
  });
  await revokeFreeze(
    new PublicKey(mint.publicKey),
    ownerWallet_keypair,
    ownerWallet_keypair
  ).catch((e) => {
    console.log(e);
  });
}
/**
 * Mint a token with the specified parameters that is owned by the specified owner.
 *
 * @param {Object} umi - The UMI object.
 * @param {Object} mint - The mint object.
 * @param {string} name - The name of the token.
 * @param {string} symbol - The symbol of the token.
 * @param {string} uri - The URI of the token.
 * @param {Object} owner - The owner object.
 * @param {number} amount - The amount of tokens to mint.
 * @param {number} decimals - The number of decimals for the token.
 * @returns {Promise<void>} - A promise that resolves when the token is successfully minted.
 */
async function mint_token(
  umi,
  mint,
  name,
  symbol,
  uri,
  owner,
  amount,
  decimals
) {
  try {
    console.log(`minting token ${name}, CA: ${mint.publicKey}`);
    await createAndMint(umi, {
      mint: mint,
      authority: umi.identity,
      name: name,
      symbol: symbol,
      uri: uri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: decimals,
      amount: amount,
      tokenOwner: owner.publicKey,
      tokenStandard: TokenStandard.Fungible,
      isMutable: false,
    })
      .sendAndConfirm(umi)
      .then(() => {
        console.log("Successfully minted tokens (", mint.publicKey, ")");
      });
  } catch (e) {
    console.log(e);
    console.log("The mint is failed, please try again...");
    mint_token(umi, mint, name, symbol, uri, owner, amount, decimals);
  }
}
async function main() {
  createMeme(
    token_name,
    symbol,
    file_type,
    metadata.description,
    "",
    "",
    "",
    PayerWallet,
    supply,
    decimals,
    "",
    "",
    mintSigner
  );
}
main();

module.exports = { loadOrCreateKeypair };
