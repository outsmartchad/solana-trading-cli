import type { Amount, AmountDecimals, AmountIdentifier } from '../Amount';
import { SdkError } from './SdkError';

/** @category Errors */
export class UnexpectedAmountError extends SdkError {
  readonly name: string = 'UnexpectedAmountError';

  readonly amount: Amount;

  readonly expectedIdentifier: AmountIdentifier;

  readonly expectedDecimals: AmountDecimals;

  constructor(
    amount: Amount,
    expectedIdentifier: AmountIdentifier,
    expectedDecimals: AmountDecimals
  ) {
    const message =
      `Expected amount of type [${expectedIdentifier} with ${expectedDecimals} decimals] ` +
      `but got [${amount.identifier} with ${amount.decimals} decimals]. ` +
      `Ensure the provided Amount is of the expected type.`;
    super(message);
    this.amount = amount;
    this.expectedIdentifier = expectedIdentifier;
    this.expectedDecimals = expectedDecimals;
  }
}
