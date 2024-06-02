/** @category Errors */
export class InvalidNumberOfItemsError extends Error {
  readonly name = 'InvalidNumberOfItemsError';

  constructor(
    serializer: string,
    expected: number | bigint,
    actual: number | bigint
  ) {
    super(`Expected [${serializer}] to have ${expected} items, got ${actual}.`);
  }
}

/** @category Errors */
export class InvalidArrayLikeRemainderSizeError extends Error {
  readonly name = 'InvalidArrayLikeRemainderSizeError';

  constructor(remainderSize: number | bigint, itemSize: number | bigint) {
    super(
      `The remainder of the buffer (${remainderSize} bytes) cannot be split into chunks of ${itemSize} bytes. ` +
        `Serializers of "remainder" size must have a remainder that is a multiple of its item size. ` +
        `In other words, ${remainderSize} modulo ${itemSize} should be equal to zero.`
    );
  }
}

/** @category Errors */
export class UnrecognizedArrayLikeSerializerSizeError extends Error {
  readonly name = 'UnrecognizedArrayLikeSerializerSizeError';

  constructor(size: never) {
    super(`Unrecognized array-like serializer size: ${JSON.stringify(size)}`);
  }
}

/** @category Errors */
export class InvalidDataEnumVariantError extends Error {
  readonly name = 'InvalidDataEnumVariantError';

  constructor(invalidVariant: string, validVariants: string[]) {
    super(
      `Invalid data enum variant. ` +
        `Expected one of [${validVariants.join(', ')}], ` +
        `got "${invalidVariant}".`
    );
  }
}

/** @category Errors */
export class InvalidScalarEnumVariantError extends Error {
  readonly name = 'InvalidScalarEnumVariantError';

  constructor(
    invalidVariant: string | number | bigint,
    validVariants: string[],
    min: number | bigint,
    max: number | bigint
  ) {
    super(
      `Invalid scalar enum variant. ` +
        `Expected one of [${validVariants.join(', ')}] ` +
        `or a number between ${min} and ${max}, ` +
        `got "${invalidVariant}".`
    );
  }
}

/** @category Errors */
export class EnumDiscriminatorOutOfRangeError extends RangeError {
  readonly name = 'EnumDiscriminatorOutOfRangeError';

  constructor(
    discriminator: number | bigint,
    min: number | bigint,
    max: number | bigint
  ) {
    super(
      `Enum discriminator out of range. ` +
        `Expected a number between ${min} and ${max}, got ${discriminator}.`
    );
  }
}
