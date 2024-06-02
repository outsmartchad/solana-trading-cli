import { Buffer } from 'buffer';
import {
  Edition,
  Key,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  Account,
  SolitaType,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '@/types';
import { NotYetImplementedError } from '@/errors';

/** @group Accounts */
export type MetadataAccount = Account<Metadata>;

/** @group Account Helpers */
export const parseMetadataAccount = getAccountParsingFunction(Metadata);

/** @group Account Helpers */
export const toMetadataAccount =
  getAccountParsingAndAssertingFunction(Metadata);

/** @group Accounts */
export type OriginalOrPrintEditionAccountData =
  | OriginalEditionAccountData
  | PrintEditionAccountData;

/** @group Accounts */
export type OriginalOrPrintEditionAccount =
  Account<OriginalOrPrintEditionAccountData>;

const originalOrPrintEditionAccountParser: SolitaType<OriginalOrPrintEditionAccountData> =
  {
    name: 'MasterEditionV1 | MasterEditionV2 | Edition',
    deserialize: (data: Buffer, offset = 0) => {
      if (data?.[0] === Key.MasterEditionV1) {
        return MasterEditionV1.deserialize(data, offset);
      } else if (data?.[0] === Key.MasterEditionV2) {
        return MasterEditionV2.deserialize(data, offset);
      }
      return Edition.deserialize(data, offset);
    },
    fromArgs() {
      throw new NotYetImplementedError();
    },
  };

/** @group Account Helpers */
export const parseOriginalOrPrintEditionAccount =
  getAccountParsingFunction<OriginalOrPrintEditionAccountData>(
    originalOrPrintEditionAccountParser
  );

/** @group Account Helpers */
export const toOriginalOrPrintEditionAccount =
  getAccountParsingAndAssertingFunction<OriginalOrPrintEditionAccountData>(
    originalOrPrintEditionAccountParser
  );

/** @group Account Helpers */
export const isOriginalEditionAccount = (
  account: OriginalOrPrintEditionAccount
): account is OriginalEditionAccount => {
  return 'maxSupply' in account.data;
};

/** @group Account Helpers */
export const isPrintEditionAccount = (
  account: OriginalOrPrintEditionAccount
): account is PrintEditionAccount => {
  return !isOriginalEditionAccount(account);
};

/** @group Accounts */
export type OriginalEditionAccountData = MasterEditionV1 | MasterEditionV2;

/** @group Accounts */
export type OriginalEditionAccount = Account<OriginalEditionAccountData>;

const originalEditionAccountParser: SolitaType<OriginalEditionAccountData> = {
  name: 'MasterEditionV1 | MasterEditionV2',
  deserialize: (data: Buffer, offset = 0) => {
    if (data?.[0] === Key.MasterEditionV1) {
      return MasterEditionV1.deserialize(data, offset);
    }
    return MasterEditionV2.deserialize(data, offset);
  },
  fromArgs() {
    throw new NotYetImplementedError();
  },
};

/** @group Account Helpers */
export const parseOriginalEditionAccount =
  getAccountParsingFunction<OriginalEditionAccountData>(
    originalEditionAccountParser
  );

/** @group Account Helpers */
export const toOriginalEditionAccount =
  getAccountParsingAndAssertingFunction<OriginalEditionAccountData>(
    originalEditionAccountParser
  );

/** @group Accounts */
export type PrintEditionAccountData = Edition;

/** @group Accounts */
export type PrintEditionAccount = Account<PrintEditionAccountData>;

/** @group Account Helpers */
export const parsePrintEditionAccount = getAccountParsingFunction(Edition);

/** @group Account Helpers */
export const toPrintEditionAccount =
  getAccountParsingAndAssertingFunction(Edition);
