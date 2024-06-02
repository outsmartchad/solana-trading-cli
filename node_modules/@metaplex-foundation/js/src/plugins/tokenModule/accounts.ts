import {
  AccountLayout as SplTokenAccountLayout,
  MintLayout as SplMintAccountLayout,
  RawAccount as SplTokenAccount,
  RawMint as SplMintAccount,
} from '@solana/spl-token';
import { NotYetImplementedError } from '@/errors';
import {
  Account,
  SolitaType,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '@/types';

const mintAccountParser: SolitaType<SplMintAccount> = {
  name: 'MintAccount',
  deserialize: (data: Buffer, offset?: number) => {
    const span = SplMintAccountLayout.getSpan(data, offset);
    const decoded = SplMintAccountLayout.decode(data, offset);
    return [decoded, span];
  },
  fromArgs() {
    throw new NotYetImplementedError();
  },
};

/** @group Accounts */
export type MintAccount = Account<SplMintAccount>;

/** @group Account Helpers */
export const parseMintAccount = getAccountParsingFunction(mintAccountParser);

/** @group Account Helpers */
export const toMintAccount =
  getAccountParsingAndAssertingFunction(mintAccountParser);

const tokenAccountParser: SolitaType<SplTokenAccount> = {
  name: 'TokenAccount',
  deserialize: (data: Buffer, offset?: number) => {
    const span = SplTokenAccountLayout.getSpan(data, offset);
    const decoded = SplTokenAccountLayout.decode(data, offset);
    return [decoded, span];
  },
  fromArgs() {
    throw new NotYetImplementedError();
  },
};

/** @group Accounts */
export type TokenAccount = Account<SplTokenAccount>;

/** @group Account Helpers */
export const parseTokenAccount = getAccountParsingFunction(tokenAccountParser);

/** @group Account Helpers */
export const toTokenAccount =
  getAccountParsingAndAssertingFunction(tokenAccountParser);
