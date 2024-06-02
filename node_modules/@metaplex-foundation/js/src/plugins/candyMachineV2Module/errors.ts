import { EndSettingType } from '@metaplex-foundation/mpl-candy-machine';
import { CandyMachineV2Item, CandyMachineV2EndSettings } from './models';
import { MetaplexError } from '@/errors';
import { BigNumber, DateTime, formatDateTime } from '@/types';
import { Option } from '@/utils';

/** @group Errors */
export class CandyMachineV2Error extends MetaplexError {
  readonly name: string = 'CandyMachineV2Error';
  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Candy Machine V2', cause);
  }
}

/** @group Errors */
export class CandyMachineV2IsFullError extends CandyMachineV2Error {
  readonly name: string = 'CandyMachineV2IsFullError';
  constructor(assetIndex: BigNumber, itemsAvailable: BigNumber) {
    const message =
      `Trying to add asset number ${assetIndex.addn(1)}, but ` +
      `candy machine only can hold ${itemsAvailable} assets. ` +
      'Limit number of assets you are adding or create a new Candy Machine that can hold more.';
    super(message);
  }
}

/** @group Errors */
export class CandyMachineV2IsEmptyError extends CandyMachineV2Error {
  readonly name: string = 'CandyMachineV2IsEmptyError';
  constructor(itemsAvailable: BigNumber) {
    const message =
      `You're trying to mint from an empty candy machine. ` +
      `All ${itemsAvailable} items have been minted. ` +
      'You can no longer mint from this Candy Machine.';
    super(message);
  }
}

/** @group Errors */
export class CandyMachineV2CannotAddAmountError extends CandyMachineV2Error {
  readonly name: string = 'CandyMachineV2CannotAddAmountError';
  constructor(index: BigNumber, amount: number, itemsAvailable: BigNumber) {
    const message =
      `Trying to add ${amount} assets to candy machine that already ` +
      `has ${index} assets and can only hold ${itemsAvailable} assets.` +
      'Limit number of assets you are adding or create a new Candy Machine that can hold more.';
    super(message);
  }
}

/** @group Errors */
export class CandyMachineV2AddItemConstraintsViolatedError extends CandyMachineV2Error {
  readonly name: string = 'CandyMachineV2AddItemConstraintsViolatedError';
  constructor(index: BigNumber, item: CandyMachineV2Item, cause: Error) {
    const message =
      `Trying to add an asset with name "${item.name}" and uri: "${item.uri}" ` +
      `to candy machine at index ${index} that violates constraints. ` +
      `Fix the name or URI of this asset and try again.`;
    super(message, cause);
  }
}

/** @group Errors */
export class CandyMachineV2NotLiveError extends CandyMachineV2Error {
  readonly name: string = 'CandyMachineV2NotLiveError';
  constructor(goLiveDate: Option<DateTime>) {
    const message =
      `You're trying to mint from a Candy Machine which is not live yet. ` +
      (goLiveDate
        ? `It will go live on ${formatDateTime(goLiveDate)}.`
        : `Its live date has not been set yet.`) +
      'You need to wait until the Candy Machine is live to mint from it. ' +
      'If this is your Candy Machine, use "metaplex.candyMachinesV2().update(...)" to set the live date. ' +
      'Note that the authority of the Candy Machine can mint regardless of the live date.';
    super(message);
  }
}

/** @group Errors */
export class CandyMachineV2EndedError extends CandyMachineV2Error {
  readonly name: string = 'CandyMachineV2EndedError';
  constructor(endSetting: CandyMachineV2EndSettings) {
    const endSettingType =
      endSetting.endSettingType === EndSettingType.Amount ? 'Amount' : 'Date';
    const endSettingExplanation =
      endSetting.endSettingType === EndSettingType.Amount
        ? `All ${endSetting.number} items have been minted.`
        : `It ended on ${formatDateTime(endSetting.date)}.`;
    const message =
      `The end condition [${endSettingType}] of this Candy Machine has been reached. ` +
      endSettingExplanation;
    super(message);
  }
}

/** @group Errors */
export class CandyMachineV2BotTaxError extends CandyMachineV2Error {
  readonly name: string = 'CandyMachineV2BotTaxError';
  constructor(explorerLink: string, cause: Error) {
    const message =
      `The NFT couldn't be fetched after being minted. ` +
      `This is most likely due to a bot tax that occured during minting. ` +
      `When someone tries to mint an NFT from a Candy Machine which cannot be minted from, ` +
      `the program will succeed and charge a small tax to fight against bots. ` +
      `Ensure you can mint from the Candy Machine. ` +
      `You may want to check the transaction logs for more details: [${explorerLink}].`;
    super(message, cause);
  }
}
