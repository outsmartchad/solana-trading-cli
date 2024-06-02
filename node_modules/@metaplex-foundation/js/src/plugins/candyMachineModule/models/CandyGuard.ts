import {
  CandyGuard as MplCandyGuard,
  candyGuardBeet,
} from '@metaplex-foundation/mpl-candy-guard';
import { CANDY_GUARD_DATA } from '../constants';
import { CandyGuardsSettings } from '../guards';
import {
  AccountInfo,
  assertModel,
  createSerializerFromSolitaType,
  deserializeAccount,
  isModel,
  Model,
  Pda,
  PublicKey,
  toAccountInfo,
  UnparsedAccount,
} from '@/types';
import { Metaplex } from '@/Metaplex';

/** @group Models */
export type CandyGuard<T extends CandyGuardsSettings> = Model<'candyGuard'> & {
  /** The PDA address of the Candy Guard account. */
  readonly address: Pda;

  /** Blockchain data of the Candy Guard account. */
  readonly accountInfo: AccountInfo;

  /** The address used to derive the Candy Guard's PDA. */
  readonly baseAddress: PublicKey;

  /** The address allowed to update the Candy Guard account */
  readonly authorityAddress: PublicKey;

  /**
   * This object provides the settings for all guards in the Candy Guard.
   *
   * If a guard is set to `null`, it is disabled. Otherwise, it is enabled and
   * the object contains the settings for that guard.
   */
  readonly guards: T;

  /**
   * This parameter allows us to create multiple minting groups that have their
   * own set of requirements — i.e. guards.
   *
   * When groups are provided, the `guards` parameter becomes a set of default
   * guards that will be applied to all groups. If a specific group enables
   * a guard that is also present in the default guards, the group's guard
   * will override the default guard.
   *
   * Each group functions the same way as the `guards` parameter, where a guard
   * is enabled if and only if it is not `null`.
   */
  readonly groups: { label: string; guards: T }[];
};

/** @group Model Helpers */
export const isCandyGuard = <T extends CandyGuardsSettings>(
  value: any
): value is CandyGuard<T> => isModel('candyGuard', value);

/** @group Model Helpers */
export function assertCandyGuard<T extends CandyGuardsSettings>(
  value: any
): asserts value is CandyGuard<T> {
  assertModel(isCandyGuard(value), `Expected CandyGuard model`);
}

/** @group Model Helpers */
export const toCandyGuard = <T extends CandyGuardsSettings>(
  account: UnparsedAccount,
  metaplex: Metaplex
): CandyGuard<T> => {
  const candyGuardSerializer = createSerializerFromSolitaType(
    MplCandyGuard,
    candyGuardBeet.description
  );
  const parsedCandyGuard = deserializeAccount(account, candyGuardSerializer);

  const { guards, groups } = metaplex
    .candyMachines()
    .guards()
    .deserializeSettings<T>(
      account.data.slice(CANDY_GUARD_DATA),
      account.owner
    );

  return {
    model: 'candyGuard',
    address: new Pda(parsedCandyGuard.publicKey, parsedCandyGuard.data.bump),
    accountInfo: toAccountInfo(account),
    baseAddress: parsedCandyGuard.data.base,
    authorityAddress: parsedCandyGuard.data.authority,
    guards,
    groups,
  };
};
