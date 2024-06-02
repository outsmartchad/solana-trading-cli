import {
  createInitializeCandyMachineInstruction,
  createSetCollectionInstruction,
  Creator,
} from '@metaplex-foundation/mpl-candy-machine';
import { Keypair, PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { getCandyMachineV2AccountSizeFromData } from '../helpers';
import {
  CandyMachineV2,
  CandyMachineV2Configs,
  toCandyMachineV2InstructionData,
} from '../models';
import { findCandyMachineV2CollectionPda } from '../pdas';
import { CandyMachineV2Program } from '../program';
import {
  Option,
  RequiredKeys,
  TransactionBuilder,
  TransactionBuilderOptions,
} from '@/utils';
import {
  assertSameCurrencies,
  isSigner,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SOL,
  toBigNumber,
  toPublicKey,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';
import { ExpectedSignerError } from '@/errors';

// -----------------
// Operation
// -----------------

const Key = 'CreateCandyMachineV2Operation' as const;

/**
 * Creates a brand new Candy Machine.
 *
 * ```ts
 * const { candyMachine } = await metaplex
 *   .candyMachinesV2()
 *   .create({
 *     sellerFeeBasisPoints: 500, // 5% royalties
 *     price: sol(1.3), // 1.3 SOL
 *     itemsAvailable: toBigNumber(1000), // 1000 items available
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createCandyMachineV2Operation =
  useOperation<CreateCandyMachineV2Operation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateCandyMachineV2Operation = Operation<
  typeof Key,
  CreateCandyMachineV2Input,
  CreateCandyMachineV2Output
>;

export type CreateCandyMachineV2InputWithoutConfigs = {
  /**
   * The Candy Machine to create as a Signer.
   * This expects a brand new Keypair with no associated account.
   *
   * @defaultValue `Keypair.generate()`
   */
  candyMachine?: Signer;

  /**
   * The authority that will be allowed to update the Candy Machine.
   * Upon creation, passing the authority's public key is enough to set it.
   * However, when also passing a `collection` to this operation,
   * this authority will need to be passed as a Signer so the relevant
   * instruction can be signed.
   *
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer | PublicKey; // Defaults to mx.identity().

  /**
   * The mint address of the Collection NFT that all NFTs minted from
   * this Candy Machine should be part of.
   * When provided, the `authority` parameter will need to be passed as a `Signer`.
   * When `null`, minted NFTs won't be part of a collection.
   *
   * @defaultValue `null`
   */
  collection?: Option<PublicKey>;
};

/**
 * @group Operations
 * @category Inputs
 */
export type CreateCandyMachineV2Input =
  CreateCandyMachineV2InputWithoutConfigs &
    RequiredKeys<
      Partial<CandyMachineV2Configs>,
      'price' | 'sellerFeeBasisPoints' | 'itemsAvailable'
    >;

/**
 * @group Operations
 * @category Outputs
 */
export type CreateCandyMachineV2Output = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The created Candy Machine. */
  candyMachine: CandyMachineV2;

  /** The create Candy Machine's account as a Signer. */
  candyMachineSigner: Signer;

  /** The created Candy Machine's wallet. */
  wallet: PublicKey;

  /** The created Candy Machine's authority. */
  authority: PublicKey;

  /** The created Candy Machine's creators. */
  creators: Creator[];
};

/**
 * @group Operations
 * @category Handlers
 */
export const createCandyMachineV2OperationHandler: OperationHandler<CreateCandyMachineV2Operation> =
  {
    async handle(
      operation: CreateCandyMachineV2Operation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<CreateCandyMachineV2Output> {
      const builder = await createCandyMachineV2Builder(
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

      const candyMachine = await metaplex
        .candyMachinesV2()
        .findByAddress({ address: output.candyMachineSigner.publicKey }, scope);

      return { ...output, candyMachine };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateCandyMachineV2BuilderParams = Omit<
  CreateCandyMachineV2Input,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that creates the account. */
  createAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the Candy Machine. */
  initializeCandyMachineInstructionKey?: string;

  /** A key to distinguish the instruction that sets the collection. */
  setCollectionInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateCandyMachineV2BuilderContext = Omit<
  CreateCandyMachineV2Output,
  'response' | 'candyMachine'
>;

/**
 * Creates a brand new Candy Machine.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .candyMachinesV2()
 *   .builders()
 *   .create({
 *     sellerFeeBasisPoints: 500, // 5% royalties
 *     price: sol(1.3), // 1.3 SOL
 *     itemsAvailable: toBigNumber(1000), // 1000 items available
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createCandyMachineV2Builder = async (
  metaplex: Metaplex,
  params: CreateCandyMachineV2BuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateCandyMachineV2BuilderContext>> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const candyMachine = params.candyMachine ?? Keypair.generate();
  const authority = params.authority ?? metaplex.identity();
  const collection: PublicKey | null = params.collection ?? null;

  const { data, wallet, tokenMint } = toCandyMachineV2InstructionData(
    candyMachine.publicKey,
    {
      ...params,
      wallet: params.wallet ?? metaplex.identity().publicKey,
      tokenMint: params.tokenMint ?? null,
      symbol: params.symbol ?? '',
      maxEditionSupply: params.maxEditionSupply ?? toBigNumber(0),
      isMutable: params.isMutable ?? true,
      retainAuthority: params.retainAuthority ?? true,
      goLiveDate: params.goLiveDate ?? null,
      endSettings: params.endSettings ?? null,
      creators: params.creators ?? [
        {
          address: metaplex.identity().publicKey,
          share: 100,
          verified: false,
        },
      ],
      hiddenSettings: params.hiddenSettings ?? null,
      whitelistMintSettings: params.whitelistMintSettings ?? null,
      gatekeeper: params.gatekeeper ?? null,
    }
  );

  const initializeInstruction = createInitializeCandyMachineInstruction(
    {
      candyMachine: candyMachine.publicKey,
      wallet,
      authority: toPublicKey(authority),
      payer: payer.publicKey,
    },
    { data }
  );

  if (tokenMint) {
    initializeInstruction.keys.push({
      pubkey: tokenMint,
      isWritable: false,
      isSigner: false,
    });
  } else {
    assertSameCurrencies(params.price, SOL);
  }

  return (
    TransactionBuilder.make<CreateCandyMachineV2BuilderContext>()
      .setFeePayer(payer)
      .setContext({
        candyMachineSigner: candyMachine,
        wallet,
        authority: toPublicKey(authority),
        creators: data.creators,
      })

      // Create an empty account for the candy machine.
      .add(
        await metaplex
          .system()
          .builders()
          .createAccount(
            {
              newAccount: candyMachine,
              space: getCandyMachineV2AccountSizeFromData(data),
              program: CandyMachineV2Program.publicKey,
              instructionKey:
                params.createAccountInstructionKey ?? 'createAccount',
            },
            { payer, programs }
          )
      )

      // Initialize the candy machine account.
      .add({
        instruction: initializeInstruction,
        signers: [candyMachine, payer],
        key:
          params.initializeCandyMachineInstructionKey ??
          'initializeCandyMachine',
      })

      // Set the collection.
      .when(!!collection, (builder) => {
        if (!isSigner(authority)) {
          throw new ExpectedSignerError(
            'authority',
            'PublicKey',
            'You are trying to create a Candy Machine with a Collection NFT. ' +
              'In order for the Collection NFT to be set successfully, you must provide the authority as a Signer. ' +
              'Please provide the "authority" parameter as a Signer if you want to set the Collection NFT upon creation. ' +
              'Alternatively, you may remove the "collection" parameter to create a Candy Machine without an associated Collection NFT.'
          );
        }

        const collectionMint = collection as PublicKey;
        const metadata = metaplex.nfts().pdas().metadata({
          mint: collectionMint,
          programs,
        });
        const edition = metaplex.nfts().pdas().masterEdition({
          mint: collectionMint,
          programs,
        });
        const collectionPda = findCandyMachineV2CollectionPda(
          candyMachine.publicKey
        );
        const collectionAuthorityRecord = metaplex
          .nfts()
          .pdas()
          .collectionAuthorityRecord({
            mint: collectionMint,
            collectionAuthority: collectionPda,
            programs,
          });

        return builder.add({
          instruction: createSetCollectionInstruction({
            candyMachine: candyMachine.publicKey,
            authority: toPublicKey(authority),
            collectionPda,
            payer: payer.publicKey,
            metadata,
            mint: collectionMint,
            edition,
            collectionAuthorityRecord,
            tokenMetadataProgram: metaplex.programs().getTokenMetadata()
              .address,
          }),
          signers: [authority],
          key: params.setCollectionInstructionKey ?? 'setCollection',
        });
      })
  );
};
