import { PublicKey } from '@solana/web3.js';
import { MetaplexError } from './MetaplexError';
import { Cluster, Currency } from '@/types';

/** @group Errors */
export class SdkError extends MetaplexError {
  readonly name: string = 'SdkError';
  constructor(message: string, cause?: Error) {
    super(message, 'sdk', undefined, cause);
  }
}

/** @group Errors */
export class OperationHandlerMissingError extends SdkError {
  readonly name: string = 'OperationHandlerMissingError';
  constructor(operationKey: string) {
    const message =
      `No operation handler was registered for the [${operationKey}] operation. ` +
      `Did you forget to register it? You may do this by using: ` +
      `"metaplex.operations().register(operation, operationHandler)".`;
    super(message);
  }
}

/** @group Errors */
export class DriverNotProvidedError extends SdkError {
  readonly name: string = 'DriverNotProvidedError';
  constructor(driver: string) {
    const message =
      `The SDK tried to access the driver [${driver}] but was not provided. ` +
      `Make sure the driver is registered by using the "setDriver(myDriver)" method.`;
    super(message);
  }
}

/** @group Errors */
export class UnexpectedCurrencyError extends SdkError {
  readonly name: string = 'UnexpectedCurrencyError';
  readonly actual: Currency;
  readonly expected: Currency;
  constructor(actual: Currency, expected: Currency) {
    const message =
      `Expected currency [${expected}] but got [${actual}]. ` +
      `Ensure the provided Amount or Currency is of the expected type.`;
    super(message);
    this.actual = actual;
    this.expected = expected;
  }
}

/** @group Errors */
export class CurrencyMismatchError extends SdkError {
  readonly name: string = 'CurrencyMismatchError';
  readonly left: Currency;
  readonly right: Currency;
  readonly operation?: string;
  constructor(left: Currency, right: Currency, operation?: string) {
    const wrappedOperation = operation ? ` [${operation}]` : '';
    const message =
      `The SDK tried to execute an operation${wrappedOperation} on two different currencies: ` +
      `${left.symbol} and ${right.symbol}. ` +
      `Provide both amounts in the same currency to perform this operation.`;
    super(message);
    this.left = left;
    this.right = right;
    this.operation = operation;
  }
}

/** @group Errors */
export class InvalidJsonVariableError extends SdkError {
  readonly name: string = 'InvalidJsonVariableError';
  constructor(cause?: Error) {
    super(
      'The provided JSON variable could not be parsed into a string.',
      cause
    );
  }
}

/** @group Errors */
export class InvalidJsonStringError extends SdkError {
  readonly name: string = 'InvalidJsonStringError';
  constructor(cause?: Error) {
    super(
      'The provided string could not be parsed into a JSON variable.',
      cause
    );
  }
}

/** @group Errors */
export class OperationUnauthorizedForGuestsError extends SdkError {
  readonly name: string = 'OperationUnauthorizedForGuestsError';
  constructor(operation: string) {
    const message =
      `Trying to access the [${operation}] operation as a guest. ` +
      `Ensure your wallet is connected using the identity driver. ` +
      `For instance, by using "metaplex.use(walletAdapterIdentity(wallet))" or ` +
      `"metaplex.use(keypairIdentity(keypair))".`;
    super(message);
  }
}

/** @group Errors */
export class UninitializedWalletAdapterError extends SdkError {
  readonly name: string = 'UninitializedWalletAdapterError';
  constructor() {
    const message =
      `The current wallet adapter is not initialized. ` +
      'You likely have selected a wallet adapter but forgot to initialize it. ' +
      'You may do this by running the following asynchronous method: "wallet.connect();".';
    super(message);
  }
}

/** @group Errors */
export class OperationNotSupportedByWalletAdapterError extends SdkError {
  readonly name: string = 'OperationNotSupportedByWalletAdapterError';
  constructor(operation: string) {
    const message =
      `The current wallet adapter does not support the following operation: [${operation}]. ` +
      'Ensure your wallet is connected using a compatible wallet adapter.';
    super(message);
  }
}

/** @group Errors */
export class TaskIsAlreadyRunningError extends SdkError {
  readonly name: string = 'TaskIsAlreadyRunningError';
  constructor() {
    const message =
      `Trying to re-run a task that hasn't completed yet. ` +
      `Ensure the task has completed using "await" before trying to run it again.`;
    super(message);
  }
}

/** @group Errors */
export class AssetNotFoundError extends SdkError {
  readonly name: string = 'AssetNotFoundError';
  constructor(location: string) {
    super(`The asset at [${location}] could not be found.`);
  }
}

/** @group Errors */
export class AccountNotFoundError extends SdkError {
  readonly name: string = 'AccountNotFoundError';
  constructor(address: PublicKey, accountType?: string, solution?: string) {
    const message =
      (accountType
        ? `The account of type [${accountType}] was not found`
        : 'No account was found') +
      ` at the provided address [${address.toString()}].` +
      (solution ? ` ${solution}` : '');
    super(message);
  }
}

/** @group Errors */
export class UnexpectedAccountError extends SdkError {
  readonly name: string = 'UnexpectedAccountError';
  constructor(address: PublicKey, expectedType: string, cause?: Error) {
    const message =
      `The account at the provided address [${address.toString()}] ` +
      `is not of the expected type [${expectedType}].`;
    super(message, cause);
  }
}

/** @group Errors */
export class UnexpectedTypeError extends SdkError {
  readonly name: string = 'UnexpectedTypeError';
  constructor(variable: string, actualType: string, expectedType: string) {
    const message =
      `Expected variable [${variable}] to be ` +
      `of type [${expectedType}] but got [${actualType}].`;
    super(message);
  }
}

/** @group Errors */
export class ExpectedSignerError extends SdkError {
  readonly name: string = 'ExpectedSignerError';
  constructor(variable: string, actualType: string, solution?: string) {
    const message =
      `Expected variable [${variable}] to be of type [Signer] but got [${actualType}]. ` +
      (solution ??
        'Please check that you are providing the variable as a signer. ' +
          'Note that, it may be allowed to provide a non-signer variable for certain use cases but not this one.');
    super(message);
  }
}

/** @group Errors */
export class ProgramNotRecognizedError extends SdkError {
  readonly name: string = 'ProgramNotRecognizedError';
  readonly nameOrAddress: string | PublicKey;
  readonly cluster: Cluster;
  constructor(nameOrAddress: string | PublicKey, cluster: Cluster) {
    const isName = typeof nameOrAddress === 'string';
    const toString = isName ? nameOrAddress : nameOrAddress.toString();
    const message =
      `The provided program ${isName ? 'name' : 'address'} [${toString}] ` +
      `is not recognized in the [${cluster}] cluster.` +
      'Did you forget to register this program? ' +
      'If so, you may use "metaplex.programs().register(myProgram)" to fix this.';
    super(message);
    this.nameOrAddress = nameOrAddress;
    this.cluster = cluster;
  }
}

/** @group Errors */
export class NoInstructionsToSendError extends SdkError {
  readonly name: string = 'NoInstructionsToSendError';
  constructor(operation: string, solution?: string) {
    const message =
      `The input provided to the [${operation}] resulted ` +
      `in a Transaction containing no Instructions. ` +
      (solution ??
        `Ensure that the provided input has an effect on the operation. ` +
          `This typically happens when trying to update an account with ` +
          `the same data it already contains.`);
    super(message);
  }
}

/** @group Errors */
export class FailedToSerializeDataError extends SdkError {
  readonly name: string = 'FailedToSerializeDataError';
  constructor(dataDescription: string, cause?: Error) {
    const message = `The received data could not be serialized as a [${dataDescription}].`;
    super(message, cause);
  }
}

/** @group Errors */
export class FailedToDeserializeDataError extends SdkError {
  readonly name: string = 'FailedToDeserializeDataError';
  constructor(dataDescription: string, cause?: Error) {
    const message = `The received serialized data could not be deserialized to a [${dataDescription}].`;
    super(message, cause);
  }
}

/** @group Errors */
export class MissingInputDataError extends SdkError {
  readonly name: string = 'MissingInputDataError';
  constructor(missingParameters: string[], solution?: string) {
    const message =
      `Some parameters are missing from the provided input object. ` +
      'Please provide the following missing parameters ' +
      `[${missingParameters.join(', ')}].` +
      (solution ? ` ${solution}` : '');
    super(message);
  }
}

/** @group Errors */
export class NotYetImplementedError extends SdkError {
  readonly name: string = 'NotYetImplementedError';
  constructor() {
    const message = `This feature is not yet implemented. Please check back later.`;
    super(message);
  }
}

/** @group Errors */
export class UnreachableCaseError extends SdkError {
  readonly name: string = 'UnreachableCaseError';
  constructor(value: never) {
    const message =
      `A switch statement is not handling the provided case [${value}]. ` +
      `Check your inputs or raise an issue to have ensure all cases are handled properly.`;
    super(message);
  }
}
