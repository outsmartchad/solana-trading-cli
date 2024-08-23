const{
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Finality,
  Keypair,
  PublicKey,
  SendTransactionError,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  VersionedTransactionResponse,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram
} =require ("@solana/web3.js");
const{ AnchorProvider } =require ("@coral-xyz/anchor");
const {PumpFunSDK, DEFAULT_DECIMALS} = require("./pumpfun.js")
const{ PriorityFee, TransactionResult } =require ("./types.js");
const{ jito_executeAndConfirm } =require ("./transactions/jito-tx-executor.js");
const fs =require ("fs");
const{ bs58 } =require ("@coral-xyz/anchor/dist/cjs/utils/bytes");
const {
  getOrCreateKeypair,
  getSPLBalance,
  printSOLBalance,
  printSPLBalance,
  getKeypairByJsonPath,
} = require("../example/util.js");
const DEFAULT_COMMITMENT = "finalized";
const DEFAULT_FINALITY = "finalized";

const calculateWithSlippageBuy = (
  amount,
  basisPoints
) => {
  return amount + (amount * basisPoints) / 10000n;
};

const calculateWithSlippageSell = (
  amount,
  basisPoints
) => {
  return amount - (amount * basisPoints) / 10000n;
};

function readCSVFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data;
  } catch (err) {
    console.error("Error reading the CSV file:", err);
    return null;
  }
}

async function sendTxToJito(
  connection,
  tx,
  payer,
  signers,
  jitofee
){
  const blockhash = (await connection.getLatestBlockhash());
  let final_tx = new Transaction();
  final_tx.add(tx);
  let versionedTx = await buildVersionedTx(connection, payer.publicKey, final_tx, connection.commitment);
  versionedTx.sign(signers);
    try{
      const {confirmed, signature} = await jito_executeAndConfirm(versionedTx, payer, blockhash, jitofee);
      // let txResult = await getTxDetails(connection, signature, connection.commitment, DEFAULT_FINALITY);
    if (!confirmed) {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
    return {
      success: true,
      signature: signature,
    };
  
    }catch(e){
      if(e instanceof SendTransactionError){
        let ste = e;
        console.log(await ste.getLogs(connection));
      }else{
        console.error(e);
      }
      return {
        error: e,
        success: false,
      };
    }
    
  
}

async function sendTx(
  connection,
  tx,
  payer,
  signers,
  priorityFees,
  commitment = DEFAULT_COMMITMENT,
  finality = DEFAULT_FINALITY
){
  let newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }

  newTx.add(tx);
  let versionedTx = await buildVersionedTx(connection, payer, newTx, commitment);
  versionedTx.sign(signers);

  try {
    const sig = await connection.sendTransaction(versionedTx, {
      skipPreflight: true,
    });

    console.log("sig:", `https://solscan.io/tx/${sig}`);

    let txResult = await getTxDetails(connection, sig, commitment, finality);
    if (!txResult) {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
    return {
      success: true,
    };
  } catch (e) {
    if (e instanceof SendTransactionError) {
      let ste = e;
      console.log(await ste.getLogs(connection));
    } else {
      console.error(e);
    }
    return {
      error: e,
      success: false,
    };
  }
}

async function buildVersionedTx (
  connection,
  payer,
  tx,
  commitment = DEFAULT_COMMITMENT
){
  const blockHash = (await connection.getLatestBlockhash(commitment))
    .blockhash;

  let messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockHash,
    instructions: tx.instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

async function getTxDetails (
  connection,
  sig,
  commitment = DEFAULT_COMMITMENT,
  finality= DEFAULT_FINALITY
){
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig,
    },
    commitment
  );

  return connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: finality,
  });
};

function generateKeysAndAllocateSol(targetNumberOfKeys, targetTotalSol) {
  // Generate private keys
  const keys = [];
  let sum = 0;
  for (let i = 0; i < targetNumberOfKeys; i++) {
    const keypair = Keypair.generate();
    keys.push(bs58.encode(keypair.secretKey));
  }

  // Allocate SOL with randomness
  const averageAllocation = targetTotalSol / targetNumberOfKeys;
  const maxDeviation = averageAllocation * 0.2; // 10% deviation

  const allocations = [];
  let totalAllocated = 0;

  for (let i = 0; i < targetNumberOfKeys - 1; i++) {
    const randomDeviation = (Math.random() * 2 - 1) * maxDeviation;
    const allocation = parseFloat(
      (averageAllocation + randomDeviation).toFixed(10)
    );
    allocations.push({ privateKey: keys[i], sol: allocation });
    sum += allocation + 0.004;
    totalAllocated += allocation;
  }

  // Adjust the last allocation to match the target total precisely
  const lastAllocation = parseFloat(
    (targetTotalSol - totalAllocated).toFixed(10)
  );

  allocations.push({
    privateKey: keys[targetNumberOfKeys - 1],
    sol: lastAllocation,
  });
  console.log("sum", sum);
  return allocations;
}

// Function to write the allocations to a CSV file
async function writeAllocationsToCSV(filePath, allocations) {
  const csvContent = allocations
    .map(({ privateKey, sol }) => `${privateKey},${sol}`)
    .join("\n");
  fs.writeFileSync(filePath, csvContent, "utf8");
}
 async function dropWalletBySOL(connection, walletListWithSOL, fundingWallet) {
  console.log(fundingWallet.publicKey.toBase58());
  for (let i = 0; i < walletListWithSOL.length; i++) {
    // we bundle 5 wallet to drop sol
    if (i % 5 == 0) {
      let final_tx = new Transaction();
      let fiveSigners = [];
      for (let j = i; j < i + 5; j++) {
        let secretKey = new Uint8Array(
          bs58.decode(walletListWithSOL[j].privateKey)
        );
        let sniperWallets = Keypair.fromSecretKey(secretKey);
        console.log("Existing wallet: ", sniperWallets.publicKey.toBase58());
        console.log(
          "it needs to drop: ",
          walletListWithSOL[j].SOL * LAMPORTS_PER_SOL
        );
        final_tx.add(
          SystemProgram.transfer({
            fromPubkey: fundingWallet.publicKey,
            toPubkey: sniperWallets.publicKey,
            lamports: Math.round(walletListWithSOL[j].SOL * LAMPORTS_PER_SOL),
          })
        );
        fiveSigners.push(sniperWallets);
      }

      // Send the transaction
      await sendTx(
        connection,
        final_tx,
        fundingWallet.publicKey,
        [fundingWallet],
        {
          unitLimit: 250000,
          unitPrice: 0.005 * LAMPORTS_PER_SOL,
        }
      );
    }
  }
}

async function extractPrivateKeyAndSolana(data, numberOfSnipers) {
  // Split the input string by newlines to handle multiple lines of input
  const lines = data.split("\n");
  const pathToBoughtSnipers =
    "/Users/chiwangso/Desktop/beta-memecoin-cli/src/memecoin-launch/pumpdotfun-sdk/src/WalletKeypairs/already3.json";
  let boughtSnipers = [];
  try {
    const fileContents = await fs.promises.readFile(
      pathToBoughtSnipers,
      "utf8"
    );
    boughtSnipers = JSON.parse(fileContents);
  } catch (error) {
    // If the file doesn't exist, it's okay, we'll just create a new one
  }
  // Initialize an array to hold the results
  const results= [];
  let cnt = 0;

  // Iterate over each line
  lines.forEach((line) => {
    // Split the line by the comma to separate the private key and the number
    const parts = line.split(",");

    // Check if the line has both a private key and a number
    if (parts.length >= 2) {
      const privateKey = parts[0].trim();
      const SOL = parseFloat(parts[1].trim());
      const keypair = Keypair.fromSecretKey(
        new Uint8Array(bs58.decode(privateKey))
      );

      // Push the result as an object if the status is not "done" and the count is less than the number of snipers
      if (
        cnt < numberOfSnipers &&
        !boughtSnipers.includes(keypair.publicKey.toBase58())
      ) {
        results.push({
          privateKey,
          SOL,
        });
        cnt++;
      }
    }
  });

  return results;
}

 async function getKeypairFromCsv(pathToCsv, numberOfSnipers) {
  const data = await readCSVFile(pathToCsv);
  const extractedData = await extractPrivateKeyAndSolana(data, numberOfSnipers);
  let keypairList = [];
  for (let i = 0; i < extractedData.length; i++) {
    let secretKey = new Uint8Array(bs58.decode(extractedData[i].privateKey));
    let keypair = Keypair.fromSecretKey(secretKey);
    keypairList.push(keypair);
  }
  return keypairList;
}

 

async function getOtherTradersWallet(mintPubKey) {
  let page = 1;
  let allOwners = new Set();

  while (true) {
    const response = await fetch(
      "YOUR_RPC_URL",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "getTokenAccounts",
          id: "helius-test",
          params: {
            page: page,
            limit: 1000,
            displayOptions: {},
            mint: mintPubKey.toBase58(),
          },
        }),
      }
    );
    const data = await response.json();

    if (!data.result || data.result.token_accounts.length === 0) {
      break;
    }
    data.result.token_accounts.forEach((account) =>
      allOwners.add(account.owner)
    );
    page++;
  }

  return Array.from(allOwners) ;
  // return a list of outsider wallet address
  // [
  //    "owner": amount
  //    "owner2": amount
  //]
}


async function getOurWallet() {
  // return a list of our wallet address
  const pathToSave =
    "/Users/chiwangso/Desktop/beta-memecoin-cli/src/memecoin-launch/pumpdotfun-sdk/src/WalletKeypairs/already3.json";
  let listOfOurWallets= [];
  const fileContents = await fs.promises.readFile(pathToSave, "utf8");
  listOfOurWallets = JSON.parse(fileContents);
  return listOfOurWallets ;
}

async function solCollector(connection, wallet, numberOfSnipers, pathToSnipersPrivateKey) {

  let sniperKeypairs = [];
  const privateKeysArr = await fs.promises.readFile(pathToSnipersPrivateKey, "utf8");
  existingWallets = JSON.parse(privateKeysArr);

  for (let i = 0; i < existingWallets.length; i++) {
    const sniperWallet = Keypair.fromSecretKey(bs58.decode(existingWallets[i]));
    sniperKeypairs.push(sniperWallet);
  }
  console.log("Sol Collector is start");
  let final_tx = new Transaction();
  for (let i = 0; i < numberOfSnipers; i++) {
    const solbalance = await connection.getBalance(sniperKeypairs[i].publicKey);
    console.log(
      `Sniper ${sniperKeypairs[i].publicKey.toBase58()} SOL balance: `,
      solbalance
    );
    final_tx.add(
      SystemProgram.transfer({
        fromPubkey: sniperKeypairs[i].publicKey,
        toPubkey: wallet.publicKey,
        lamports: solbalance,
      })
    );
  }
  //send the transaction

  await sendTx(
    connection,
    final_tx,
    wallet.publicKey,
    [wallet, ...sniperKeypairs],
    {
      unitLimit: 250000,
      unitPrice: 750000,
    }
  );
}

async function dropSOLToWallet(connection, masterWallet, walletPublicAddress, SOLToDrop) {
  let final_tx = new Transaction();
  final_tx.add(
    SystemProgram.transfer({
      fromPubkey: masterWallet.publicKey,
      toPubkey: walletPublicAddress,
      lamports: Math.round(SOLToDrop * LAMPORTS_PER_SOL),
    })
  );
  const blockhash = await connection.getLatestBlockhash("confirmed");
  final_tx.feePayer = masterWallet.publicKey;
  final_tx.recentBlockhash = blockhash.blockhash;
  await sendTxToJito(
    connection,
    final_tx,
    masterWallet,
    [masterWallet],
    0.0001
  );
}
async function getNumberOfKeypairsArrayFromPath(
  path,
  numberOfKeypairs
){
  let existingWallets = [];
  let resWalletKeypairs = [];
  try {
    const fileContents = await fs.promises.readFile(path, "utf8");
    existingWallets = JSON.parse(fileContents);
    for (let i = 0; i < numberOfKeypairs; i++) {
      const secretKey = new Uint8Array(bs58.decode(existingWallets[i]));
      const wallet = Keypair.fromSecretKey(secretKey);
      console.log(wallet.publicKey.toBase58());
      resWalletKeypairs.push(wallet);
    }
    return resWalletKeypairs;
  } catch (error) {
    // If the file doesn't exist, it's okay, we'll just create a new one
  }
  return resWalletKeypairs;
}

 async function generateWalletsAndDropSOL(
  connection,
  masterWallet,
  amountOfSol,
  numberOfNewWallet,
  pathToSave
){
  // Check if the file already exists
  let existingWallets= [];
  try {
    const fileContents = await fs.promises.readFile(pathToSave, "utf8");
    existingWallets = JSON.parse(fileContents);
  } catch (error) {
    // If the file doesn't exist, it's okay, we'll just create a new one
  }
  let final_tx = new Transaction();
  for (let i = 0; i < existingWallets.length; i++) {
    const wallet = Keypair.fromSecretKey(bs58.decode(existingWallets[i]));
    console.log("Existing wallet: ", wallet.publicKey.toBase58());
    final_tx.add(
      SystemProgram.transfer({
        fromPubkey: masterWallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: amountOfSol * LAMPORTS_PER_SOL,
      })
    );
  }
  // Generate new wallets and append to the existing array
  for (let i = 0; i < numberOfNewWallet; i++) {
    let newWallet = Keypair.generate();

    console.log("New wallet created: ", newWallet.publicKey.toBase58());
    const privateKey = bs58.encode(newWallet.secretKey);
    existingWallets.push(privateKey);
    // Transfer SOL to the new wallet
    final_tx.add(
      SystemProgram.transfer({
        fromPubkey: masterWallet.publicKey,
        toPubkey: newWallet.publicKey,
        lamports: amountOfSol * LAMPORTS_PER_SOL,
      })
    );
  }

  // Send the transaction
  const blockhash = await connection.getLatestBlockhash("confirmed");
  final_tx.feePayer = masterWallet.publicKey;
  final_tx.recentBlockhash = blockhash.blockhash;
  await sendTxToJito(
    connection,
    final_tx,
    masterWallet,
    [masterWallet],
    0.0001
  );

  // Save the updated array to the file
  try {
    await fs.promises.writeFile(
      pathToSave,
      JSON.stringify(existingWallets, null, 2)
    );
    console.log(`Wallets saved to ${pathToSave}`);
  } catch (error) {
    console.error(`Error saving wallets to ${pathToSave}:`, error);
  }

  return existingWallets;
}

 async function checkIfBondingCurveComplete(connection, wallet, mintKeypair) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });

  const sdk = new PumpFunSDK(provider);
  const bondingCurveAccount = await sdk.getBondingCurveAccount(
    mintKeypair.publicKey
  );
  console.log("bondingCurveAccount: ", bondingCurveAccount);
  return bondingCurveAccount?.complete;
}

module.exports = {generateWalletsAndDropSOL, getNumberOfKeypairsArrayFromPath, dropSOLToWallet, solCollector, getOurWallet, getOtherTradersWallet, getKeypairFromCsv, extractPrivateKeyAndSolana, sendTx, sendTxToJito, readCSVFile, calculateWithSlippageSell, calculateWithSlippageBuy, DEFAULT_COMMITMENT, DEFAULT_FINALITY, sendTxToJito, buildVersionedTx, getTxDetails, generateKeysAndAllocateSol, writeAllocationsToCSV, dropWalletBySOL, getKeypairFromCsv, extractPrivateKeyAndSolana, getOtherTradersWallet, getOurWallet, solCollector, dropSOLToWallet, getNumberOfKeypairsArrayFromPath, generateWalletsAndDropSOL, checkIfBondingCurveComplete}