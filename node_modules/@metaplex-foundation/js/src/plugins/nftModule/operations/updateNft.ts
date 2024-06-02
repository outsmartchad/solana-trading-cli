import {
  CollectionDetails,
  createUpdateInstruction,
  UpdateArgs,
  Uses,
} from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import isEqual from 'lodash.isequal';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  parseTokenMetadataAuthorization,
  TokenMetadataAuthority,
  TokenMetadataAuthorizationDetails,
} from '../Authorization';
import { isNonFungible, Sft } from '../models';
import { Option, TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  CreatorInput,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';
import { NoInstructionsToSendError } from '@/errors';

const TOKEN_AUTH_RULES_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'
);

// -----------------
// Operation
// -----------------

const Key = 'UpdateNftOperation' as const;

/**
 * Updates an existing NFT or SFT.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .update({ nftOrSft, name: "My new NFT name" });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const updateNftOperation = useOperation<UpdateNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UpdateNftOperation = Operation<
  typeof Key,
  UpdateNftInput,
  UpdateNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UpdateNftInput = {
  /**
   * The NFT or SFT to update.
   * We only need a subset of the `Sft` (or `Nft`) model to figure out
   * the current values for the data of the metadata account and only update
   * the parts that are different.
   */
  nftOrSft: Pick<
    Sft,
    | 'address'
    | 'collection'
    | 'creators'
    | 'name'
    | 'symbol'
    | 'uri'
    | 'sellerFeeBasisPoints'
    | 'uses'
    | 'programmableConfig'
    | 'tokenStandard'
  >;

  /**
   * The current update authority of the asset as a Signer.
   *
   * @defaultValue `metaplex.identity()`
   * @deprecated Use `authority` instead.
   */
  updateAuthority?: Signer;

  /**
   * An authority allowed to update the asset.
   *
   * If a `Signer` is provided directly,
   * it will be used as the update authority.
   *
   * @see {@link TokenMetadataAuthority}
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer | TokenMetadataAuthority;

  /**
   * The authorization rules and data to use for the update.
   *
   * @see {@link TokenMetadataAuthorizationDetails}
   * @defaultValue Defaults to not using auth rules.
   */
  authorizationDetails?: TokenMetadataAuthorizationDetails;

  /**
   * The address of the new update authority to set for the asset
   *
   * @defaultValue Defaults to not being updated.
   */
  newUpdateAuthority?: PublicKey;

  /**
   * The new on-chain name of the asset.
   *
   * @defaultValue Defaults to not being updated.
   */
  name?: string;

  /**
   * The new on-chain symbol of the asset.
   *
   * @defaultValue Defaults to not being updated.
   */
  symbol?: string;

  /**
   * The new on-chain uri of the asset.
   *
   * @defaultValue Defaults to not being updated.
   */
  uri?: string;

  /**
   * The new royalties of the asset in percent basis point
   * (i.e. 250 is 2.5%) that should be paid to the creators
   * on each secondary sale.
   *
   * @defaultValue Defaults to not being updated.
   */
  sellerFeeBasisPoints?: number;

  /**
   * The new creators for the asset.
   * For each creator, if an `authority` Signer is provided,
   * the creator will be marked as verified.
   *
   * @defaultValue Defaults to not being updated.
   */
  creators?: CreatorInput[];

  /**
   * Whether or not the asset has already been sold to its first buyer.
   * This can only be flipped from `false` to `true`.
   *
   * @defaultValue Defaults to not being updated.
   */
  primarySaleHappened?: boolean;

  /**
   * Whether or not the asset is mutable.
   * When set to `false` no one can update the Metadata account,
   * not even the update authority.
   * This can only be flipped from `true` to `false`.
   *
   * @defaultValue Defaults to not being updated.
   */
  isMutable?: boolean;

  /**
   * When this field is not `null`, it indicates that the asset
   * can be "used" by its owner or any approved "use authorities".
   *
   * @defaultValue Defaults to not being updated.
   */
  uses?: Option<Uses>;

  /**
   * The new Collection NFT that this asset belongs to.
   * When `null`, this will remove the asset from its current collection.
   *
   * @defaultValue Defaults to not being updated.
   */
  collection?: Option<PublicKey>;

  /**
   * The ruleset account that should be used to configure the
   * programmable NFT.
   *
   * This is only relevant for programmable NFTs, i.e. if the
   * `tokenStandard` is set to `TokenStandard.ProgrammableNonFungible`.
   *
   * @defaultValue Defaults to not being updated.
   */
  ruleSet?: Option<PublicKey>;

  /**
   * The collection authority that should sign the asset
   * to prove that it is part of the newly provided collection.
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
   * Whether or not the newly provided `collection` is a sized collection
   * and not a legacy collection.
   *
   * @defaultValue `true`
   */
  collectionIsSized?: boolean;

  /**
   * The authority of the asset's current collection.
   * This may be required if the current collection is being removed
   * or updated and needs to be unverified before doing so.
   *
   * @defaultValue `payer`
   */
  oldCollectionAuthority?: Signer;

  /**
   * Whether or not the asset's current collection is a sized collection
   * and not a legacy collection.
   *
   * @defaultValue `true`
   */
  oldCollectionIsSized?: boolean;

  /**
   * Transforms a regular NFT into a Collection NFT of the
   * provided size.
   *
   * The provided size should include all **verified** NFTs
   * and/or SFTs within the Collection. Unverified NFTs
   * and/or SFTs should not be included in the size.
   *
   * **Warning, once set, this size can no longer be updated manually.**
   *
   * @defaultValue Defaults to not being updated.
   */
  collectionDetails?: CollectionDetails;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UpdateNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const updateNftOperationHandler: OperationHandler<UpdateNftOperation> = {
  handle: async (
    operation: UpdateNftOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ): Promise<UpdateNftOutput> => {
    const builder = updateNftBuilder(metaplex, operation.input, scope);

    if (builder.isEmpty()) {
      throw new NoInstructionsToSendError(Key);
    }

    return builder.sendAndConfirm(metaplex, scope.confirmOptions);
  },
};

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type UpdateNftBuilderParams = Omit<UpdateNftInput, 'confirmOptions'> & {
  /** A key to distinguish the instruction that updates the metadata account. */
  updateMetadataInstructionKey?: string;
};

/**
 * Updates an existing NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .update({ nftOrSft, name: "My new NFT name" });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const updateNftBuilder = (
  metaplex: Metaplex,
  params: UpdateNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    nftOrSft,
    updateAuthority = metaplex.identity(),
    authority = updateAuthority,
    authorizationDetails,
  } = params;

  // Programs.
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);
  const systemProgram = metaplex.programs().getSystem(programs);

  const updateInstructionDataWithoutChanges = toInstructionData(nftOrSft);
  const updateInstructionData = toInstructionData(nftOrSft, params);
  const shouldSendUpdateInstruction = !isEqual(
    updateInstructionData,
    updateInstructionDataWithoutChanges
  );

  const isRemovingVerifiedCollection =
    !!nftOrSft.collection &&
    !!nftOrSft.collection.verified &&
    params.collection === null;
  const isOverridingVerifiedCollection =
    !!nftOrSft.collection &&
    !!nftOrSft.collection.verified &&
    !!params.collection &&
    !params.collection.equals(nftOrSft.collection.address);
  const shouldUnverifyCurrentCollection =
    isRemovingVerifiedCollection || isOverridingVerifiedCollection;

  // Auth.
  const auth = parseTokenMetadataAuthorization(metaplex, {
    mint: nftOrSft.address,
    authority:
      '__kind' in authority
        ? authority
        : { __kind: 'metadata', updateAuthority: authority },
    authorizationDetails,
    programs,
  });

  const creatorsInput: CreatorInput[] = params.creators ?? nftOrSft.creators;
  const verifyAdditionalCreatorInstructions = creatorsInput
    .filter((creator) => {
      const currentCreator = nftOrSft.creators.find(({ address }) =>
        address.equals(creator.address)
      );
      const currentlyVerified = currentCreator?.verified ?? false;
      return !!creator.authority && !currentlyVerified;
    })
    .map((creator) => {
      return metaplex.nfts().builders().verifyCreator(
        {
          mintAddress: nftOrSft.address,
          creator: creator.authority,
        },
        { payer, programs }
      );
    });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Unverify current collection before overriding it.
      // Otherwise, the previous collection size will not be properly decremented.
      .when(shouldUnverifyCurrentCollection, (builder) =>
        builder.add(
          metaplex
            .nfts()
            .builders()
            .unverifyCollection(
              {
                mintAddress: nftOrSft.address,
                collectionMintAddress: nftOrSft.collection
                  ?.address as PublicKey,
                collectionAuthority: params.oldCollectionAuthority ?? payer,
                isSizedCollection: params.oldCollectionIsSized ?? true,
              },
              { programs, payer }
            )
        )
      )

      // Update the metadata account.
      .when(shouldSendUpdateInstruction, (builder) =>
        builder.add({
          instruction: createUpdateInstruction(
            {
              authority: auth.accounts.authority,
              delegateRecord: auth.accounts.delegateRecord,
              token: auth.accounts.token,
              mint: nftOrSft.address,
              metadata: metaplex.nfts().pdas().metadata({
                mint: nftOrSft.address,
                programs,
              }),
              edition: isNonFungible(nftOrSft)
                ? metaplex.nfts().pdas().masterEdition({
                    mint: nftOrSft.address,
                    programs,
                  })
                : undefined,
              // tokenRecord, // TODO
              payer: payer.publicKey,
              systemProgram: systemProgram.address,
              sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
              authorizationRules: auth.accounts.authorizationRules,
              authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
            },
            {
              updateArgs: { ...updateInstructionData, ...auth.data } as any,
            },
            tokenMetadataProgram.address
          ),
          signers: [payer, ...auth.signers],
          key: params.updateMetadataInstructionKey ?? 'updateMetadata',
        })
      )

      // Verify additional creators.
      .add(...verifyAdditionalCreatorInstructions)

      // Verify collection.
      .when(!!params.collection && !!params.collectionAuthority, (builder) =>
        builder.add(
          metaplex
            .nfts()
            .builders()
            .verifyCollection(
              {
                mintAddress: nftOrSft.address,
                collectionMintAddress: params.collection as PublicKey,
                collectionAuthority: params.collectionAuthority as Signer,
                isDelegated: params.collectionAuthorityIsDelegated ?? false,
                isSizedCollection: params.collectionIsSized ?? true,
              },
              { programs, payer }
            )
        )
      )
  );
};

const toInstructionData = (
  nftOrSft: Pick<
    Sft,
    | 'address'
    | 'collection'
    | 'creators'
    | 'name'
    | 'symbol'
    | 'uri'
    | 'sellerFeeBasisPoints'
    | 'uses'
    | 'programmableConfig'
  >,
  input: Partial<UpdateNftInput> = {}
): Omit<UpdateArgs, 'authorityType' | 'authorizationData'> => {
  const creators =
    input.creators === undefined
      ? nftOrSft.creators
      : input.creators.map((creator) => {
          const currentCreator = nftOrSft.creators.find(({ address }) =>
            address.equals(creator.address)
          );
          return {
            ...creator,
            verified: currentCreator?.verified ?? false,
          };
        });

  return <Omit<UpdateArgs, 'authorityType' | 'authorizationData'>>{
    __kind: 'V1',
    newUpdateAuthority: input.newUpdateAuthority ?? null,
    data: {
      name: input.name ?? nftOrSft.name,
      symbol: input.symbol ?? nftOrSft.symbol,
      uri: input.uri ?? nftOrSft.uri,
      sellerFeeBasisPoints:
        input.sellerFeeBasisPoints ?? nftOrSft.sellerFeeBasisPoints,
      creators: creators.length > 0 ? creators : null,
    },
    primarySaleHappened: input.primarySaleHappened ?? null,
    isMutable: input.isMutable ?? null,
    collection: input.collection
      ? { __kind: 'Set', fields: [{ key: input.collection, verified: false }] }
      : { __kind: input.collection === undefined ? 'None' : 'Clear' },
    collectionDetails: input.collectionDetails
      ? { __kind: 'Set', fields: [input.collectionDetails] }
      : { __kind: 'None' },
    uses: input.uses
      ? { __kind: 'Set', fields: [input.uses] }
      : { __kind: input.uses === undefined ? 'None' : 'Clear' },
    ruleSet: input.ruleSet
      ? { __kind: 'Set', fields: [input.ruleSet] }
      : { __kind: input.ruleSet === undefined ? 'None' : 'Clear' },
  };
};
