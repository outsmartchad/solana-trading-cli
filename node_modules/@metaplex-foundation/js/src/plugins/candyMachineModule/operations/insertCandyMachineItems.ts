import { createAddConfigLinesInstruction } from '@metaplex-foundation/mpl-candy-machine-core';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertAllItemConstraints, assertCanAdd } from '../asserts';
import { CandyMachine, CandyMachineItem } from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'InsertCandyMachineItemsOperation' as const;

/**
 * Insert items into an existing Candy Machine.
 *
 * Note that the name and URI of each item should not include
 * the prefixes configured in the config line settings.
 *
 * ```ts
 * await metaplex
 *   .candyMachines()
 *   .insertItems({
 *     candyMachine,
 *     items: [
 *       { name: 'My NFT #1', uri: 'https://example.com/nft1' },
 *       { name: 'My NFT #2', uri: 'https://example.com/nft2' },
 *       { name: 'My NFT #3', uri: 'https://example.com/nft3' },
 *     ],
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const insertCandyMachineItemsOperation =
  useOperation<InsertCandyMachineItemsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type InsertCandyMachineItemsOperation = Operation<
  typeof Key,
  InsertCandyMachineItemsInput,
  InsertCandyMachineItemsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type InsertCandyMachineItemsInput = {
  /**
   * The Candy Machine to insert items into.
   *
   * We only need a subset of the `CandyMachine` model.
   * We need its address, its items settings and the number of items loaded
   * and to be loaded so we can check if the operation is valid.
   */
  candyMachine: Pick<
    CandyMachine,
    'address' | 'itemsAvailable' | 'itemsLoaded' | 'itemSettings'
  >;

  /**
   * The Signer authorized to update the candy machine.
   *
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer;

  /**
   * The items to insert into the candy machine.
   *
   * This only requires the `name` and the `uri` to insert for each item.
   *
   * Important: If your config line settings use prefixes, you must
   * only provide the part of the name or URI that comes after theses prefixes.
   *
   * For example, if your config line settings use the following prefixes:
   * - `prefixName`: `My NFT #`
   * - `prefixUri`: `https://example.com/nfts/`
   *
   * Then, an item to insert could be: `{ name: '1', uri: '1.json' }`.
   *
   * @see {@link CandyMachineItem}
   */
  items: Pick<CandyMachineItem, 'name' | 'uri'>[];

  /**
   * The index we should use to insert the new items. This refers to the
   * index of the first item to insert and the others will follow after it.
   *
   * By defaults, this uses the `itemsLoaded` property so items are simply
   * appended to the current items.
   *
   * @defaultValue `candyMachine.itemsLoaded`
   */
  index?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InsertCandyMachineItemsOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const insertCandyMachineItemsOperationHandler: OperationHandler<InsertCandyMachineItemsOperation> =
  {
    async handle(
      operation: InsertCandyMachineItemsOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<InsertCandyMachineItemsOutput> {
      return insertCandyMachineItemsBuilder(
        metaplex,
        operation.input,
        scope
      ).sendAndConfirm(metaplex, scope.confirmOptions);
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type InsertCandyMachineItemsBuilderParams = Omit<
  InsertCandyMachineItemsInput,
  'confirmOptions'
> & {
  instructionKey?: string;
};

/**
 * Insert items into an existing Candy Machine.
 *
 * Note that the name and URI of each item should not include
 * the prefixes configured in the config line settings.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .candyMachines()
 *   .builders()
 *   .insertItems({ candyMachine, items });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const insertCandyMachineItemsBuilder = (
  metaplex: Metaplex,
  params: InsertCandyMachineItemsBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const authority = params.authority ?? metaplex.identity();
  const index = params.index ?? params.candyMachine.itemsLoaded;
  const { items } = params;

  assertCanAdd(params.candyMachine, index, items.length);
  assertAllItemConstraints(params.candyMachine, items);

  // Programs.
  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createAddConfigLinesInstruction(
        {
          candyMachine: params.candyMachine.address,
          authority: authority.publicKey,
        },
        { index, configLines: items },
        candyMachineProgram.address
      ),
      signers: [authority],
      key: params.instructionKey ?? 'insertItems',
    });
};
