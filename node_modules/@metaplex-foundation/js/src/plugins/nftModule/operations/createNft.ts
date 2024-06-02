import { TokenStandard, Uses } from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertNftWithToken, NftWithToken } from '../models';
import {
  createCompressedNftBuilder,
  CreateCompressedNftBuilderParams,
} from './createCompressedNft';
import { Option, TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  BigNumber,
  CreatorInput,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  token,
  toPublicKey,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'CreateNftOperation' as const;

/**
 * Creates a new NFT.
 *
 * ```ts
 * const { nft } = await metaplex
 *   .nfts()
 *   .create({
 *     name: 'My NFT',
 *     uri: 'https://example.com/my-nft',
 *     sellerFeeBasisPoints: 250, // 2.5%
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createNftOperation = useOperation<CreateNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateNftOperation = Operation<
  typeof Key,
  CreateNftInput,
  CreateNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateNftInput = {
  /**
   * The authority that will be able to make changes
   * to the created NFT.
   *
   * This is required as a Signer because creating the master
   * edition account requires the update authority to sign
   * the transaction.
   *
   * @defaultValue `metaplex.identity()`
   */
  updateAuthority?: Signer;

  /**
   * The authority that is currently allowed to mint new tokens
   * for the provided mint account.
   *
   * Note that this is only relevant if the `useExistingMint` parameter
   * if provided.
   *
   * @defaultValue `metaplex.identity()`
   */
  mintAuthority?: Signer;

  /**
   * The address of the new mint account as a Signer.
   * This is useful if you already have a generated Keypair
   * for the mint account of the NFT to create.
   *
   * @defaultValue `Keypair.generate()`
   */
  useNewMint?: Signer;

  /**
   * The address of the existing mint account that should be converted
   * into an NFT. The account at this address should have the right
   * requirements to become an NFT, e.g. its supply should contains
   * exactly 1 token.
   *
   * @defaultValue Defaults to creating a new mint account with the
   * right requirements.
   */
  useExistingMint?: PublicKey;

  /**
   * Whether or not we should mint one token for the new NFT.
   *
   * @defaultValue `true`
   */
  mintTokens?: boolean;

  /**
   * The owner of the NFT to create.
   *
   * @defaultValue `metaplex.identity().publicKey`
   */
  tokenOwner?: PublicKey;

  /**
   * The token account linking the mint account and the token owner
   * together. By default, the associated token account will be used.
   *
   * If the provided token account does not exist, it must be passed as
   * a Signer as we will need to create it before creating the NFT.
   *
   * @defaultValue Defaults to creating a new associated token account
   * using the `mintAddress` and `tokenOwner` parameters.
   */
  tokenAddress?: PublicKey | Signer;

  /**
   * Describes the asset class of the token.
   * It can be one of the following:
   * - `TokenStandard.NonFungible`: A traditional NFT (master edition).
   * - `TokenStandard.FungibleAsset`: A fungible token with metadata that can also have attributes.
   * - `TokenStandard.Fungible`: A fungible token with simple metadata.
   * - `TokenStandard.NonFungibleEdition`: A limited edition NFT "printed" from a master edition.
   * - `TokenStandard.ProgrammableNonFungible`: A master edition NFT with programmable configuration.
   *
   * @defaultValue `TokenStandard.NonFungible`
   */
  tokenStandard?: TokenStandard;

  /** The URI that points to the JSON metadata of the asset. */
  uri: string;

  /** The on-chain name of the asset, e.g. "My NFT #123". */
  name: string;

  /**
   * The royalties in percent basis point (i.e. 250 is 2.5%) that
   * should be paid to the creators on each secondary sale.
   */
  sellerFeeBasisPoints: number;

  /**
   * The on-chain symbol of the asset, stored in the Metadata account.
   * E.g. "MYNFT".
   *
   * @defaultValue `""`
   */
  symbol?: string;

  /**
   * {@inheritDoc CreatorInput}
   * @defaultValue
   * Defaults to using the provided `updateAuthority` as the only verified creator.
   * ```ts
   * [{
   *   address: updateAuthority.publicKey,
   *   authority: updateAuthority,
   *   share: 100,
   * }]
   * ```
   */
  creators?: CreatorInput[];

  /**
   * Whether or not the NFT's metadata is mutable.
   * When set to `false` no one can update the Metadata account,
   * not even the update authority.
   *
   * @defaultValue `true`
   */
  isMutable?: boolean;

  /**
   * Whether or not selling this asset is considered a primary sale.
   * Once flipped from `false` to `true`, this field is immutable and
   * all subsequent sales of this asset will be considered secondary.
   *
   * @defaultValue `false`
   */
  primarySaleHappened?: boolean;

  /**
   * The maximum supply of printed editions.
   * When this is `null`, an unlimited amount of editions
   * can be printed from the original edition.
   *
   * @defaultValue `toBigNumber(0)`
   */
  maxSupply?: Option<BigNumber>;

  /**
   * When this field is not `null`, it indicates that the NFT
   * can be "used" by its owner or any approved "use authorities".
   *
   * @defaultValue `null`
   */
  uses?: Option<Uses>;

  /**
   * Whether the created NFT is a Collection NFT.
   * When set to `true`, the NFT will be created as a
   * Sized Collection NFT with an initial size of 0.
   *
   * @defaultValue `false`
   */
  isCollection?: boolean;

  /**
   * The Collection NFT that this new NFT belongs to.
   * When `null`, the created NFT will not be part of a collection.
   *
   * @defaultValue `null`
   */
  collection?: Option<PublicKey>;

  /**
   * The collection authority that should sign the created NFT
   * to prove that it is part of the provided collection.
   * When `null`, the provided `collection` will not be verified.
   *
   * @defaultValue `null`
   */
  collectionAuthority?: Option<Signer>;

  /**
   * Whether or not the provided `collectionAuthority` is a delegated
   * collection authority, i.e. it was approved by the update authority
   * using `metaplex.nfts().approveCollectionAuthority()`.
   *
   * @defaultValue `false`
   */
  collectionAuthorityIsDelegated?: boolean;

  /**
   * Whether or not the provided `collection` is a sized collection
   * and not a legacy collection.
   *
   * @defaultValue `true`
   */
  collectionIsSized?: boolean;

  /**
   * The ruleset account that should be used to configure the
   * programmable NFT.
   *
   * This is only relevant for programmable NFTs, i.e. if the
   * `tokenStandard` is set to `TokenStandard.ProgrammableNonFungible`.
   *
   * @defaultValue `null`
   */
  ruleSet?: Option<PublicKey>;

  /**
   * The Merkle tree used to store the NFT
   */
  tree?: Option<PublicKey>;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created NFT and its associated token. */
  nft: NftWithToken;

  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The address of the metadata account. */
  metadataAddress: PublicKey;

  /** The address of the master edition account. */
  masterEditionAddress: PublicKey;

  /** The address of the token account. */
  tokenAddress: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createNftOperationHandler: OperationHandler<CreateNftOperation> = {
  handle: async (
    operation: CreateNftOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ) => {
    const {
      useNewMint = Keypair.generate(),
      useExistingMint,
      tokenOwner = metaplex.identity().publicKey,
      tokenAddress: tokenSigner,
    } = operation.input;

    const mintAddress = useExistingMint ?? useNewMint.publicKey;
    const tokenAddress = tokenSigner
      ? toPublicKey(tokenSigner)
      : metaplex.tokens().pdas().associatedTokenAccount({
          mint: mintAddress,
          owner: tokenOwner,
          programs: scope.programs,
        });
    const tokenAccount = await metaplex.rpc().getAccount(tokenAddress);
    const tokenExists = tokenAccount.exists;

    const builder = await createNftBuilder(
      metaplex,
      {
        ...operation.input,
        useNewMint,
        tokenOwner,
        tokenExists,
      },
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
        mintAddress: output.mintAddress,
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
export type CreateNftBuilderParams = Omit<CreateNftInput, 'confirmOptions'> & {
  /**
   * Whether or not the provided token account already exists.
   * If `false`, we'll add another instruction to create it.
   *
   * @defaultValue `true`
   */
  tokenExists?: boolean;

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

  /** A key to distinguish the instruction that creates the metadata account. */
  createMetadataInstructionKey?: string;

  /** A key to distinguish the instruction that creates the master edition account. */
  createMasterEditionInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateNftBuilderContext = Omit<CreateNftOutput, 'response' | 'nft'>;

/**
 * Creates a new NFT.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .nfts()
 *   .builders()
 *   .create({
 *     name: 'My NFT',
 *     uri: 'https://example.com/my-nft',
 *     sellerFeeBasisPoints: 250, // 2.5%
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createNftBuilder = async (
  metaplex: Metaplex,
  params: CreateNftBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateNftBuilderContext>> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    useNewMint = Keypair.generate(),
    updateAuthority = metaplex.identity(),
    mintAuthority = metaplex.identity(),
    tokenOwner = metaplex.identity().publicKey,
    mintTokens = true,
    tree,
  } = params;

  if (tree) {
    // @ts-ignore
    return createCompressedNftBuilder(
      metaplex,
      params as CreateCompressedNftBuilderParams,
      options
    );
  }

  const sftBuilder = await metaplex
    .nfts()
    .builders()
    .createSft(
      {
        ...params,
        tokenStandard: params.tokenStandard ?? TokenStandard.NonFungible,
        updateAuthority,
        mintAuthority,
        useNewMint,
        tokenOwner,
        tokenAmount: mintTokens ? token(1) : undefined,
        decimals: 0,
      },
      { programs, payer }
    );

  const { mintAddress, metadataAddress, tokenAddress } =
    sftBuilder.getContext();
  const masterEditionAddress = metaplex.nfts().pdas().masterEdition({
    mint: mintAddress,
    programs,
  });

  return (
    TransactionBuilder.make<CreateNftBuilderContext>()
      .setFeePayer(payer)
      .setContext({
        mintAddress,
        metadataAddress,
        masterEditionAddress,
        tokenAddress: tokenAddress as PublicKey,
      })

      // Create the mint, the token and the metadata.
      .add(sftBuilder)
  );
};
