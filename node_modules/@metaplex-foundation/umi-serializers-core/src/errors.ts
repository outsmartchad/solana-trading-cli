/** @category Errors */
export class DeserializingEmptyBufferError extends Error {
  readonly name: string = 'DeserializingEmptyBufferError';

  constructor(serializer: string) {
    super(`Serializer [${serializer}] cannot deserialize empty buffers.`);
  }
}

/** @category Errors */
export class NotEnoughBytesError extends Error {
  readonly name: string = 'NotEnoughBytesError';

  constructor(
    serializer: string,
    expected: bigint | number,
    actual: bigint | number
  ) {
    super(
      `Serializer [${serializer}] expected ${expected} bytes, got ${actual}.`
    );
  }
}

/** @category Errors */
export class ExpectedFixedSizeSerializerError extends Error {
  readonly name: string = 'ExpectedFixedSizeSerializerError';

  constructor(message?: string) {
    message ??= 'Expected a fixed-size serializer, got a variable-size one.';
    super(message);
  }
}
