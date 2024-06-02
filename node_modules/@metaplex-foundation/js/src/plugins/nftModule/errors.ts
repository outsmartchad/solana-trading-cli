import { PublicKey } from '@solana/web3.js';
import { MetadataDelegateType, TokenDelegateType } from './DelegateType';
import { MetaplexError } from '@/errors';

/** @group Errors */
export class NftError extends MetaplexError {
  readonly name: string = 'NftError';
  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'NFT', cause);
  }
}

/** @group Errors */
export class ParentCollectionMissingError extends NftError {
  readonly name: string = 'ParentCollectionMissingError';
  constructor(mint: PublicKey, operation: string) {
    const message =
      `You are trying to send the operation [${operation}] which requires the NFT to have ` +
      `a parent collection but that is not the case for the NFT at address [${mint}]. ` +
      'Ensure the NFT you are interacting with has a parent collection.';
    super(message);
  }
}

/** @group Errors */
export class DelegateRoleRequiredDataError extends NftError {
  readonly name: string = 'DelegateRoleRequiredDataError';
  constructor(type: MetadataDelegateType | TokenDelegateType) {
    const message =
      `You are trying to approve a delegate of type "${type}" ` +
      `but did not provide any data for that role. Please provide the "data" ` +
      'attribute as the SDK cannot provide a default value for that role.';
    super(message);
  }
}
