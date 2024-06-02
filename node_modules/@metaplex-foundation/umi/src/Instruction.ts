import type { PublicKey } from '@metaplex-foundation/umi-public-keys';
import type { Signer } from './Signer';

/**
 * A wrapped instruction is an instruction with its associated signers and the
 * number of bytes it will create on chain.
 * @category Transactions
 */
export type WrappedInstruction = {
  /** The wrapped instruction. */
  instruction: Instruction;
  /** The signers required for the instruction to succeed. */
  signers: Signer[];
  /** The number of bytes the instruction will create on chain. */
  bytesCreatedOnChain: number;
};

/**
 * Defines an instruction to be sent to a program.
 * @category Transactions
 */
export type Instruction = {
  /** The accounts required by the instruction. */
  keys: AccountMeta[];
  /** The address of the program that will execute the instruction. */
  programId: PublicKey;
  /** The serialized data to pass to the program. */
  data: Uint8Array;
};

/**
 * Defines an account required by an instruction.
 * It includes its public key, whether it is signing the
 * transaction and whether the account should be writable.
 *
 * @category Transactions
 */
export type AccountMeta = {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
};

/**
 * Defines a signer account required by an instruction.
 * It includes the signer and whether the signer account
 * should be writable.
 *
 * @category Transactions
 */
export type SignerMeta = {
  signer: Signer;
  isWritable: boolean;
};
