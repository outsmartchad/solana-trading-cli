import { PublicKey } from '@metaplex-foundation/umi-public-keys';
import { SdkError } from './SdkError';

/** @category Errors */
export class AccountNotFoundError extends SdkError {
  readonly name: string = 'AccountNotFoundError';

  constructor(publicKey: PublicKey, accountType?: string, solution?: string) {
    const message = `${
      accountType
        ? `The account of type [${accountType}] was not found`
        : 'No account was found'
    } at the provided address [${publicKey}].${solution ? ` ${solution}` : ''}`;
    super(message);
  }
}
