const {
  Program,
  AnchorProvider,
  setProvider,
  Wallet,
} = require("@coral-xyz/anchor");
const {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
} = require("@solana/web3.js");
const { Currency, CurrencyAmount } = require("@raydium-io/raydium-sdk");
const base58 = require("bs58");
const {
  findAssociatedTokenAddress,
  getbondingCurveFromToken,
} = require("./utils");
const { BN } = require("bn.js");
const { idl } = require("./idl");
const { PUMP_FUN_PROGRAM_ID } = require("./constants");
const { connection, wallet } = require("../../helpers/config");
const { checkTx, getDecimals } = require("../../helpers/util");
const {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddress,
} = require("@solana/spl-token");

// # if using default executor, fee below will be applied
// COMPUTE_UNIT_LIMIT=101337
// COMPUTE_UNIT_PRICE=421197
// # if using warp or jito executor, fee below will be applied
// CUSTOM_FEE=0.006
//const fee = new CurrencyAmount(Currency.SOL);

async function buy(tokenAddress, amtOfSolToSpend, tried, bc, abc) {
  // things we need
  const pump_fun_program_id = new PublicKey(PUMP_FUN_PROGRAM_ID);
  // owner = wallet, that we already defined in src/helpers/config.js
  const owner = new Wallet(wallet);
  const mint = new PublicKey(tokenAddress);

  // logic to buy using the pump.fun program
  let bondingCurve = bc,
    associatedBondingCurve = abc,
    result = null;
  if (!tried) {
    result = await getbondingCurveFromToken(tokenAddress);
    bondingCurve = result.bondingCurve;
    associatedBondingCurve = result.associatedBondingCurve;
    console.log("result: ", result);
    console.log("bondingCurve: ", bondingCurve);
  }

  const tokenAccount = await findAssociatedTokenAddress(wallet.publicKey, mint);
  console.log("token account: ", tokenAccount);
  const provider = new AnchorProvider(
    connection,
    owner,
    AnchorProvider.defaultOptions()
  );
  setProvider(provider);
  const program = new Program(idl, pump_fun_program_id, provider);

  // pump.fun.buy(arg1: tokenamount, arg2: solamount)
  const instruction = await program.methods
    .buy(new BN(0), new BN(amtOfSolToSpend * 10 ** 9))
    .accounts({
      global: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"),
      feeRecipient: new PublicKey(
        "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"
      ),
      mint: mint,
      bondingCurve: new PublicKey(bondingCurve),
      associatedBondingCurve: new PublicKey(associatedBondingCurve),
      associatedUser: tokenAccount,
      user: wallet.publicKey,
      systemProgram: new PublicKey("11111111111111111111111111111111"),
      tokenProgram: new PublicKey(
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      ),
      rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
      eventAuthority: PublicKey.findProgramAddressSync(
        [Buffer.from("__event_authority")],
        pump_fun_program_id
      )[0],
      program: pump_fun_program_id,
    })
    .instruction();
  console.log("instruction: ", instruction);
  const instructions = [];
  instructions.push(instruction);
  const blockhash = await connection.getLatestBlockhash("finalized");
  console.log(wallet.publicKey);
  const final_tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [
        [
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 421197,
          }),
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 101337,
          }),
        ],
        [
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            tokenAccount,
            wallet.publicKey,
            mint
          ),
        ],
        instructions,
      ],
    }).compileToV0Message()
  );
  final_tx.sign([owner.payer]);
  const txid = await connection.sendTransaction(final_tx, {
    skipPreflight: true,
  });

  const success = await checkTx(txid);
  if (success) {
    console.log(`🚀 successfully bought ${tokenAddress}`);
    console.log(`https://solscan.io/tx/${txid}?cluster=mainnet`);
  } else {
    console.log(`❌ failed to buy ${tokenAddress}`);
    console.log("trying again...");
    await buy(
      tokenAddress,
      amtOfSolToSpend,
      true,
      bondingCurve,
      associatedBondingCurve
    );
  }
}

buy("token_address", 0.001, false, null, null);
