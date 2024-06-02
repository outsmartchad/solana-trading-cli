/** @category Errors */
export class NumberOutOfRangeError extends RangeError {
  readonly name: string = 'NumberOutOfRangeError';

  constructor(
    serializer: string,
    min: number | bigint,
    max: number | bigint,
    actual: number | bigint
  ) {
    super(
      `Serializer [${serializer}] expected number to be between ${min} and ${max}, got ${actual}.`
    );
  }
}
