import {
  CandyMachine,
  CollectionPDA,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
  MaybeAccount,
} from '@/types';

/** @group Accounts */
export type CandyMachineV2Account = Account<CandyMachine>;

/** @group Account Helpers */
export const parseCandyMachineV2Account =
  getAccountParsingFunction(CandyMachine);

/** @group Account Helpers */
export const toCandyMachineV2Account =
  getAccountParsingAndAssertingFunction(CandyMachine);

/** @group Accounts */
export type CandyMachineV2CollectionAccount = Account<CollectionPDA>;

/** @group Accounts */
export type MaybeCandyMachineV2CollectionAccount = MaybeAccount<CollectionPDA>;

/** @group Account Helpers */
export const parseCandyMachineV2CollectionAccount =
  getAccountParsingFunction(CollectionPDA);

/** @group Account Helpers */
export const toCandyMachineV2CollectionAccount =
  getAccountParsingAndAssertingFunction(CollectionPDA);
