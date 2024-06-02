import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { SolAmount } from './Amount';
import {
  createSerializerFromSolitaType,
  deserializeAccount,
  SolitaType,
} from './Serializer';
import { AccountNotFoundError } from '@/errors';

export type AccountInfo = {
  readonly executable: boolean;
  readonly owner: PublicKey;
  readonly lamports: SolAmount;
  readonly rentEpoch?: number;
};

export type Account<T> = AccountInfo & {
  readonly publicKey: PublicKey;
  readonly data: T;
};

export type MaybeAccount<T> =
  | (Account<T> & { readonly exists: true })
  | { readonly publicKey: PublicKey; readonly exists: false };

export type UnparsedAccount = Account<Buffer>;
export type UnparsedMaybeAccount = MaybeAccount<Buffer>;

export type AccountParsingFunction<T> = {
  (unparsedAccount: UnparsedAccount): Account<T>;
  (unparsedAccount: UnparsedMaybeAccount): MaybeAccount<T>;
};

export type AccountParsingAndAssertingFunction<T> = (
  unparsedAccount: UnparsedAccount | UnparsedMaybeAccount,
  solution?: string
) => Account<T>;

export function getAccountParsingFunction<T>(
  parser: SolitaType<T>
): AccountParsingFunction<T> {
  function parse(account: UnparsedAccount): Account<T>;
  function parse(account: UnparsedMaybeAccount): MaybeAccount<T>;
  function parse(
    account: UnparsedAccount | UnparsedMaybeAccount
  ): Account<T> | MaybeAccount<T> {
    if ('exists' in account && !account.exists) {
      return account;
    }

    const serializer = createSerializerFromSolitaType(parser);
    return deserializeAccount(account, serializer);
  }

  return parse;
}

export function getAccountParsingAndAssertingFunction<T>(
  parser: SolitaType<T>
): AccountParsingAndAssertingFunction<T> {
  const parse = getAccountParsingFunction(parser);

  return (
    unparsedAccount: UnparsedAccount | UnparsedMaybeAccount,
    solution?: string
  ) => {
    if ('exists' in unparsedAccount) {
      assertAccountExists(unparsedAccount, parser.name, solution);
    }

    return parse(unparsedAccount);
  };
}

export function assertAccountExists<T>(
  account: MaybeAccount<T>,
  name?: string,
  solution?: string
): asserts account is Account<T> & { exists: true } {
  if (!account.exists) {
    throw new AccountNotFoundError(account.publicKey, name, solution);
  }
}

export const toAccountInfo = (account: UnparsedAccount): AccountInfo => {
  const { executable, owner, lamports, rentEpoch } = account;
  return { executable, owner, lamports, rentEpoch };
};
