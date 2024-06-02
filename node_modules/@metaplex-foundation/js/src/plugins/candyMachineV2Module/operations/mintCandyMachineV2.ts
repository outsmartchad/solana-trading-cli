import {
  createMintNftInstruction,
  createSetCollectionDuringMintInstruction,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  Keypair,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
} from '@solana/web3.js';
import { NftWithToken } from '../../nftModule';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { parseCandyMachineV2CollectionAccount } from '../accounts';
import { assertCanMintCandyMachineV2 } from '../asserts';
import { CandyMachineV2BotTaxError } from '../errors';
import { CandyMachineV2 } from '../models';
import {
  findCandyMachineV2CollectionPda,
  findCandyMachineV2CreatorPda,
} from '../pdas';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  assertAccountExists,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  token,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'MintCandyMachineV2Operation' as const;

/**
 * Mint an NFT from an existing Candy Machine.
 *
 * ```ts
 * const { nft } = await metaplex
 *   .candyMachinesV2()
 *   .mint({ candyMachine };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const mintCandyMachineV2Operation =
  useOperation<MintCandyMachineV2Operation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type MintCandyMachineV2Operation = Operation<
  typeof Key,
  MintCandyMachineV2Input,
  MintCandyMachineV2Output
>;

/**
 * @group Operations
 * @category Inputs
 */
export type MintCandyMachineV2Input = {
  /**
   * The Candy Machine to mint from.
   * We only need a subset of the `CandyMachine` model but we
   * need enough information regarding its settings to know how
   * to mint from it.
   *
   * This includes, its wallet address, its item statistics, it live date,
   * its whitelist settings, etc.
   */
  candyMachine: Pick<
    CandyMachineV2,
    | 'address'
    | 'walletAddress'
    | 'authorityAddress'
    | 'tokenMintAddress'
    | 'itemsRemaining'
    | 'itemsAvailable'
    | 'itemsMinted'
    | 'whitelistMintSettings'
    | 'goLiveDate'
    | 'endSettings'
  >;

  /**
   * The mint account to create as a Signer.
   * This expects a brand new Keypair with no associated account.
   *
   * @defaultValue `Keypair.generate()`
   */
  newMint?: Signer;

  /**
   * The owner of the minted NFT.
   *
   * @defaultValue `metaplex.identity().publicKey`
   */
  newOwner?: PublicKey;

  /**
   * The new token account to create as a Signer.
   *
   * This property would typically be ignored as, by default, it will create a
   * associated token account from the `newOwner` and `newMint` properties.
   *
   * When provided, the `newOwner` property will be ignored.
   *
   * @defaultValue associated token address of `newOwner` and `newMint`.
   */
  newToken?: Signer;

  /**
   * The token account that should pay for the minted NFT.
   *
   * This is only relevant when the Candy Machine uses a mint treasury
   * (i.e. payments are made using SPL tokens and not SOL).
   *
   * @defaultValue associated token address of `payer` and
   * `candyMachine.tokenMintAddress`.
   */
  payerToken?: PublicKey;

  /**
   * The token account that contains whitelist tokens.
   *
   * This is only relevant when the Candy Machine uses
   * whitelist settings.
   *
   * @defaultValue associated token address of `payer` and
   * `candyMachine.whitelistMintSettings.mint`.
   */
  whitelistToken?: PublicKey; // Defaults to associated token.
};

/**
 * @group Operations
 * @category Outputs
 */
export type MintCandyMachineV2Output = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The minted NFT. */
  nft: NftWithToken;

  /** The mint account of the minted NFT as a Signer. */
  mintSigner: Signer;

  /** The token account's address of the minted NFT. */
  tokenAddress: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const mintCandyMachineV2OperationHandler: OperationHandler<MintCandyMachineV2Operation> =
  {
    async handle(
      operation: MintCandyMachineV2Operation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<MintCandyMachineV2Output> {
      assertCanMintCandyMachineV2(operation.input.candyMachine, scope.payer);

      const builder = await mintCandyMachineV2Builder(
        metaplex,
        operation.input,
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        metaplex,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(metaplex, confirmOptions);
      scope.throwIfCanceled();

      let nft: NftWithToken;
      try {
        nft = (await metaplex.nfts().findByMint(
          {
            mintAddress: output.mintSigner.publicKey,
            tokenAddress: output.tokenAddress,
          },
          scope
        )) as NftWithToken;
      } catch (error) {
        throw new CandyMachineV2BotTaxError(
          metaplex.rpc().getSolanaExporerUrl(output.response.signature),
          error as Error
        );
      }

      return { nft, ...output };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type MintCandyMachineV2BuilderParams = Omit<
  MintCandyMachineV2Input,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that creates the mint account of the NFT. */
  createMintAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the mint account of the NFT. */
  initializeMintInstructionKey?: string;

  /** A key to distinguish the instruction that creates the associated token account of the NFT. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the token account of the NFT. */
  createTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account of the NFT. */
  initializeTokenInstructionKey?: string;

  /** A key to distinguish the instruction that mints the one token. */
  mintTokensInstructionKey?: string;

  /** A key to distinguish the instruction that mints the NFT. */
  mintNftInstructionKey?: string;

  /** A key to distinguish the instruction that sets the collection on the minted NFT. */
  setCollectionInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type MintCandyMachineV2BuilderContext = Omit<
  MintCandyMachineV2Output,
  'response' | 'nft'
>;

/**
 * Mint an NFT from an existing Candy Machine.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .candyMachinesV2()
 *   .builders()
 *   .mint({ candyMachine });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const mintCandyMachineV2Builder = async (
  metaplex: Metaplex,
  params: MintCandyMachineV2BuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<MintCandyMachineV2BuilderContext>> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    candyMachine,
    newMint = Keypair.generate(),
    newOwner = metaplex.identity().publicKey,
    newToken,
  } = params;

  const tokenMetadataProgram = metaplex
    .programs()
    .getTokenMetadata(programs).address;

  const newMetadata = metaplex.nfts().pdas().metadata({
    mint: newMint.publicKey,
    programs,
  });
  const newEdition = metaplex.nfts().pdas().masterEdition({
    mint: newMint.publicKey,
    programs,
  });
  const candyMachineCreator = findCandyMachineV2CreatorPda(
    candyMachine.address
  );
  const candyMachineCollectionAddress = findCandyMachineV2CollectionPda(
    candyMachine.address
  );
  const candyMachineCollectionAccount = parseCandyMachineV2CollectionAccount(
    await metaplex.rpc().getAccount(candyMachineCollectionAddress)
  );

  const tokenWithMintBuilder = await metaplex
    .tokens()
    .builders()
    .createTokenWithMint(
      {
        decimals: 0,
        initialSupply: token(1),
        mint: newMint,
        mintAuthority: payer,
        freezeAuthority: payer.publicKey,
        owner: newOwner,
        token: newToken,
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

  const mintNftInstruction = createMintNftInstruction(
    {
      candyMachine: candyMachine.address,
      candyMachineCreator,
      payer: payer.publicKey,
      wallet: candyMachine.walletAddress,
      metadata: newMetadata,
      mint: newMint.publicKey,
      mintAuthority: payer.publicKey,
      updateAuthority: payer.publicKey,
      masterEdition: newEdition,
      tokenMetadataProgram,
      clock: SYSVAR_CLOCK_PUBKEY,
      recentBlockhashes: SYSVAR_SLOT_HASHES_PUBKEY,
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
    },
    { creatorBump: candyMachineCreator.bump }
  );

  if (candyMachine.whitelistMintSettings) {
    const whitelistToken =
      params.whitelistToken ??
      metaplex.tokens().pdas().associatedTokenAccount({
        mint: candyMachine.whitelistMintSettings.mint,
        owner: payer.publicKey,
      });

    mintNftInstruction.keys.push(
      {
        pubkey: whitelistToken,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: candyMachine.whitelistMintSettings.mint,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: payer.publicKey,
        isWritable: false,
        isSigner: true,
      }
    );
  }

  if (candyMachine.tokenMintAddress) {
    const payerToken =
      params.payerToken ??
      metaplex.tokens().pdas().associatedTokenAccount({
        mint: candyMachine.tokenMintAddress,
        owner: payer.publicKey,
      });

    mintNftInstruction.keys.push(
      {
        pubkey: payerToken,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: payer.publicKey,
        isWritable: false,
        isSigner: true,
      }
    );
  }

  return (
    TransactionBuilder.make<MintCandyMachineV2BuilderContext>()
      .setFeePayer(payer)
      .setContext({
        mintSigner: newMint,
        tokenAddress,
      })

      // Create token and mint accounts.
      .add(tokenWithMintBuilder)

      // Create the new NFT.
      .add({
        instruction: mintNftInstruction,
        signers: [payer, newMint],
        key: params.mintNftInstructionKey ?? 'mintNft',
      })

      // Set the collection on the NFT.
      .when(candyMachineCollectionAccount.exists, (builder) => {
        assertAccountExists(candyMachineCollectionAccount);
        const collectionMint = candyMachineCollectionAccount.data.mint;
        const collectionMetadata = metaplex.nfts().pdas().metadata({
          mint: collectionMint,
          programs,
        });
        const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
          mint: collectionMint,
          programs,
        });
        const collectionAuthorityRecord = metaplex
          .nfts()
          .pdas()
          .collectionAuthorityRecord({
            mint: collectionMint,
            collectionAuthority: candyMachineCollectionAccount.publicKey,
            programs,
          });

        return builder.add({
          instruction: createSetCollectionDuringMintInstruction({
            candyMachine: candyMachine.address,
            metadata: newMetadata,
            payer: payer.publicKey,
            collectionPda: candyMachineCollectionAccount.publicKey,
            tokenMetadataProgram,
            instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
            collectionMint: candyMachineCollectionAccount.data.mint,
            collectionMetadata,
            collectionMasterEdition,
            authority: candyMachine.authorityAddress,
            collectionAuthorityRecord,
          }),
          signers: [payer],
          key: params.setCollectionInstructionKey ?? 'setCollection',
        });
      })
  );
};
