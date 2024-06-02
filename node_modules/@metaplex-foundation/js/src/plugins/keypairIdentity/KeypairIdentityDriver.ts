import * as ed25519 from '@noble/ed25519';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { IdentityDriver } from '../identityModule';
import { KeypairSigner } from '@/types';

export class KeypairIdentityDriver implements IdentityDriver, KeypairSigner {
  public readonly keypair: Keypair;
  public readonly publicKey: PublicKey;
  public readonly secretKey: Uint8Array;

  constructor(keypair: Keypair) {
    this.keypair = keypair;
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;
  }

  public async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return ed25519.sync.sign(message, this.secretKey.slice(0, 32));
  }

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    transaction.partialSign(this.keypair);

    return transaction;
  }

  public async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    return Promise.all(
      transactions.map((transaction) => this.signTransaction(transaction))
    );
  }
}
