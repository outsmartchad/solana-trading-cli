import { PublicKey } from '@solana/web3.js';
import {
  isOriginalEditionAccount,
  OriginalEditionAccount,
  OriginalOrPrintEditionAccount,
  PrintEditionAccount,
} from '../accounts';
import { BigNumber, toBigNumber, toOptionBigNumber } from '@/types';
import { assert, Option } from '@/utils';

/** @group Models */
export type NftEdition = NftOriginalEdition | NftPrintEdition;

/** @group Model Helpers */
export const isNftEdition = (value: any): value is NftEdition =>
  typeof value === 'object' && value.model === 'nftEdition';

/** @group Model Helpers */
export function assertNftEdition(value: any): asserts value is NftEdition {
  assert(isNftEdition(value), `Expected NftEdition model`);
}

/** @group Model Helpers */
export const toNftEdition = (
  account: OriginalOrPrintEditionAccount
): NftEdition =>
  isOriginalEditionAccount(account)
    ? toNftOriginalEdition(account)
    : toNftPrintEdition(account as PrintEditionAccount);

/** @group Models */
export type NftOriginalEdition = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'nftEdition';

  /**
   * Whether or not this is an original edition.
   * This field helps distinguish between the `NftOriginalEdition`
   * and the `NftPrintEdition` models.
   */
  readonly isOriginal: true;

  /** The address of the edition account. */
  readonly address: PublicKey;

  /** The current supply of printed editions. */
  readonly supply: BigNumber;

  /**
   * The maximum supply of printed editions.
   * When this is `null`, an unlimited amount of editions
   * can be printed from the original edition.
   */
  readonly maxSupply: Option<BigNumber>;
};

/** @group Model Helpers */
export const isNftOriginalEdition = (value: any): value is NftOriginalEdition =>
  isNftEdition(value) && value.isOriginal;

/** @group Model Helpers */
export function assertNftOriginalEdition(
  value: any
): asserts value is NftOriginalEdition {
  assert(isNftOriginalEdition(value), `Expected NftOriginalEdition model`);
}

/** @group Model Helpers */
export const toNftOriginalEdition = (
  account: OriginalEditionAccount
): NftOriginalEdition => ({
  model: 'nftEdition',
  isOriginal: true,
  address: account.publicKey,
  supply: toBigNumber(account.data.supply),
  maxSupply: toOptionBigNumber(account.data.maxSupply),
});

/** @group Models */
export type NftPrintEdition = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'nftEdition';

  /**
   * Whether or not this is an original edition.
   * This field helps distinguish between the `NftOriginalEdition`
   * and the `NftPrintEdition` models.
   */
  readonly isOriginal: false;

  /** The address of the edition account. */
  readonly address: PublicKey;

  /** The address of the original edition account this was printed from. */
  readonly parent: PublicKey;

  /**
   * The number of this printed edition.
   *
   * For instance, `1` means this was the very first edition printed
   * from the original edition. This is a key difference between
   * printed editions and SFTs as SFTs do not keep track of any
   * ordering.
   */
  readonly number: BigNumber;
};

/** @group Model Helpers */
export const isNftPrintEdition = (value: any): value is NftPrintEdition =>
  isNftEdition(value) && !value.isOriginal;

/** @group Model Helpers */
export function assertNftPrintEdition(
  value: any
): asserts value is NftPrintEdition {
  assert(isNftPrintEdition(value), `Expected NftPrintEdition model`);
}

/** @group Model Helpers */
export const toNftPrintEdition = (
  account: PrintEditionAccount
): NftPrintEdition => ({
  model: 'nftEdition',
  isOriginal: false,
  address: account.publicKey,
  parent: account.data.parent,
  number: toBigNumber(account.data.edition),
});
