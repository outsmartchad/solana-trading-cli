const { bs58 } =require ("@coral-xyz/anchor/dist/cjs/utils/bytes");
const { getAssociatedTokenAddressSync } =require ("@solana/spl-token");
const {
  Keypair,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
} =require ("@solana/web3.js");
const { sha256 } =require ("js-sha256");

const fs =require ("fs");

 function getOrCreateKeypair(dir, keyName) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const authorityKey = dir + "/" + keyName + ".json";
  if (fs.existsSync(authorityKey)) {
    const data= JSON.parse(fs.readFileSync(authorityKey, "utf-8"));
    return Keypair.fromSecretKey(bs58.decode(data.secretKey));
  } else {
    const keypair = Keypair.generate();
    keypair.secretKey;
    fs.writeFileSync(
      authorityKey,
      JSON.stringify({
        secretKey: bs58.encode(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58(),
      })
    );
    return keypair;
  }
}

 function getKeypairByJsonPath(jsonPath) {
  try {
    const keypairJson = fs.readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(keypairJson);
    const mintKeypair = Keypair.fromSecretKey(Uint8Array.from(data));
    return mintKeypair
  } catch (e) {
    console.log(e);
  }
}

async function printSOLBalance  (
  connection,
  pubKey,
  info = ""
) {
  const balance = await connection.getBalance(pubKey);
  console.log(
    `${info ? info + " " : ""}${pubKey.toBase58()}:`,
    balance / LAMPORTS_PER_SOL,
    `SOL`
  );
};

async function getSPLBalance  (
  connection,
  mintAddress,
  pubKey,
  allowOffCurve = false
) {
  try {
    let ata = getAssociatedTokenAddressSync(mintAddress, pubKey, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(ata, "processed");
    return balance.value.uiAmount;
  } catch (e) {}
  return null;
};

async function printSPLBalance (
  connection,
  mintAddress,
  user,
  info = ""
) {
  const balance = await getSPLBalance(connection, mintAddress, user);
  if (balance === null) {
    console.log(
      `${info ? info + " " : ""}${user.toBase58()}:`,
      "No Account Found"
    );
  } else {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
  }
};

 const baseToValue = (base, decimals) => {
  return base * Math.pow(10, decimals);
};

 const valueToBase = (value, decimal) => {
  return value / Math.pow(10, decimals);
};

//i.e. account:BondingCurve
 function getDiscriminator(name) {
  return sha256.digest(name).slice(0, 8);
}

module.exports = {
  getOrCreateKeypair,
  getKeypairByJsonPath,
  printSOLBalance,
  getSPLBalance,
  printSPLBalance,
  baseToValue,
  valueToBase,
  getDiscriminator,
};