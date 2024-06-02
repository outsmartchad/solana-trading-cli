import { createMintNewEditionFromMasterEditionViaTokenInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { toOriginalEditionAccount } from '../accounts';
import {
  assertNftWithToken,
  NftWithToken,
  toNftOriginalEdition,
} from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  BigNumber,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  toBigNumber,
  token,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'PrintNewEditionOperation' as const;

/**
 * Prints a new edition from an original NFT.
 *
 * ```ts
 * const { nft } = await metaplex
 *   .nfts()
 *   .printNewEdition({ originalMint };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const printNewEditionOperation =
  useOperation<PrintNewEditionOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type PrintNewEditionOperation = Operation<
  typeof Key,
  PrintNewEditionInput,
  PrintNewEditionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type PrintNewEditionInput = {
  /** The address of the original NFT. */
  originalMint: PublicKey;

  /**
   * The owner of the original NFT as a Signer.
   *
   * @defaultValue `metaplex.identity()`
   */
  originalTokenAccountOwner?: Signer;

  /**
   * The address of the original NFT's token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `originalMint` and `originalTokenAccountOwner` parameters.
   */
  originalTokenAccount?: PublicKey;

  /**
   * The address of the new mint account as a Signer.
   * This is useful if you already have a generated Keypair
   * for the mint account of the Print NFT to create.
   *
   * @defaultValue `Keypair.generate()`
   */
  newMint?: Signer;

  /**
   * The update authority of the new printed NFT.
   *
   * Depending on your use-case, you might want to change that to
   * the `updateAuthority` of the original NFT.
   *
   * @defaultValue `metaplex.identity()`
   */
  newUpdateAuthority?: PublicKey;

  /**
   * The owner of the new printed NFT.
   *
   * @defaultValue `metaplex.identity().publicKey`
   */
  newOwner?: PublicKey;

  /**
   * The address of the new printed NFT's token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `originalMint` and `newOwner` parameters.
   */
  newTokenAccount?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type PrintNewEditionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created NFT and its associated token. */
  nft: NftWithToken;

  /** The created mint account as a Signer. */
  mintSigner: Signer;

  /** The address of the metadata account. */
  metadataAddress: PublicKey;

  /** The address of the edition account. */
  editionAddress: PublicKey;

  /** The address of the token account. */
  tokenAddress: PublicKey;

  /** The new supply of the original NFT. */
  updatedSupply: BigNumber;
};

/**
 * @group Operations
 * @category Handlers
 */
export const printNewEditionOperationHandler: OperationHandler<PrintNewEditionOperation> =
  {
    handle: async (
      operation: PrintNewEditionOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const originalEditionAccount = await metaplex.rpc().getAccount(
        metaplex.nfts().pdas().masterEdition({
          mint: operation.input.originalMint,
          programs: scope.programs,
        })
      );
      scope.throwIfCanceled();

      const originalEdition = toNftOriginalEdition(
        toOriginalEditionAccount(originalEditionAccount)
      );
      const builder = await printNewEditionBuilder(
        metaplex,
        { ...operation.input, originalSupply: originalEdition.supply },
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        metaplex,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(metaplex, confirmOptions);
      scope.throwIfCanceled();

      const nft = await metaplex.nfts().findByMint(
        {
          mintAddress: output.mintSigner.publicKey,
          tokenAddress: output.tokenAddress,
        },
        scope
      );
      scope.throwIfCanceled();

      assertNftWithToken(nft);
      return { ...output, nft };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type PrintNewEditionBuilderParams = Omit<
  PrintNewEditionInput,
  'confirmOptions'
> & {
  /** The current supply of the original edition. */
  originalSupply: BigNumber;

  /** A key to distinguish the instruction that creates the mint account. */
  createMintAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the mint account. */
  initializeMintInstructionKey?: string;

  /** A key to distinguish the instruction that creates the associated token account. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the token account. */
  createTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account. */
  initializeTokenInstructionKey?: string;

  /** A key to distinguish the instruction that mints tokens. */
  mintTokensInstructionKey?: string;

  /** A key to distinguish the instruction that prints the new edition. */
  printNewEditionInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type PrintNewEditionBuilderContext = Omit<
  PrintNewEditionOutput,
  'response' | 'nft'
>;

/**
 * Prints a new edition from an original NFT.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .nfts()
 *   .builders()
 *   .printNewEdition({ originalMint });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const printNewEditionBuilder = async (
  metaplex: Metaplex,
  params: PrintNewEditionBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<PrintNewEditionBuilderContext>> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    originalMint,
    newMint = Keypair.generate(),
    newUpdateAuthority = metaplex.identity().publicKey,
    newOwner = metaplex.identity().publicKey,
    newTokenAccount,
    printNewEditionInstructionKey = 'printNewEdition',
  } = params;

  // Programs.
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  // Original NFT.
  const originalMetadataAddress = metaplex.nfts().pdas().metadata({
    mint: originalMint,
    programs,
  });
  const originalEditionAddress = metaplex.nfts().pdas().masterEdition({
    mint: originalMint,
    programs,
  });
  const edition = toBigNumber(params.originalSupply.addn(1));
  const originalEditionMarkPda = metaplex.nfts().pdas().editionMarker({
    mint: originalMint,
    edition,
    programs,
  });

  // New NFT.
  const newMintAuthority = Keypair.generate(); // Will be overwritten by edition PDA.
  const newMetadataAddress = metaplex.nfts().pdas().metadata({
    mint: newMint.publicKey,
    programs,
  });
  const newEditionAddress = metaplex.nfts().pdas().edition({
    mint: newMint.publicKey,
    programs,
  });
  const sharedAccounts = {
    newMetadata: newMetadataAddress,
    newEdition: newEditionAddress,
    masterEdition: originalEditionAddress,
    newMint: newMint.publicKey,
    editionMarkPda: originalEditionMarkPda,
    newMintAuthority: newMintAuthority.publicKey,
    payer: payer.publicKey,
    newMetadataUpdateAuthority: newUpdateAuthority,
    metadata: originalMetadataAddress,
  };

  const tokenWithMintBuilder = await metaplex
    .tokens()
    .builders()
    .createTokenWithMint(
      {
        decimals: 0,
        initialSupply: token(1),
        mint: newMint,
        mintAuthority: newMintAuthority,
        freezeAuthority: newMintAuthority.publicKey,
        owner: newOwner,
        token: newTokenAccount,
        createMintAccountInstructionKey: params.createMintAccountInstructionKey,
        initializeMintInstructionKey: params.initializeMintInstructionKey,
        createAssociatedTokenAccountInstructionKey:
          params.createAssociatedTokenAccountInstructionKey,
        createTokenAccountInstructionKey:
          params.createTokenAccountInstructionKey,
        initializeTokenInstructionKey: params.initializeTokenInstructionKey,
        mintTokensInstructionKey: params.mintTokensInstructionKey,
      },
      { payer, programs }
    );

  const { tokenAddress } = tokenWithMintBuilder.getContext();
  const originalTokenAccountOwner =
    params.originalTokenAccountOwner ?? metaplex.identity();
  const originalTokenAccount =
    params.originalTokenAccount ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: originalMint,
      owner: originalTokenAccountOwner.publicKey,
      programs,
    });

  return (
    TransactionBuilder.make<PrintNewEditionBuilderContext>()
      .setFeePayer(payer)
      .setContext({
        mintSigner: newMint,
        metadataAddress: newMetadataAddress,
        editionAddress: newEditionAddress,
        tokenAddress,
        updatedSupply: edition,
      })

      // Create the mint and token accounts before minting 1 token to the owner.
      .add(tokenWithMintBuilder)

      // Mint new edition.
      .add({
        instruction: createMintNewEditionFromMasterEditionViaTokenInstruction(
          {
            ...sharedAccounts,
            tokenAccountOwner: originalTokenAccountOwner.publicKey,
            tokenAccount: originalTokenAccount,
          },
          { mintNewEditionFromMasterEditionViaTokenArgs: { edition } },
          tokenMetadataProgram.address
        ),
        signers: [newMint, newMintAuthority, payer, originalTokenAccountOwner],
        key: printNewEditionInstructionKey,
      })
  );
};
