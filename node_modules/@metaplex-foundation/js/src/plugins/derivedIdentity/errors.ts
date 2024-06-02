import { MetaplexError } from '@/errors';

/** @group Errors */
export class DerivedIdentityError extends MetaplexError {
  readonly name: string = 'DerivedIdentityError';
  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Derived Identity', cause);
  }
}

/** @group Errors */
export class UninitializedDerivedIdentityError extends DerivedIdentityError {
  constructor() {
    const message =
      'The derived identity module has not been initialized. ' +
      'Before using the derived identity, you must provide a message that ' +
      'will be used to derived a Keypair from the current identity. ' +
      'You may do that by calling "metaplex.derivedIdentity().deriveFrom(message)".';
    super(message);
  }
}
