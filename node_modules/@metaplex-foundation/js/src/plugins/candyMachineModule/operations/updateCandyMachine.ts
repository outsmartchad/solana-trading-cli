import {
  CandyMachineData,
  createSetAuthorityInstruction,
  createSetCollectionInstruction,
  createSetMintAuthorityInstruction,
  createUpdateInstruction as createUpdateCandyMachineInstruction,
} from '@metaplex-foundation/mpl-candy-machine-core';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { CandyGuardsSettings, DefaultCandyGuardSettings } from '../guards';
import {
  CandyMachine,
  CandyMachineConfigLineSettings,
  CandyMachineHiddenSettings,
  isCandyMachine,
  toCandyMachineData,
} from '../models';
import { MissingInputDataError, NoInstructionsToSendError } from '@/errors';
import { Metaplex } from '@/Metaplex';
import {
  BigNumber,
  Creator,
  Operation,
  OperationHandler,
  OperationScope,
  Program,
  PublicKey,
  Signer,
  toPublicKey,
} from '@/types';
import {
  assertObjectHasDefinedKeys,
  removeUndefinedAttributes,
  TransactionBuilder,
  TransactionBuilderOptions,
} from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'UpdateCandyMachineOperation' as const;

/**
 * Updates the every aspect of an existing Candy Machine, including its
 * authorities, collection and guards (when associated with a Candy Guard).
 *
 * ```ts
 * await metaplex
 *   .candyMachines()
 *   .update({
 *     candyMachine,
 *     sellerFeeBasisPoints: 500,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const updateCandyMachineOperation = _updateCandyMachineOperation;
// eslint-disable-next-line @typescript-eslint/naming-convention
function _updateCandyMachineOperation<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(input: UpdateCandyMachineInput<T>): UpdateCandyMachineOperation<T> {
  return { key: Key, input };
}
_updateCandyMachineOperation.key = Key;

/**
 * @group Operations
 * @category Types
 */
export type UpdateCandyMachineOperation<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
> = Operation<typeof Key, UpdateCandyMachineInput<T>, UpdateCandyMachineOutput>;

/**
 * @group Operations
 * @category Inputs
 */
export type UpdateCandyMachineInput<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
> = {
  /**
   * The Candy Machine to update.
   *
   * This can either be a Candy Machine instance or its address.
   * When passing its address, you will need to provide enough input
   * so the SDK knows what to update.
   *
   * For instance, if you only want to update the `creators` array of the Candy Machine,
   * you will also need to provide all other Candy Machine data such as its `symbol`,
   * its `sellerFeeBasisPoints`, etc.
   *
   * That's because the program requires all data to be provided at once when updating.
   * The SDK will raise an error if you don't provide enough data letting you know
   * what's missing.
   *
   * Alternatively, if you provide a Candy Machine instance, the SDK will use its
   * current data to fill all the gaps so you can focus on what you want to update.
   */
  candyMachine: PublicKey | CandyMachine<T>;

  /**
   * The address of the Candy Guard associated to the Candy Machine, if any.
   * This is only required if `candyMachine` is provided as an address and
   * you are trying to update the `guards` or `groups` parameters.
   *
   * @defaultValue `candyMachine.candyGuard?.address`
   */
  candyGuard?: PublicKey;

  /**
   * The Signer authorized to update the Candy Machine.
   *
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer;

  /**
   * The Signer authorized to update the associated Candy Guard, if any.
   * This is typically the same as the Candy Machine authority.
   *
   * @defaultValue Defaults to the `authority` parameter.
   */
  candyGuardAuthority?: Signer;

  /**
   * The new authority that will be allowed to manage the Candy Machine.
   * This includes updating its data, authorities, inserting items, etc.
   *
   * Warning: This means the current `authority` Signer will no longer be able
   * to manage the Candy Machine.
   *
   * Note that if your Candy Machine has a Candy Guard associated to it,
   * you might want to also update the Candy Guard's authority using the
   * `newCandyGuardAuthority` parameter.
   *
   * @defaultValue Defaults to not being updated.
   */
  newAuthority?: PublicKey;

  /**
   * The new authority that will be able to mint from this Candy Machine.
   *
   * This must be a Signer to ensure Candy Guards are not used to mint from
   * unexpected Candy Machines as some of its guards could have side effects.
   *
   * @defaultValue Defaults to not being updated.
   */
  newMintAuthority?: Signer;

  /**
   * The new authority that will be allowed to manage the Candy Guard
   * account associated with the Candy Machine.
   *
   * Warning: This means the current Candy Guard `authority` Signer will
   * no longer be able to manage the Candy Guard account.
   *
   * @defaultValue Defaults to not being updated.
   */
  newCandyGuardAuthority?: PublicKey;

  /**
   * The Collection NFT that all NFTs minted from this Candy Machine should be part of.
   * This must include its address and the update authority as a Signer.
   *
   * If the `candyMachine` attribute is passed as a `PublicKey`, you will also need to
   * provide the mint address of the current collection that will be overriden.
   *
   * @defaultValue Defaults to not being updated.
   */
  collection?: {
    /** The mint address of the collection. */
    address: PublicKey;

    /** The update authority of the collection as a Signer. */
    updateAuthority: Signer;

    /** The mint address of the current collection that will be overriden. */
    currentCollectionAddress?: PublicKey;
  };

  /**
   * The royalties that should be set on minted NFTs in basis points.
   *
   * @defaultValue Defaults to not being updated.
   */
  sellerFeeBasisPoints?: number;

  /**
   * The total number of items availble in the Candy Machine, minted or not.
   *
   * @defaultValue Defaults to not being updated.
   */
  itemsAvailable?: BigNumber;

  /**
   * Settings related to the Candy Machine's items.
   *
   * These can either be inserted manually within the Candy Machine or
   * they can be infered from a set of hidden settings.
   *
   * - If `type` is `hidden`, the Candy Machine is using hidden settings.
   * - If `type` is `configLines`, the Candy Machine is using config line settings.
   *
   * @defaultValue Defaults to not being updated.
   *
   * @see {@link CandyMachineHiddenSettings}
   * @see {@link CandyMachineConfigLineSettings}
   */
  itemSettings?: CandyMachineHiddenSettings | CandyMachineConfigLineSettings;

  /**
   * The symbol to use when minting NFTs (e.g. "MYPROJECT")
   *
   * This can be any string up to 10 bytes and can be made optional
   * by providing an empty string.
   *
   * @defaultValue Defaults to not being updated.
   */
  symbol?: string;

  /**
   * The maximum number of editions that can be printed from the
   * minted NFTs.
   *
   * For most use cases, you'd want to set this to `0` to prevent
   * minted NFTs to be printed multiple times.
   *
   * Note that you cannot set this to `null` which means unlimited editions
   * are not supported by the Candy Machine program.
   *
   * @defaultValue Defaults to not being updated.
   */
  maxEditionSupply?: BigNumber;

  /**
   * Whether the minted NFTs should be mutable or not.
   *
   * We recommend setting this to `true` unless you have a specific reason.
   * You can always make NFTs immutable in the future but you cannot make
   * immutable NFTs mutable ever again.
   *
   * @defaultValue Defaults to not being updated.
   */
  isMutable?: boolean;

  /**
   * Array of creators that should be set on minted NFTs.
   *
   * @defaultValue Defaults to not being updated.
   *
   * @see {@link Creator}
   */
  creators?: Omit<Creator, 'verified'>[];

  /**
   * The settings of all guards we wish to activate.
   *
   * Note that this will override the existing `guards` settings
   * so you must provide all guards you wish to activate.
   *
   * Any guard not provided or set to `null` will be disabled.
   *
   * @defaultValue Defaults to not being updated.
   */
  guards?: Partial<T>;

  /**
   * This parameter allows us to create multiple minting groups that have their
   * own set of requirements — i.e. guards.
   *
   * Note that this will override the existing `groups` settings
   * so you must provide all groups and guards you wish to activate.
   *
   * When groups are provided, the `guards` parameter becomes a set of default
   * guards that will be applied to all groups. If a specific group enables
   * a guard that is also present in the default guards, the group's guard
   * will override the default guard.
   *
   * For each group, any guard not provided or set to `null` will be disabled.
   *
   * You may disable groups by providing an empty array `[]`.
   *
   * @defaultValue Defaults to not being updated.
   */
  groups?: { label: string; guards: Partial<T> }[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type UpdateCandyMachineOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const updateCandyMachineOperationHandler: OperationHandler<UpdateCandyMachineOperation> =
  {
    async handle<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
      operation: UpdateCandyMachineOperation<T>,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<UpdateCandyMachineOutput> {
      const builder = updateCandyMachineBuilder(
        metaplex,
        operation.input,
        scope
      );

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
export type UpdateCandyMachineBuilderParams<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
> = Omit<UpdateCandyMachineInput<T>, 'confirmOptions'> & {
  /** A key to distinguish the instruction that updates the Candy Machine data. */
  updateDataInstructionKey?: string;

  /** A key to distinguish the instruction that updates the Candy Machine collection. */
  setCollectionInstructionKey?: string;

  /** A key to distinguish the instruction that updates the associated Candy Guard, if any. */
  updateCandyGuardInstructionKey?: string;

  /** A key to distinguish the instruction that updates the Candy Machine's mint authority. */
  setMintAuthorityInstructionKey?: string;

  /** A key to distinguish the instruction that updates the Candy Machine's authority. */
  setAuthorityInstructionKey?: string;

  /** A key to distinguish the instruction that updates the Candy Guard's authority. */
  setCandyGuardAuthorityInstructionKey?: string;
};

/**
 * Updates the every aspect of an existing Candy Machine, including its
 * authorities, collection and guards (when associated with a Candy Guard).
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .candyMachines()
 *   .builders()
 *   .update({
 *     candyMachine,
 *     sellerFeeBasisPoints: 500,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const updateCandyMachineBuilder = <
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  metaplex: Metaplex,
  params: UpdateCandyMachineBuilderParams<T>,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { authority = metaplex.identity(), candyGuardAuthority = authority } =
    params;

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update Candy Machine data.
      .add(
        updateCandyMachineDataBuilder<T>(metaplex, params, authority, programs)
      )

      // Update Candy Machine collection.
      .add(
        updateCandyMachineCollectionBuilder<T>(
          metaplex,
          params,
          authority,
          payer,
          programs
        )
      )

      // Update Candy Guard's guards and groups, if any.
      .add(
        updateCandyGuardsBuilder<T>(
          metaplex,
          params,
          candyGuardAuthority,
          payer,
          programs
        )
      )

      // Update Candy Machine mint authority.
      .add(
        updateCandyMachineMintAuthorityBuilder<T>(
          metaplex,
          params,
          authority,
          programs
        )
      )

      // Update Candy Machine authority.
      .add(
        updateCandyMachineAuthorityBuilder<T>(
          metaplex,
          params,
          authority,
          programs
        )
      )

      // Update Candy Guard authority.
      .add(
        updateCandyGuardAuthorityBuilder<T>(
          metaplex,
          params,
          candyGuardAuthority,
          payer,
          programs
        )
      )
  );
};

const updateCandyMachineDataBuilder = <
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  metaplex: Metaplex,
  params: UpdateCandyMachineBuilderParams<T>,
  authority: Signer,
  programs?: Program[]
): TransactionBuilder => {
  const dataToUpdate: Partial<CandyMachine> = removeUndefinedAttributes({
    itemsAvailable: params.itemsAvailable,
    symbol: params.symbol,
    sellerFeeBasisPoints: params.sellerFeeBasisPoints,
    maxEditionSupply: params.maxEditionSupply,
    isMutable: params.isMutable,
    creators: params.creators,
    itemSettings: params.itemSettings,
  });

  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);

  let data: CandyMachineData;
  if (Object.keys(dataToUpdate).length === 0) {
    return TransactionBuilder.make();
  } else if (isCandyMachine(params.candyMachine)) {
    data = toCandyMachineData({ ...params.candyMachine, ...dataToUpdate });
  } else {
    assertObjectHasDefinedKeys(
      dataToUpdate,
      [
        'itemsAvailable',
        'symbol',
        'sellerFeeBasisPoints',
        'maxEditionSupply',
        'isMutable',
        'creators',
        'itemSettings',
      ],
      onMissingInputError
    );
    data = toCandyMachineData(dataToUpdate);
  }

  return TransactionBuilder.make().add({
    instruction: createUpdateCandyMachineInstruction(
      {
        candyMachine: toPublicKey(params.candyMachine),
        authority: authority.publicKey,
      },
      { data },
      candyMachineProgram.address
    ),
    signers: [authority],
    key: params.updateDataInstructionKey ?? 'updateCandyMachineData',
  });
};

const updateCandyMachineCollectionBuilder = <
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  metaplex: Metaplex,
  params: UpdateCandyMachineBuilderParams<T>,
  authority: Signer,
  payer: Signer,
  programs?: Program[]
): TransactionBuilder => {
  if (!params.collection) {
    return TransactionBuilder.make();
  }

  const currentCollectionAddress =
    params.collection.currentCollectionAddress ??
    (isCandyMachine(params.candyMachine)
      ? params.candyMachine.collectionMintAddress
      : null);

  if (!currentCollectionAddress) {
    throw onMissingInputError(['collection.currentCollectionAddress']);
  }

  // Programs.
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);
  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);

  // Addresses.
  const candyMachineAddress = toPublicKey(params.candyMachine);
  const collectionAddress = params.collection.address;
  const collectionUpdateAuthority = params.collection.updateAuthority;

  // PDAs.
  const authorityPda = metaplex.candyMachines().pdas().authority({
    candyMachine: candyMachineAddress,
    programs,
  });
  const currentCollectionMetadata = metaplex.nfts().pdas().metadata({
    mint: currentCollectionAddress,
  });
  const currentCollectionAuthorityRecord = metaplex
    .nfts()
    .pdas()
    .collectionAuthorityRecord({
      mint: currentCollectionAddress,
      collectionAuthority: authorityPda,
    });
  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: collectionAddress,
  });
  const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
    mint: collectionAddress,
  });
  const collectionAuthorityRecord = metaplex
    .nfts()
    .pdas()
    .collectionAuthorityRecord({
      mint: collectionAddress,
      collectionAuthority: authorityPda,
    });

  return TransactionBuilder.make().add({
    instruction: createSetCollectionInstruction(
      {
        candyMachine: candyMachineAddress,
        authority: authority.publicKey,
        authorityPda,
        payer: payer.publicKey,
        collectionMint: currentCollectionAddress,
        collectionMetadata: currentCollectionMetadata,
        collectionAuthorityRecord: currentCollectionAuthorityRecord,
        newCollectionUpdateAuthority: collectionUpdateAuthority.publicKey,
        newCollectionMetadata: collectionMetadata,
        newCollectionMint: collectionAddress,
        newCollectionMasterEdition: collectionMasterEdition,
        newCollectionAuthorityRecord: collectionAuthorityRecord,
        tokenMetadataProgram: tokenMetadataProgram.address,
      },
      candyMachineProgram.address
    ),
    signers: [authority, payer, collectionUpdateAuthority],
    key: params.setCollectionInstructionKey ?? 'setCandyMachineCollection',
  });
};

const updateCandyGuardsBuilder = <
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  metaplex: Metaplex,
  params: UpdateCandyMachineBuilderParams<T>,
  candyGuardAuthority: Signer,
  payer: Signer,
  programs?: Program[]
): TransactionBuilder => {
  const guardsToUpdate: {
    candyGuard?: PublicKey;
    guards?: Partial<T>;
    groups?: { label: string; guards: Partial<T> }[];
  } = removeUndefinedAttributes({
    candyGuard: params.candyGuard,
    guards: params.guards,
    groups: params.groups,
  });

  let args: {
    candyGuard: PublicKey;
    guards: Partial<T>;
    groups: { label: string; guards: Partial<T> }[];
  };

  if (Object.keys(guardsToUpdate).length === 0) {
    return TransactionBuilder.make();
  }

  if (
    isCandyMachine<T>(params.candyMachine) &&
    params.candyMachine.candyGuard
  ) {
    args = {
      candyGuard: params.candyMachine.candyGuard.address,
      guards: params.candyMachine.candyGuard.guards,
      groups: params.candyMachine.candyGuard.groups,
      ...guardsToUpdate,
    };
  } else {
    assertObjectHasDefinedKeys(
      guardsToUpdate,
      ['candyGuard', 'guards', 'groups'],
      onMissingInputError
    );
    args = guardsToUpdate;
  }

  return metaplex
    .candyMachines()
    .builders()
    .updateCandyGuard<T>(
      {
        candyGuard: args.candyGuard,
        guards: args.guards,
        groups: args.groups,
        authority: candyGuardAuthority,
        updateInstructionKey:
          params.updateCandyGuardInstructionKey ?? 'updateCandyGuard',
      },
      { payer, programs }
    );
};

const updateCandyMachineMintAuthorityBuilder = <
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  metaplex: Metaplex,
  params: UpdateCandyMachineBuilderParams<T>,
  authority: Signer,
  programs?: Program[]
): TransactionBuilder => {
  if (!params.newMintAuthority) {
    return TransactionBuilder.make();
  }

  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);

  return TransactionBuilder.make().add({
    instruction: createSetMintAuthorityInstruction(
      {
        candyMachine: toPublicKey(params.candyMachine),
        authority: authority.publicKey,
        mintAuthority: params.newMintAuthority.publicKey,
      },
      candyMachineProgram.address
    ),
    signers: [authority, params.newMintAuthority],
    key: params.setAuthorityInstructionKey ?? 'setCandyMachineAuthority',
  });
};

const updateCandyMachineAuthorityBuilder = <
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  metaplex: Metaplex,
  params: UpdateCandyMachineBuilderParams<T>,
  authority: Signer,
  programs?: Program[]
): TransactionBuilder => {
  if (!params.newAuthority) {
    return TransactionBuilder.make();
  }

  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);

  return TransactionBuilder.make().add({
    instruction: createSetAuthorityInstruction(
      {
        candyMachine: toPublicKey(params.candyMachine),
        authority: authority.publicKey,
      },
      { newAuthority: params.newAuthority },
      candyMachineProgram.address
    ),
    signers: [authority],
    key: params.setAuthorityInstructionKey ?? 'setCandyMachineAuthority',
  });
};

const updateCandyGuardAuthorityBuilder = <
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  metaplex: Metaplex,
  params: UpdateCandyMachineBuilderParams<T>,
  candyGuardAuthority: Signer,
  payer: Signer,
  programs?: Program[]
): TransactionBuilder => {
  if (!params.newCandyGuardAuthority) {
    return TransactionBuilder.make();
  }

  const candyGuardAddress =
    params.candyGuard ??
    (isCandyMachine<T>(params.candyMachine) && params.candyMachine.candyGuard
      ? params.candyMachine.candyGuard.address
      : null);

  if (!candyGuardAddress) {
    throw onMissingInputError(['candyGuard']);
  }

  return TransactionBuilder.make().add(
    metaplex.candyMachines().builders().updateCandyGuardAuthority(
      {
        candyGuard: candyGuardAddress,
        authority: candyGuardAuthority,
        newAuthority: params.newCandyGuardAuthority,
        instructionKey: params.setCandyGuardAuthorityInstructionKey,
      },
      { payer, programs }
    )
  );
};

const onMissingInputError = (missingKeys: string[]) =>
  new MissingInputDataError(
    missingKeys,
    'When passing the Candy Machine as a `PublicKey` instead of a Candy Machine model ' +
      'the SDK cannot rely on current data to fill the gaps within the provided input. ' +
      'Alternatively, you can pass the Candy Machine model instead.'
  );
