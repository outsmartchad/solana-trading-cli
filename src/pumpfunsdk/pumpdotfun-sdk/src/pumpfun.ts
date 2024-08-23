import {
  Commitment,
  Connection,
  Finality,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { Program, Provider } from "@coral-xyz/anchor";
import { GlobalAccount } from "./globalAccount";
import {
  toCompleteEvent,
  toCreateEvent,
  toSetParamsEvent,
  toTradeEvent,
} from "./events";
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { BondingCurveAccount } from "./bondingCurveAccount";
const {BN} = require("bn.js");
import {
  DEFAULT_COMMITMENT,
  DEFAULT_FINALITY,
  calculateWithSlippageBuy,
  calculateWithSlippageSell,
  sendTx,
  sendTxToJito,
} from "./util";
import { PumpFun, IDL } from "./IDL/index";
import { wallet } from "../../../helpers/config";
export const PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const MPL_TOKEN_METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

export const GLOBAL_ACCOUNT_SEED = "global";
export const MINT_AUTHORITY_SEED = "mint-authority";
export const BONDING_CURVE_SEED = "bonding-curve";
export const METADATA_SEED = "metadata";

export const DEFAULT_DECIMALS = 6;

export class PumpFunSDK {
  public program: Program<PumpFun>;
  public connection: Connection;
  constructor(provider?: Provider) {
    this.program = new Program<PumpFun>(IDL as PumpFun, provider);
    this.connection = this.program.provider.connection;
  }
  async bundleBuys(
    creator: any,
    mint: any,
    createTokenMetadata: any,
    buyAmountSol: any,
    buyersWallets: any,
    slippageBasisPoints = 500n,
    priorityFees: any,
    commitment = DEFAULT_COMMITMENT,
    finality = DEFAULT_FINALITY
  ) {
    let tokenMetadata = await this.createTokenMetadata(createTokenMetadata);
    let createTx = await this.getCreateInstructions(
      creator.publicKey,
      createTokenMetadata.name,
      createTokenMetadata.symbol,
      tokenMetadata.metadataUri,
      mint
    );
    let final_tx = new Transaction().add(createTx);
    const globalAccount = await this.getGlobalAccount(commitment);
    const buyAmount = globalAccount.getInitialBuyPrice(buyAmountSol);
    const buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );
    final_tx.add(
      await this.getBuyInstructions(
        creator.publicKey,
        mint.publicKey,
        globalAccount.feeRecipient,
        buyAmount,
        buyAmountWithSlippage
      )
    );

    for (let i = 0; i < buyersWallets.length; i++) {
      let buyTx = await this.getBuyInstructions(
        buyersWallets[i].publicKey,
        mint.publicKey,
        globalAccount.feeRecipient,
        buyAmount,
        buyAmountWithSlippage
      );
      final_tx.add(buyTx);
    }
    let createResults = await sendTx(
      this.connection,
      final_tx,
      creator.publicKey,
      [creator, mint, ...buyersWallets],
      priorityFees,
      commitment || "",
      finality
    );
    return createResults;
  }
  async createAndBuy(
    creator: Keypair,
    mint: Keypair,
    createTokenMetadata: any,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = 500n,
    priorityFees?: any,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    let tokenMetadata = await this.createTokenMetadata(createTokenMetadata);

    let createTx = await this.getCreateInstructions(
      creator.publicKey,
      createTokenMetadata.name,
      createTokenMetadata.symbol,
      tokenMetadata.metadataUri,
      mint
    );

    let newTx = new Transaction().add(createTx);

    if (buyAmountSol > 0) {
      const globalAccount = await this.getGlobalAccount(commitment);
      const buyAmount = globalAccount.getInitialBuyPrice(buyAmountSol);
      const buyAmountWithSlippage = calculateWithSlippageBuy(
        buyAmountSol,
        slippageBasisPoints
      );

      const buyTx = await this.getBuyInstructions(
        creator.publicKey,
        mint.publicKey,
        globalAccount.feeRecipient,
        buyAmount,
        buyAmountWithSlippage
      );

      newTx.add(buyTx);
    }
    // using jito
    const res = await sendTxToJito(
      this.connection,
      newTx,
      creator,
      [creator, mint],
      0.00003
    );
    // with jito
    // let createResults = await sendTx(
    //   this.connection,
    //   newTx,
    //   creator.publicKey,
    //   [creator, mint],
    //   priorityFees,
    //   commitment,
    //   finality
    // );

    return res.success;
  }

  async buy(
    buyer: any,
    mint: any,
    buyAmountSol: any,
    slippageBasisPoints = 500n,
    priorityFees: any,
    commitment = DEFAULT_COMMITMENT,
    finality = DEFAULT_FINALITY
  ) {
    let buyTx = await this.getBuyInstructionsBySolAmount(
      buyer.publicKey,
      mint,
      buyAmountSol,
      slippageBasisPoints,
      commitment
    );

    // let buyResults = await sendTx(
    //   this.connection,
    //   buyTx,
    //   buyer.publicKey,
    //   [buyer],
    //   priorityFees,
    //   commitment,
    //   finality
    // );
    let buyResults = await sendTxToJito(
      this.connection,
      buyTx,
      buyer,
      [buyer],
      0.00001
    );
    return buyResults;
  }

  async sell(
    seller: any,
    mint: any,
    sellTokenAmount: any,
    slippageBasisPoints = 500n,
    priorityFees: any,
    commitment = DEFAULT_COMMITMENT,
    finality = DEFAULT_FINALITY
  ) {
    let sellTx = await this.getSellInstructionsByTokenAmount(
      seller.publicKey,
      mint,
      sellTokenAmount,
      slippageBasisPoints,
      commitment
    );

    // let sellResults = await sendTx(
    //   this.connection,
    //   sellTx,
    //   seller.publicKey,
    //   [seller],
    //   priorityFees,
    //   commitment,
    //   finality
    // );
    let sellResults = await sendTxToJito(
      this.connection,
      sellTx,
      seller,
      [seller],
      0.00001
    );
    return sellResults;
  }

  //create token instructions
  async getCreateInstructions(
    creator: any,
    name: any,
    symbol: any,
    uri: any,
    mint: any
  ) {
    const mplTokenMetadata = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        mplTokenMetadata.toBuffer(),
        mint.publicKey.toBuffer(),
      ],
      mplTokenMetadata
    );

    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint.publicKey,
      this.getBondingCurvePDA(mint.publicKey),
      true
    );

    return this.program.methods
      .create(name, symbol, uri)
      .accounts({
        mint: mint.publicKey,
        associatedBondingCurve: associatedBondingCurve,
        metadata: metadataPDA,
        user: creator,
      })
      .signers([mint])
      .transaction();
  }

  async getBuyInstructionsBySolAmount(
    buyer: any,
    mint: any,
    buyAmountSol: any,
    slippageBasisPoints = 500n,
    commitment = DEFAULT_COMMITMENT
  ) {
    let bondingCurveAccount = await this.getBondingCurveAccount(
      mint,
      commitment
    );
    if (!bondingCurveAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    let buyAmount = bondingCurveAccount.getBuyPrice(buyAmountSol);
    let buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );

    let globalAccount = await this.getGlobalAccount(commitment);

    return await this.getBuyInstructions(
      buyer,
      mint,
      globalAccount.feeRecipient,
      buyAmount,
      buyAmountWithSlippage
    );
  }
  async getAssoBondingCurve(mint: any) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );
    console.log(associatedBondingCurve);
    return associatedBondingCurve;
  }
  //buy
  async getBuyInstructions(
    buyer: any,
    mint: any,
    feeRecipient: any,
    amount: any,
    solAmount: any,
    commitment = DEFAULT_COMMITMENT
  ) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );

    const associatedUser = await getAssociatedTokenAddress(mint, buyer, true);
    //const associatedUser = await getOrCreateAssociatedTokenAccount(this.connection, wallet, mint, buyer, false);

    let transaction = new Transaction();

    try {
      await getAccount(this.connection, associatedUser);
    } catch (e) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          buyer,
          associatedUser,
          buyer,
          mint
        )
      );
    }

    transaction.add(
      await this.program.methods
        .buy(new BN(amount.toString()), new BN(solAmount.toString()))
        .accounts({
          feeRecipient: feeRecipient,
          mint: mint,
          associatedBondingCurve: associatedBondingCurve,
          associatedUser: associatedUser,
          user: buyer,
        })
        .transaction()
    );

    return transaction;
  }

  //sell
  async getSellInstructionsByTokenAmount(
    seller: any,
    mint: any,
    sellTokenAmount: any,
    slippageBasisPoints = 500n,
    commitment = DEFAULT_COMMITMENT
  ) {
    let bondingCurveAccount = await this.getBondingCurveAccount(
      mint,
      commitment
    );
    if (!bondingCurveAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    let globalAccount = await this.getGlobalAccount(commitment);

    let minSolOutput = bondingCurveAccount.getSellPrice(
      sellTokenAmount,
      globalAccount.feeBasisPoints
    );

    let sellAmountWithSlippage = calculateWithSlippageSell(
      minSolOutput,
      slippageBasisPoints
    );

    return await this.getSellInstructions(
      seller,
      mint,
      globalAccount.feeRecipient,
      sellTokenAmount,
      sellAmountWithSlippage
    );
  }

  async getSellInstructions(
    seller: any,
    mint: any,
    feeRecipient: any,
    amount: any,
    minSolOutput: any
  ) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );

    const associatedUser = await getAssociatedTokenAddress(mint, seller, false);

    let transaction = new Transaction();

    transaction.add(
      await this.program.methods
        .sell(new BN(amount.toString()), new BN(minSolOutput.toString()))
        .accounts({
          feeRecipient: feeRecipient,
          mint: mint,
          associatedBondingCurve: associatedBondingCurve,
          associatedUser: associatedUser,
          user: seller,
        })
        .transaction()
    );

    return transaction;
  }

  async getBondingCurveAccount(mint: any, commitment = DEFAULT_COMMITMENT) {
    const tokenAccount = await this.connection.getAccountInfo(
      this.getBondingCurvePDA(mint)
    );
    if (!tokenAccount) {
      return null;
    }
    return BondingCurveAccount.fromBuffer(tokenAccount.data);
  }

  async getGlobalAccount(commitment = DEFAULT_COMMITMENT) {
    const [globalAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_ACCOUNT_SEED)],
      new PublicKey(PROGRAM_ID)
    );

    const tokenAccount:any = await this.connection.getAccountInfo(globalAccountPDA);

    return GlobalAccount.fromBuffer(tokenAccount.data);
  }

  getBondingCurvePDA(mint:any) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
      this.program.programId
    )[0];
  }

  async createTokenMetadata(create:any) {
    let formData = new FormData();
    formData.append("file", create.file),
      formData.append("name", create.name),
      formData.append("symbol", create.symbol),
      formData.append("description", create.description),
      formData.append("twitter", create.twitter || ""),
      formData.append("telegram", create.telegram || ""),
      formData.append("website", create.website || ""),
      formData.append("showName", "true");
    let request = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: formData,
    });
    return request.json();
  }
  //EVENTS
  addEventListener(eventType:any, callback:any) {
    return this.program.addEventListener(
      eventType,
      (event, slot, signature) => {
        let processedEvent;
        switch (eventType) {
          case "createEvent":
            processedEvent = toCreateEvent(event);
            callback(processedEvent, slot, signature);
            break;
          case "tradeEvent":
            processedEvent = toTradeEvent(event);
            callback(processedEvent, slot, signature);
            break;
          case "completeEvent":
            processedEvent = toCompleteEvent(event);
            callback(processedEvent, slot, signature);
            console.log("completeEvent", event, slot, signature);
            break;
          case "setParamsEvent":
            processedEvent = toSetParamsEvent(event);
            callback(processedEvent, slot, signature);
            break;
          default:
            console.error("Unhandled event type:", eventType);
        }
      }
    );
  }

  removeEventListener(eventId:any) {
    this.program.removeEventListener(eventId);
  }
}

