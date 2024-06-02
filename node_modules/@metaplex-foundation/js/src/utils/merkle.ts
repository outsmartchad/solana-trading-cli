import { MerkleTree } from 'merkletreejs';
import { keccak_256 } from '@noble/hashes/sha3';

/**
 * Describes the required data input for
 * handling Merkle Tree operations.
 */
type MerkleTreeInput = Uint8Array | string;

/**
 * Creates a Merkle Tree from the provided data.
 */
export const getMerkleTree = (data: MerkleTreeInput[]): MerkleTree => {
  return new MerkleTree(data.map(keccak_256), keccak_256, {
    sortPairs: true,
  });
};

/**
 * Creates a Merkle Root from the provided data.
 *
 * This root provides a short identifier for the
 * provided data that is unique and deterministic.
 * This means, we can use this root to verify that
 * a given data is part of the original data set.
 */
export const getMerkleRoot = (data: MerkleTreeInput[]): Uint8Array => {
  return getMerkleTree(data).getRoot();
};

/**
 * Creates a Merkle Proof for a given data item.
 *
 * This proof can be used to verify that the given
 * data item is part of the original data set.
 */
export const getMerkleProof = (
  data: MerkleTreeInput[],
  leaf: MerkleTreeInput,
  index?: number
): Uint8Array[] => {
  return getMerkleTree(data)
    .getProof(Buffer.from(keccak_256(leaf)), index)
    .map((proofItem) => proofItem.data);
};

/**
 * Creates a Merkle Proof for a data item at a given index.
 *
 * This proof can be used to verify that the data item at
 * the given index is part of the original data set.
 */
export const getMerkleProofAtIndex = (
  data: MerkleTreeInput[],
  index: number
): Uint8Array[] => {
  return getMerkleProof(data, data[index], index);
};
