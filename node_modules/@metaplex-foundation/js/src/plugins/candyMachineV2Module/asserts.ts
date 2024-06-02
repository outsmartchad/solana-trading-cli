import { Creator } from '@metaplex-foundation/mpl-token-metadata';
import {
  ConfigLine,
  EndSettingType,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  MAX_CREATOR_LIMIT,
  MAX_NAME_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_URI_LENGTH,
} from './constants';
import { CandyMachineV2 } from './models';
import {
  CandyMachineV2AddItemConstraintsViolatedError,
  CandyMachineV2CannotAddAmountError,
  CandyMachineV2EndedError,
  CandyMachineV2IsEmptyError,
  CandyMachineV2IsFullError,
  CandyMachineV2NotLiveError,
} from './errors';
import { assert } from '@/utils';
import { BigNumber, now, Signer, toBigNumber } from '@/types';

export const assertName = (name: string) => {
  assert(
    name.length <= MAX_NAME_LENGTH,
    `Candy Machine name too long: ${name} (max ${MAX_NAME_LENGTH})`
  );
};

export const assertSymbol = (symbol: string) => {
  assert(
    symbol.length <= MAX_SYMBOL_LENGTH,
    `Candy Machine symbol too long: ${symbol} (max ${MAX_SYMBOL_LENGTH})`
  );
};

export const assertUri = (uri: string) => {
  assert(
    uri.length <= MAX_URI_LENGTH,
    `Candy Machine URI too long: ${uri} (max ${MAX_URI_LENGTH})`
  );
};

export const assertCreators = (creators: Creator[]) => {
  assert(
    creators.length <= MAX_CREATOR_LIMIT,
    `Candy Machine creators too long: ${creators} (max ${MAX_CREATOR_LIMIT})`
  );
};

export const assertNotFull = (
  candyMachine: Pick<CandyMachineV2, 'itemsAvailable' | 'itemsLoaded'>,
  index: BigNumber
) => {
  if (candyMachine.itemsAvailable.lte(candyMachine.itemsLoaded)) {
    throw new CandyMachineV2IsFullError(index, candyMachine.itemsAvailable);
  }
};

export const assertNotEmpty = (
  candyMachine: Pick<CandyMachineV2, 'itemsRemaining' | 'itemsAvailable'>
) => {
  if (candyMachine.itemsRemaining.isZero()) {
    throw new CandyMachineV2IsEmptyError(candyMachine.itemsAvailable);
  }
};

export const assertCanAdd = (
  candyMachine: Pick<CandyMachineV2, 'itemsAvailable'>,
  index: BigNumber,
  amount: number
) => {
  if (index.addn(amount).gt(candyMachine.itemsAvailable)) {
    throw new CandyMachineV2CannotAddAmountError(
      index,
      amount,
      candyMachine.itemsAvailable
    );
  }
};

export const assertAllConfigLineConstraints = (configLines: ConfigLine[]) => {
  for (let i = 0; i < configLines.length; i++) {
    try {
      assertName(configLines[i].name);
      assertUri(configLines[i].uri);
    } catch (error) {
      throw new CandyMachineV2AddItemConstraintsViolatedError(
        toBigNumber(i),
        configLines[i],
        error as Error
      );
    }
  }
};

export const assertCandyMachineV2IsLive = (
  candyMachine: Pick<CandyMachineV2, 'whitelistMintSettings' | 'goLiveDate'>
) => {
  const hasWhitelistPresale =
    candyMachine.whitelistMintSettings?.presale ?? false;

  if (hasWhitelistPresale) {
    return;
  }

  const liveDate = candyMachine.goLiveDate;

  if (!liveDate || liveDate.gte(now())) {
    throw new CandyMachineV2NotLiveError(liveDate);
  }
};

export const assertCandyMachineV2HasNotEnded = (
  candyMachine: Pick<CandyMachineV2, 'endSettings' | 'itemsMinted'>
) => {
  const { endSettings } = candyMachine;

  if (!endSettings) {
    return;
  }

  const hasEndedByAmount =
    endSettings.endSettingType === EndSettingType.Amount &&
    candyMachine.itemsMinted.gte(endSettings.number);
  const hasEndedByDate =
    endSettings.endSettingType === EndSettingType.Date &&
    endSettings.date.lt(now());

  if (hasEndedByAmount || hasEndedByDate) {
    throw new CandyMachineV2EndedError(endSettings);
  }
};

export const assertCanMintCandyMachineV2 = (
  candyMachine: Pick<
    CandyMachineV2,
    | 'authorityAddress'
    | 'itemsRemaining'
    | 'itemsAvailable'
    | 'itemsMinted'
    | 'whitelistMintSettings'
    | 'goLiveDate'
    | 'endSettings'
  >,
  payer: Signer
) => {
  assertNotEmpty(candyMachine);

  if (candyMachine.authorityAddress.equals(payer.publicKey)) {
    return;
  }

  assertCandyMachineV2IsLive(candyMachine);
  assertCandyMachineV2HasNotEnded(candyMachine);
};
