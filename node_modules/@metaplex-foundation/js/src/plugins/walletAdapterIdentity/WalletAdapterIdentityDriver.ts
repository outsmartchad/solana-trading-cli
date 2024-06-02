import { PublicKey, Transaction } from '@solana/web3.js';
import { IdentityDriver } from '../identityModule';
import {
  OperationNotSupportedByWalletAdapterError,
  UninitializedWalletAdapterError,
} from '@/errors';

export type WalletAdapter = {
  publicKey: PublicKey | null;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>;
};

export class WalletAdapterIdentityDriver implements IdentityDriver {
  public readonly walletAdapter: WalletAdapter;

  constructor(walletAdapter: WalletAdapter) {
    this.walletAdapter = walletAdapter;
  }

  get publicKey(): PublicKey {
    if (!this.walletAdapter.publicKey) {
      throw new UninitializedWalletAdapterError();
    }

    return this.walletAdapter.publicKey;
  }

  public async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (this.walletAdapter.signMessage === undefined) {
      throw new OperationNotSupportedByWalletAdapterError('signMessage');
    }

    return this.walletAdapter.signMessage(message);
  }

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (this.walletAdapter.signTransaction === undefined) {
      throw new OperationNotSupportedByWalletAdapterError('signTransaction');
    }

    return this.walletAdapter.signTransaction(transaction);
  }

  public async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    if (this.walletAdapter.signAllTransactions === undefined) {
      throw new OperationNotSupportedByWalletAdapterError(
        'signAllTransactions'
      );
    }

    return this.walletAdapter.signAllTransactions(transactions);
  }
}
