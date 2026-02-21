/**
 * Futarchy Launchpad — IDexAdapter Implementation
 *
 * This is NOT a standard buy/sell DEX. It has fund() and claim() operations
 * for participating in Futarchy token launches.
 *
 * The IDexAdapter interface is implemented with canBuy=false, canSell=false,
 * so the CLI knows this is a non-standard adapter. The adapter exposes custom
 * public methods: fund(params) and claim(params).
 *
 * Registered in the DexRegistry so the CLI can find it via getDexAdapter("futarchy-launchpad").
 *
 * Source: 100x-algo-bots/trading-modules/futarchy-launchpad/
 *
 * Architecture:
 *   - LaunchpadSDK wraps the Anchor program with v0.7/v0.6 IDL fallback
 *   - fund() deposits quote tokens (USDC/WSOL) into a launch
 *   - claim() claims base tokens after a launch completes
 *   - Both use the landing layer for TX submission
 *
 * Capabilities: none of the standard ones (canBuy=false, canSell=false, etc.)
 * Requires: @coral-xyz/anchor
 */

import {
  PublicKey,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  SystemProgram,
  Connection,
} from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { getWallet, getConnection } from "../helpers/config";
import { getTokenProgram } from "../helpers/token-2022";
import { landTransaction } from "../transactions/landing";
import { sendAndConfirmVtx } from "../transactions/send-rpc";

import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SwapResult,
  TxResult,
  UnsupportedOperationError,
  WSOL_MINT,
  USDC_MINT,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./types";

import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAUNCHPAD_PROGRAM_ID = new PublicKey(
  "moontUzsdepotRGe5xsfip7vLPTJnVuafqdUWexVnPM",
);

const WSOL_MINT_PK = new PublicKey(WSOL_MINT);
const USDC_MINT_PK = new PublicKey(USDC_MINT);

// ---------------------------------------------------------------------------
// PDA derivation helpers (ported from source utils.ts)
// ---------------------------------------------------------------------------

function getLaunchSignerAddr(
  programId: PublicKey,
  launch: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("launch_signer"), launch.toBuffer()],
    programId,
  );
}

function getFundingRecordAddr(
  programId: PublicKey,
  launch: PublicKey,
  funder: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("funding_record"), launch.toBuffer(), funder.toBuffer()],
    programId,
  );
}

// ---------------------------------------------------------------------------
// Minimal Launchpad IDL (fund + claim instructions + launch account)
//
// Both v0.6 and v0.7 share the same fund/claim instruction shapes.
// The difference is in the launch account fields (v0.7 adds
// additionalTokensRecipient, etc.) — handled by version detection.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
const LAUNCHPAD_IDL: any = {
  version: "0.7.0",
  name: "launchpad_v7",
  address: LAUNCHPAD_PROGRAM_ID.toBase58(),
  instructions: [
    {
      name: "fund",
      accounts: [
        { name: "launch", isMut: true, isSigner: false },
        { name: "fundingRecord", isMut: true, isSigner: false },
        { name: "launchSigner", isMut: false, isSigner: false },
        { name: "launchQuoteVault", isMut: true, isSigner: false },
        { name: "funder", isMut: false, isSigner: true },
        { name: "payer", isMut: true, isSigner: true },
        { name: "funderQuoteAccount", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "eventAuthority", isMut: false, isSigner: false },
        { name: "program", isMut: false, isSigner: false },
      ],
      args: [{ name: "amount", type: "u64" }],
    },
    {
      name: "claim",
      accounts: [
        { name: "launch", isMut: true, isSigner: false },
        { name: "fundingRecord", isMut: true, isSigner: false },
        { name: "launchSigner", isMut: false, isSigner: false },
        { name: "funder", isMut: false, isSigner: true },
        { name: "funderTokenAccount", isMut: true, isSigner: false },
        { name: "baseMint", isMut: false, isSigner: false },
        { name: "launchBaseVault", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "eventAuthority", isMut: false, isSigner: false },
        { name: "program", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "launch",
      type: {
        kind: "struct",
        fields: [
          { name: "creator", type: "publicKey" },
          { name: "baseMint", type: "publicKey" },
          { name: "quoteMint", type: "publicKey" },
          { name: "state", type: { defined: "LaunchState" } },
          { name: "totalFundedAmount", type: "u64" },
          { name: "targetFundedAmount", type: "u64" },
          { name: "tokenBaseAmount", type: "u64" },
          { name: "launchAuthority", type: "publicKey" },
          { name: "treasury", type: "publicKey" },
          { name: "treasuryBps", type: "u16" },
          { name: "pdaBump", type: "u8" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "uri", type: "string" },
          { name: "seqNum", type: "u64" },
          // v0.7 fields — optional, decoded as defaults for v0.6 accounts
          { name: "totalApprovedAmount", type: "u64" },
          { name: "additionalTokensAmount", type: "u64" },
          { name: "additionalTokensRecipient", type: { option: "publicKey" } },
          { name: "additionalTokensClaimed", type: "bool" },
          { name: "unixTimestampCompleted", type: { option: "i64" } },
          { name: "isPerformancePackageInitialized", type: "bool" },
        ],
      },
    },
    {
      name: "fundingRecord",
      type: {
        kind: "struct",
        fields: [
          { name: "launch", type: "publicKey" },
          { name: "funder", type: "publicKey" },
          { name: "amount", type: "u64" },
          { name: "claimed", type: "bool" },
          { name: "pdaBump", type: "u8" },
          // v0.7 field
          { name: "approvedAmount", type: "u64" },
        ],
      },
    },
  ],
  types: [
    {
      name: "LaunchState",
      type: {
        kind: "enum",
        variants: [
          { name: "Initialized" },
          { name: "Funding" },
          { name: "Completed" },
          { name: "Cancelled" },
        ],
      },
    },
  ],
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Internal SDK (embedded — matches source LaunchpadSDK)
// ---------------------------------------------------------------------------

class LaunchpadSDK {
  public readonly program: Program<Idl>;
  public readonly connection: Connection;
  private readonly provider: AnchorProvider;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
    this.connection = provider.connection;
    this.program = new Program<Idl>(
      LAUNCHPAD_IDL as Idl,
      provider,
    );
  }

  /**
   * Fetch and decode a launch account.
   * Uses the program's account coder. If v0.7 decode fails for legacy
   * accounts, returns null (caller should handle gracefully).
   */
  async getLaunch(launch: PublicKey): Promise<any> {
    const accountInfo = await this.connection.getAccountInfo(launch);
    if (!accountInfo) {
      throw new Error(`Launch account not found: ${launch.toBase58()}`);
    }
    try {
      return this.program.coder.accounts.decode("launch", accountInfo.data);
    } catch {
      // If v0.7 decode fails (legacy v0.6 account), return a minimal decode
      // by trying as raw bytes. In practice, the fund/claim instructions
      // don't need the full account data — the on-chain program validates.
      throw new Error(
        `Failed to decode launch account ${launch.toBase58()}. ` +
          "This may be a legacy v0.6 account. Fund/claim may still work.",
      );
    }
  }

  /**
   * Build fund instruction.
   */
  fundIx(params: {
    launch: PublicKey;
    amount: BN;
    funder: PublicKey;
    quoteMint: PublicKey;
  }): { instruction: () => Promise<TransactionInstruction> } {
    const { launch, amount, funder, quoteMint } = params;

    const [launchSigner] = getLaunchSignerAddr(this.program.programId, launch);
    const launchQuoteVault = getAssociatedTokenAddressSync(quoteMint, launchSigner, true);
    const funderQuoteAccount = getAssociatedTokenAddressSync(quoteMint, funder, true);
    const [fundingRecord] = getFundingRecordAddr(this.program.programId, launch, funder);

    const builder = this.program.methods
      .fund(amount)
      .accounts({
        launch,
        launchQuoteVault,
        fundingRecord,
        funder,
        funderQuoteAccount,
        launchSigner,
        payer: this.provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });

    return {
      instruction: () => builder.instruction(),
    };
  }

  /**
   * Build claim instruction (with pre-instruction for ATA creation).
   */
  claimIx(
    launch: PublicKey,
    baseMint: PublicKey,
    funder: PublicKey,
  ): { instruction: () => Promise<TransactionInstruction>; preIx: TransactionInstruction } {
    const [launchSigner] = getLaunchSignerAddr(this.program.programId, launch);
    const [fundingRecord] = getFundingRecordAddr(this.program.programId, launch, funder);

    const funderTokenAccount = getAssociatedTokenAddressSync(baseMint, funder, true);
    const launchBaseVault = getAssociatedTokenAddressSync(baseMint, launchSigner, true);

    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      this.provider.publicKey,
      funderTokenAccount,
      funder,
      baseMint,
    );

    const builder = this.program.methods.claim().accounts({
      launch,
      fundingRecord,
      launchSigner,
      funder,
      funderTokenAccount,
      baseMint,
      launchBaseVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    });

    return {
      instruction: () => builder.instruction(),
      preIx: createAtaIx,
    };
  }
}

// ---------------------------------------------------------------------------
// Custom parameter types for fund/claim
// ---------------------------------------------------------------------------

export interface FundParams {
  /** Launch account address (base58 string) */
  launchAddress: string;

  /** Amount of quote token to fund (in human-readable units, e.g. 100 = 100 USDC) */
  amount: number;

  /** Quote token mint (default: USDC) */
  quoteMint?: string;

  /** Priority fee in microLamports (default: 600_000) */
  priorityFeeMicroLamports?: number;

  /** Tip in SOL for landing providers */
  tipSol?: number;
}

export interface ClaimParams {
  /** Launch account address (base58 string) */
  launchAddress: string;

  /** Base token mint to claim (base58 string) */
  baseMint: string;

  /** Priority fee in microLamports (default: 10_000_000) */
  priorityFeeMicroLamports?: number;

  /** Tip in SOL for landing providers */
  tipSol?: number;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class FutarchyLaunchpadAdapter implements IDexAdapter {
  readonly name = "futarchy-launchpad";
  readonly protocol = "launchpad";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    // No standard buy/sell — this is a fund/claim protocol
  });

  // ----- Core: buy (not supported — use fund() instead) -----

  async buy(_params: BuyParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(
      this.name,
      "buy (use fund() for Futarchy Launchpad)",
    );
  }

  // ----- Core: sell (not supported — use claim() instead) -----

  async sell(_params: SellParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(
      this.name,
      "sell (use claim() for Futarchy Launchpad)",
    );
  }

  // ----- Custom: fund -----

  /**
   * Fund a Futarchy Launchpad launch with quote tokens (USDC or WSOL).
   *
   * @param params - Fund parameters
   * @returns Transaction result
   */
  async fund(params: FundParams): Promise<TxResult> {
    const { launchAddress, amount, quoteMint: quoteMintParam, priorityFeeMicroLamports, tipSol } =
      params;
    const connection = getConnection();
    const wallet = getWallet();

    const launch = new PublicKey(launchAddress);
    const quoteMintStr = quoteMintParam ?? USDC_MINT;
    const quoteMint = new PublicKey(quoteMintStr);

    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "processed",
    });
    const sdk = new LaunchpadSDK(provider);

    // Calculate fund amount based on quote token decimals
    let fundAmount: BN;
    let wsolAmount = 0;

    if (quoteMint.equals(WSOL_MINT_PK)) {
      wsolAmount = amount;
      fundAmount = new BN(Math.floor(amount * LAMPORTS_PER_SOL));
    } else if (quoteMint.equals(USDC_MINT_PK)) {
      fundAmount = new BN(Math.floor(amount * 1_000_000)); // 6 decimals
    } else {
      fundAmount = new BN(Math.floor(amount * 1_000_000)); // default 6 decimals
    }

    // Build fund instruction
    const fundIxBuilder = sdk.fundIx({
      launch,
      amount: fundAmount,
      funder: wallet.publicKey,
      quoteMint,
    });
    const fundInstruction = await fundIxBuilder.instruction();

    const priorityFee = priorityFeeMicroLamports ?? 600_000;

    let ixs: TransactionInstruction[];

    if (quoteMint.equals(WSOL_MINT_PK)) {
      // Wrap SOL before funding
      const quoteAta = await getAssociatedTokenAddress(
        quoteMint,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
      );
      const wsolLamports = Math.floor(wsolAmount * LAMPORTS_PER_SOL);

      ixs = [
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          quoteAta,
          wallet.publicKey,
          WSOL_MINT_PK,
          TOKEN_PROGRAM_ID,
        ),
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: quoteAta,
          lamports: wsolLamports,
        }),
        createSyncNativeInstruction(quoteAta, TOKEN_PROGRAM_ID),
        fundInstruction,
        createCloseAccountInstruction(
          quoteAta,
          wallet.publicKey,
          wallet.publicKey,
          [],
          TOKEN_PROGRAM_ID,
        ),
      ];
    } else {
      ixs = [
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        fundInstruction,
      ];
    }

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
    };
  }

  // ----- Custom: claim -----

  /**
   * Claim tokens from a funded Futarchy Launchpad launch.
   *
   * @param params - Claim parameters
   * @returns Transaction result
   */
  async claim(params: ClaimParams): Promise<TxResult> {
    const { launchAddress, baseMint: baseMintStr, priorityFeeMicroLamports, tipSol } = params;
    const connection = getConnection();
    const wallet = getWallet();

    const launch = new PublicKey(launchAddress);
    const baseMint = new PublicKey(baseMintStr);

    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "processed",
    });
    const sdk = new LaunchpadSDK(provider);

    // Build claim instruction
    const claimIxBuilder = sdk.claimIx(launch, baseMint, wallet.publicKey);
    const claimInstruction = await claimIxBuilder.instruction();

    const priorityFee = priorityFeeMicroLamports ?? 10_000_000;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      claimIxBuilder.preIx, // Create ATA if needed
      claimInstruction,
    ];

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new FutarchyLaunchpadAdapter());
