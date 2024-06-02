import { MetaplexError } from '@/errors';

/** @group Errors */
export class CandyMachineV3Error extends MetaplexError {
  readonly name: string = 'CandyMachineV3Error';
  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Candy Machine V3', cause);
  }
}

/** @group Errors */
export class UnregisteredCandyGuardError extends CandyMachineV3Error {
  readonly name: string = 'UnregisteredCandyGuardError';
  constructor(name: string) {
    const message =
      `The SDK is trying to access a custom Candy Guard named [${name}] ` +
      `but that guard was not registered in the SDK ` +
      'Register your custom guard by calling the `metaplex.candyMachines().guards().register()` method.';
    super(message);
  }
}

/** @group Errors */
export class CandyMachineIsFullError extends CandyMachineV3Error {
  readonly name: string = 'CandyMachineIsFullError';
  constructor(index: number, itemsAvailable: number) {
    const message =
      `You are trying to add an item at index ${index} to a Candy Machine that ` +
      `can only hold a maximum of ${itemsAvailable} items. ` +
      'Limit number of items you are adding or create a Candy Machine that can hold more of them.';
    super(message);
  }
}

/** @group Errors */
export class CandyMachineCannotAddAmountError extends CandyMachineV3Error {
  readonly name: string = 'CandyMachineCannotAddAmountError';
  constructor(index: number, amount: number, itemsAvailable: number) {
    const message =
      `You are trying to add ${amount} items to candy machine starting at index ${index} ` +
      ` but it can only hold a maximum of ${itemsAvailable} items. ` +
      'Limit number of assets you are adding or create a Candy Machine that can hold more of them.';
    super(message);
  }
}

/** @group Errors */
export class CandyMachineItemTextTooLongError extends CandyMachineV3Error {
  readonly name: string = 'CandyMachineItemTextTooLongError';
  constructor(
    index: number,
    type: 'name' | 'uri',
    text: string,
    limit: number
  ) {
    const message =
      `You are trying to add an item to a Candy Machine but its ${type} is too long. ` +
      `The item settings define the ${type} limit as ${limit} characters but the following ` +
      `content was provided [${text}] for the item at index ${index} ` +
      `Reduce the size of the ${type} for the item at index ${index}.`;
    super(message);
  }
}

/** @group Errors */
export class CandyMachineBotTaxError extends CandyMachineV3Error {
  readonly name: string = 'CandyMachineBotTaxError';
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

/** @group Errors */
export class GuardGroupRequiredError extends CandyMachineV3Error {
  readonly name: string = 'GuardGroupRequiredError';
  constructor(availableGroups: string[]) {
    const message =
      'The provided Candy Machine defines groups of guards but no' +
      'group label was provided to identity which group we should select. ' +
      'Please provide the label of the group you wish to select from via the `group` parameter. ' +
      `The available groups are [${availableGroups.join(', ')}]`;
    super(message);
  }
}

/** @group Errors */
export class SelectedGuardGroupDoesNotExistError extends CandyMachineV3Error {
  readonly name: string = 'SelectedGuardGroupDoesNotExistError';
  constructor(selectedGroup: string, availableGroups: string[]) {
    const message =
      `You're trying to select the guard group [${selectedGroup}] from a ` +
      'Candy Machine but this group does not exists on this Candy Machine. ' +
      (availableGroups.length > 0
        ? 'Please provide the label of a group that exists on the Candy Machine. ' +
          `The available groups are [${availableGroups.join(', ')}]`
        : 'There are no guard groups defined on the Candy Machine. ' +
          'Please set the `group` parameter to `null` or remove it altogether.');
    super(message);
  }
}

/** @group Errors */
export class GuardMintSettingsMissingError extends CandyMachineV3Error {
  readonly name: string = 'GuardMintSettingsMissingError';
  constructor(guardName: string) {
    const message =
      `The Candy Machine you are trying to mint from has the [${guardName}] guard enabled. ` +
      'This guard requires you to provide some additional settings when minting which you did not provide. ' +
      `Please provide some minting settings for the [${guardName}] guard ` +
      `via the \`guards\` parameter like so: \`guards.${guardName} = {...}\`.`;
    super(message);
  }
}

/** @group Errors */
export class GuardRouteNotSupportedError extends CandyMachineV3Error {
  readonly name: string = 'GuardRouteNotSupportedError';
  constructor(guardName: string) {
    const message =
      `You are trying to call the route instruction of the [${guardName}] guard ` +
      'but this guard does not support this feature or did not register it on the SDK. ' +
      'Please select a guard that support the route instruction feature. ' +
      'If you are using a custom guard, make sure you registered the route instruction ' +
      'feature by implementing the `routeSettingsParser` method on the guard manifest.';
    super(message);
  }
}

/** @group Errors */
export class CandyGuardRequiredOnCandyMachineError extends CandyMachineV3Error {
  readonly name: string = 'CandyGuardRequiredOnCandyMachineError';
  constructor() {
    const message =
      `The provided Candy Machine does not have a Candy Guard associated with ` +
      `it yet, it is required for the operation you are trying to execute. ` +
      'Please provide a Candy Machine with an associated Candy Guard account.';
    super(message);
  }
}

/** @group Errors */
export class GuardNotEnabledError extends CandyMachineV3Error {
  readonly name: string = 'GuardNotEnabledError';
  constructor(guard: string, group: string | null) {
    const message =
      (group
        ? `The guard [${guard}] is not enabled on the group [${group}] of the Candy Machine.`
        : `The guard [${guard}] is not enabled on the Candy Machine. `) +
      'Please provide a different guard or select a different group ' +
      'such that the provided guard is enabled on the selected group.';
    super(message);
  }
}

/** @group Errors */
export class GuardGroupLabelTooLongError extends CandyMachineV3Error {
  readonly name: string = 'GuardGroupLabelTooLongError';
  constructor(label: string, maxLength: number) {
    const message =
      `The provided group label [${label}] is too long. ` +
      `Group labels cannot be longer than ${maxLength} characters. ` +
      'Please provide a shorter group label.';
    super(message);
  }
}

/** @group Errors */
export class UnrecognizePathForRouteInstructionError extends CandyMachineV3Error {
  readonly name: string = 'UnrecognizePathForRouteInstructionError';
  constructor(guard: string, path: string) {
    const message =
      `The provided path [${path}] does not exist on the route instruction of the [${guard}] guard. ` +
      'Please provide a recognized path.';
    super(message);
  }
}

/** @group Errors */
export class MintOwnerMustBeMintPayerError extends CandyMachineV3Error {
  readonly name: string = 'MintOwnerMustBeMintPayerError';
  constructor(guard: string) {
    const message =
      `The payer must be the owner when using the [${guard}] guard. ` +
      'Please remove the `owner` attribute from the mint input so they can be the same.';
    super(message);
  }
}

/** @group Errors */
export class MaximumOfFiveAdditionalProgramsError extends CandyMachineV3Error {
  readonly name: string = 'MaximumOfFiveAdditionalProgramsError';
  constructor() {
    const message =
      `There is a maximum of five additional programs when using the [programGate] guard. ` +
      'Please reduce the number of additional programs to <= 5.';
    super(message);
  }
}
