import { PublicKey } from '@solana/web3.js';
import {
  CandyMachineV2Account,
  parseCandyMachineV2Account,
  parseCandyMachineV2CollectionAccount,
} from '../accounts';
import { CandyMachineV2GpaBuilder } from '../gpaBuilders';
import { CandyMachineV2, toCandyMachineV2 } from '../models';
import { findCandyMachineV2CollectionPda } from '../pdas';
import { CandyMachineV2Program } from '../program';
import { zipMap } from '@/utils';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Mint, toMint, toMintAccount } from '@/plugins/tokenModule';
import { Metaplex } from '@/Metaplex';
import { UnreachableCaseError } from '@/errors';

// -----------------
// Operation
// -----------------

const Key = 'FindCandyMachinesV2ByPublicKeyOperation' as const;

/**
 * Find all Candy Machines matching by a given `publicKey` or a given `type`.
 *
 * The following two types are supported.
 *
 * `authority`: Find Candy Machines whose authority is the given `publicKey`.
 * ```ts
 * const someAuthority = new PublicKey('...');
 * const candyMachines = await metaplex
 *   .candyMachinesV2()
 *   .findAllBy({ type: 'authority', someAuthority });
 * ```
 *
 * `wallet`: Find Candy Machines whose wallet address is the given `publicKey`.
 * ```ts
 * const someWallet = new PublicKey('...');
 * const candyMachines = await metaplex
 *   .candyMachinesV2()
 *   .findAllBy({ type: 'wallet', someWallet });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findCandyMachinesV2ByPublicKeyFieldOperation =
  useOperation<FindCandyMachinesV2ByPublicKeyFieldOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindCandyMachinesV2ByPublicKeyFieldOperation = Operation<
  typeof Key,
  FindCandyMachinesV2ByPublicKeyFieldInput,
  CandyMachineV2[]
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindCandyMachinesV2ByPublicKeyFieldInput = {
  /** Defines which type of account the `publicKey` field refers to.  */
  type: 'authority' | 'wallet';

  /** The publicKey to filter Candy Machine by. */
  publicKey: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findCandyMachinesV2ByPublicKeyFieldOperationHandler: OperationHandler<FindCandyMachinesV2ByPublicKeyFieldOperation> =
  {
    handle: async (
      operation: FindCandyMachinesV2ByPublicKeyFieldOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<CandyMachineV2[]> => {
      const { commitment } = scope;
      const { type, publicKey } = operation.input;
      const accounts = CandyMachineV2Program.accounts(metaplex).mergeConfig({
        commitment,
      });

      let candyMachineQuery: CandyMachineV2GpaBuilder;
      switch (type) {
        case 'authority':
          candyMachineQuery =
            accounts.candyMachineAccountsForAuthority(publicKey);
          break;
        case 'wallet':
          candyMachineQuery = accounts.candyMachineAccountsForWallet(publicKey);
          break;
        default:
          throw new UnreachableCaseError(type);
      }

      const unparsedAccounts = await candyMachineQuery.get();
      scope.throwIfCanceled();

      const collectionPdas = unparsedAccounts.map((unparsedAccount) =>
        findCandyMachineV2CollectionPda(unparsedAccount.publicKey)
      );

      // Find mint details for all unique SPL tokens used
      // in candy machines that have non-null `tokenMint`

      const parsedAccounts: Record<string, CandyMachineV2Account> =
        Object.fromEntries(
          unparsedAccounts.map((unparsedAccount) => [
            unparsedAccount.publicKey.toString(),
            parseCandyMachineV2Account(unparsedAccount),
          ])
        );

      const tokenMints = [
        ...new Set(
          Object.values(parsedAccounts)
            .map((account) => account.data.tokenMint?.toString())
            .filter((tokenMint): tokenMint is string => tokenMint !== undefined)
        ),
      ].map((address) => new PublicKey(address));

      const result = await metaplex
        .rpc()
        .getMultipleAccounts(tokenMints.concat(collectionPdas), commitment);
      scope.throwIfCanceled();

      const unparsedMintAccounts = result.slice(0, tokenMints.length);
      const unparsedCollectionAccounts = result.slice(-collectionPdas.length);

      const mints: Record<string, Mint> = Object.fromEntries(
        unparsedMintAccounts.map((account) => [
          account.publicKey.toString(),
          toMint(toMintAccount(account)),
        ])
      );

      return zipMap(
        unparsedAccounts,
        unparsedCollectionAccounts,
        (unparsedAccount, unparsedCollectionAccount) => {
          const parsedAccount =
            parsedAccounts[unparsedAccount.publicKey.toString()];
          const collectionAccount = unparsedCollectionAccount
            ? parseCandyMachineV2CollectionAccount(unparsedCollectionAccount)
            : null;
          const tokenMintAddress = parsedAccount.data.tokenMint?.toString();

          return toCandyMachineV2(
            parsedAccount,
            unparsedAccount,
            collectionAccount,
            tokenMintAddress ? mints[tokenMintAddress] : null
          );
        }
      );
    },
  };
