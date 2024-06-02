import type { Amount } from '../Amount';
import { SdkError } from './SdkError';

/** @category Errors */
export class AmountMismatchError extends SdkError {
  readonly name: string = 'AmountMismatchError';

  readonly left: Amount;

  readonly right: Amount;

  readonly operation?: string;

  constructor(left: Amount, right: Amount, operation?: string) {
    const wrappedOperation = operation ? ` [${operation}]` : '';
    const message =
      `The SDK tried to execute an operation${wrappedOperation} on two amounts of different types: ` +
      `[${left.identifier} with ${left.decimals} decimals] and ` +
      `[${right.identifier} with ${right.decimals} decimals]. ` +
      `Provide both amounts in the same type to perform this operation.`;
    super(message);
    this.left = left;
    this.right = right;
    this.operation = operation;
  }
}
