import {
  PublicKey,
  PublicKeyInput,
} from '@metaplex-foundation/umi-public-keys';
import { Transaction } from './Transaction';
import { uniqueBy } from './utils';

/**
 * Defines a public key that can sign transactions and messages.
 * @category Context and Interfaces
 */
export interface Signer {
  /** The public key of the Signer. */
  readonly publicKey: PublicKey;
  /** Signs the given message. */
  readonly signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  /** Signs the given transaction. */
  readonly signTransaction: (transaction: Transaction) => Promise<Transaction>;
  /** Signs all the given transactions at once. */
  readonly signAllTransactions: (
    transactions: Transaction[]
  ) => Promise<Transaction[]>;
}

/**
 * Signs a transaction using the provided signers.
 * @category Signers and PublicKeys
 */
export const signTransaction = async (
  transaction: Transaction,
  signers: Signer[]
): Promise<Transaction> =>
  signers.reduce(async (promise, signer) => {
    const unsigned = await promise;
    return signer.signTransaction(unsigned);
  }, Promise.resolve(transaction));

/**
 * Signs multiple transactions using the provided signers
 * such that signers that need to sign multiple transactions
 * sign them all at once using the `signAllTransactions` method.
 *
 * @category Signers and PublicKeys
 */
export const signAllTransactions = async (
  transactionsWithSigners: {
    transaction: Transaction;
    signers: Signer[];
  }[]
): Promise<Transaction[]> => {
  const transactions = transactionsWithSigners.map((item) => item.transaction);
  const signersWithTransactions = transactionsWithSigners.reduce(
    (all, { signers }, index) => {
      signers.forEach((signer) => {
        const item = all.find(
          (item) => item.signer.publicKey === signer.publicKey
        );
        if (item) {
          item.indices.push(index);
        } else {
          all.push({ signer, indices: [index] });
        }
      });
      return all;
    },
    [] as { signer: Signer; indices: number[] }[]
  );

  return signersWithTransactions.reduce(
    async (promise, { signer, indices }) => {
      const transactions = await promise;
      if (indices.length === 1) {
        const unsigned = transactions[indices[0]];
        transactions[indices[0]] = await signer.signTransaction(unsigned);
        return transactions;
      }
      const unsigned = indices.map((index) => transactions[index]);
      const signed = await signer.signAllTransactions(unsigned);
      indices.forEach((index, position) => {
        transactions[index] = signed[position];
      });
      return transactions;
    },
    Promise.resolve(transactions)
  );
};

/**
 * Whether the provided value is a `Signer`.
 * @category Signers and PublicKeys
 */
export const isSigner = (value: PublicKeyInput | Signer): value is Signer =>
  typeof value === 'object' && 'publicKey' in value && 'signMessage' in value;

/**
 * Deduplicates the provided signers by public key.
 * @category Signers and PublicKeys
 */
export const uniqueSigners = (signers: Signer[]): Signer[] =>
  uniqueBy(signers, (a, b) => a.publicKey === b.publicKey);

/**
 * Creates a `Signer` that, when required to sign, does nothing.
 * This can be useful when libraries require a `Signer` but
 * we don't have one in the current environment. For example,
 * if the transaction will then be signed in a backend server.
 *
 * @category Signers and PublicKeys
 */
export const createNoopSigner = (publicKey: PublicKey): Signer => ({
  publicKey,
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return message;
  },
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    return transaction;
  },
  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    return transactions;
  },
});

/**
 * Creates a `Signer` that, when required to sign, throws an error.
 * @category Signers and PublicKeys
 */
export function createNullSigner(): Signer {
  const error = new Error(
    'Trying to use a NullSigner. ' +
      'Did you forget to set a Signer on your Umi instance? ' +
      'See the `signerIdentity` method for more information.'
  );
  const errorHandler = () => {
    throw error;
  };
  return {
    get publicKey(): PublicKey {
      throw error;
    },
    signMessage: errorHandler,
    signTransaction: errorHandler,
    signAllTransactions: errorHandler,
  };
}
