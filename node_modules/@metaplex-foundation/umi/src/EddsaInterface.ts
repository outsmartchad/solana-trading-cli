import type { Pda, PublicKey } from '@metaplex-foundation/umi-public-keys';
import { InterfaceImplementationMissingError } from './errors';
import type { Keypair } from './Keypair';

/**
 * Defines the interface for the EdDSA cryptography algorithm.
 * It allows us to create, find and use public keys and keypairs.
 *
 * @category Context and Interfaces
 */
export interface EddsaInterface {
  /** Generates a new keypair. */
  generateKeypair: () => Keypair;
  /** Restores a keypair from a secret key. */
  createKeypairFromSecretKey: (secretKey: Uint8Array) => Keypair;
  /** Restores a keypair from a seed. */
  createKeypairFromSeed: (seed: Uint8Array) => Keypair;
  /** Whether the given public key is on the EdDSA elliptic curve. */
  isOnCurve: (publicKey: PublicKey) => boolean;
  /** Finds a Program-Derived Address from the given programId and seeds. */
  findPda: (programId: PublicKey, seeds: Uint8Array[]) => Pda;
  /** Signs a message with the given keypair. */
  sign: (message: Uint8Array, keypair: Keypair) => Uint8Array;
  /** Verifies a signature for a message with the given public key. */
  verify: (
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: PublicKey
  ) => boolean;
}

/**
 * An implementation of the {@link EddsaInterface} that throws an error when called.
 * @category Signers and PublicKeys
 */
export function createNullEddsa(): EddsaInterface {
  const errorHandler = () => {
    throw new InterfaceImplementationMissingError('EddsaInterface', 'eddsa');
  };
  return {
    generateKeypair: errorHandler,
    createKeypairFromSecretKey: errorHandler,
    createKeypairFromSeed: errorHandler,
    isOnCurve: errorHandler,
    findPda: errorHandler,
    sign: errorHandler,
    verify: errorHandler,
  };
}
