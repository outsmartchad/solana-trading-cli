import { Buffer } from 'buffer';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { UninitializedDerivedIdentityError } from './errors';
import {
  IdentitySigner,
  isSigner,
  KeypairSigner,
  Signer,
  SolAmount,
  subtractAmounts,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

/**
 * @group Modules
 */
export class DerivedIdentityClient implements IdentitySigner, KeypairSigner {
  protected readonly metaplex: Metaplex;
  protected originalSigner: Signer | null = null;
  protected derivedKeypair: Keypair | null = null;

  constructor(metaplex: Metaplex) {
    this.metaplex = metaplex;
  }

  get publicKey(): PublicKey {
    this.assertInitialized();

    return this.derivedKeypair.publicKey;
  }

  get secretKey(): Uint8Array {
    this.assertInitialized();

    return this.derivedKeypair.secretKey;
  }

  get originalPublicKey(): PublicKey {
    this.assertInitialized();

    return this.originalSigner.publicKey;
  }

  async deriveFrom(
    message: string | Uint8Array,
    originalSigner?: IdentitySigner
  ) {
    this.originalSigner = originalSigner ?? this.metaplex.identity().driver();

    const signature = await this.originalSigner.signMessage(
      Buffer.from(message)
    );

    const seeds = sha512(signature).slice(0, 32);

    this.derivedKeypair = Keypair.fromSeed(seeds);
  }

  fund(amount: SolAmount) {
    this.assertInitialized();
    return this.metaplex.system().transferSol(
      {
        from: this.originalSigner,
        to: this.derivedKeypair.publicKey,
        amount,
      },
      { payer: this.originalSigner }
    );
  }

  withdraw(amount: SolAmount) {
    this.assertInitialized();
    return this.metaplex.system().transferSol(
      {
        from: this.derivedKeypair,
        to: this.originalSigner.publicKey,
        amount,
      },
      { payer: this.derivedKeypair }
    );
  }

  async withdrawAll() {
    this.assertInitialized();
    const balance = await this.metaplex
      .rpc()
      .getBalance(this.derivedKeypair.publicKey);
    const transactionFee = this.metaplex.utils().estimateTransactionFee();
    return this.withdraw(subtractAmounts(balance, transactionFee));
  }

  close(): void {
    this.originalSigner = null;
    this.derivedKeypair = null;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return ed25519.sync.sign(message, this.secretKey);
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    transaction.partialSign(this);

    return transaction;
  }

  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    return Promise.all(
      transactions.map((transaction) => this.signTransaction(transaction))
    );
  }

  verifyMessage(message: Uint8Array, signature: Uint8Array): boolean {
    return ed25519.sync.verify(message, signature, this.publicKey.toBytes());
  }

  equals(that: Signer | PublicKey): boolean {
    if (isSigner(that)) {
      that = that.publicKey;
    }

    return this.publicKey.equals(that);
  }

  assertInitialized(): asserts this is {
    originalSigner: Signer;
    derivedKeypair: Keypair;
  } {
    if (this.derivedKeypair === null || this.originalSigner === null) {
      throw new UninitializedDerivedIdentityError();
    }
  }
}
