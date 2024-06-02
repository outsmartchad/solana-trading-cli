import type { default as NodeIrys, WebIrys } from '@irys/sdk';

import BigNumber from 'bignumber.js';
import {
  Connection,
  Keypair,
  PublicKey,
  SendOptions,
  Signer as Web3Signer,
  Transaction,
  TransactionSignature,
} from '@solana/web3.js';
import {
  getBytesFromMetaplexFiles,
  MetaplexFile,
  MetaplexFileTag,
  StorageDriver,
} from '../storageModule';
import { KeypairIdentityDriver } from '../keypairIdentity';
import { Metaplex } from '@/Metaplex';
import {
  Amount,
  IdentitySigner,
  isIdentitySigner,
  isKeypairSigner,
  KeypairSigner,
  lamports,
  Signer,
  toBigNumber,
} from '@/types';
import {
  AssetUploadFailedError,
  FailedToConnectToIrysAddressError,
  FailedToInitializeIrysError,
  IrysWithdrawError,
} from '@/errors';
import { _removeDoubleDefault } from '@/utils';

export type IrysOptions = {
  address?: string;
  timeout?: number;
  providerUrl?: string;
  priceMultiplier?: number;
  identity?: Signer;
};

export type IrysWalletAdapter = {
  publicKey: PublicKey | null;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>;
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
    options?: SendOptions & { signers?: Web3Signer[] }
  ) => Promise<TransactionSignature>;
};

/// Size of irys transaction header
const HEADER_SIZE = 2_000;

/// Minimum file size for cost calculation
const MINIMUM_SIZE = 80_000;

export class IrysStorageDriver implements StorageDriver {
  protected _metaplex: Metaplex;
  protected _irys: WebIrys | NodeIrys | null = null;
  protected _options: IrysOptions;

  constructor(metaplex: Metaplex, options: IrysOptions = {}) {
    this._metaplex = metaplex;
    this._options = {
      providerUrl: metaplex.connection.rpcEndpoint,
      ...options,
    };
  }

  async getUploadPrice(bytes: number): Promise<Amount> {
    const irys = await this.irys();
    const price = await irys.getPrice(bytes);

    return bigNumberToAmount(
      price.multipliedBy(this._options.priceMultiplier ?? 1.1)
    );
  }

  async getUploadPriceForFiles(files: MetaplexFile[]): Promise<Amount> {
    const bytes: number = files.reduce((sum, file) => {
      return sum + HEADER_SIZE + Math.max(MINIMUM_SIZE, file.buffer.byteLength);
    }, 0);

    return this.getUploadPrice(bytes);
  }

  async upload(file: MetaplexFile): Promise<string> {
    const [uri] = await this.uploadAll([file]);

    return uri;
  }

  async uploadAll(files: MetaplexFile[]): Promise<string[]> {
    const irys = await this.irys();
    const amount = await this.getUploadPrice(
      getBytesFromMetaplexFiles(...files)
    );
    await this.fund(amount);

    const promises = files.map(async (file) => {
      const irysTx = irys.createTransaction(file.buffer, {
        tags: getMetaplexFileTagsWithContentType(file),
      });
      await irysTx.sign();

      const { status, data } = await irys.uploader.uploadTransaction(irysTx);

      if (status >= 300) {
        throw new AssetUploadFailedError(status);
      }

      return `https://arweave.net/${data.id}`;
    });

    return await Promise.all(promises);
  }

  async getBalance(): Promise<Amount> {
    const irys = await this.irys();
    const balance = await irys.getLoadedBalance();

    return bigNumberToAmount(balance);
  }

  async fund(amount: Amount, skipBalanceCheck = false): Promise<void> {
    const irys = await this.irys();
    let toFund = amountToBigNumber(amount);

    if (!skipBalanceCheck) {
      const balance = await irys.getLoadedBalance();

      toFund = toFund.isGreaterThan(balance)
        ? toFund.minus(balance)
        : new BigNumber(0);
    }

    if (toFund.isLessThanOrEqualTo(0)) {
      return;
    }

    // TODO: Catch errors and wrap in irysErrors.
    await irys.fund(toFund);
  }

  async withdrawAll(): Promise<void> {
    // TODO(loris): Replace with "withdrawAll" when available on irys.
    const irys = await this.irys();
    const balance = await irys.getLoadedBalance();
    const minimumBalance = new BigNumber(5000);

    if (balance.isLessThan(minimumBalance)) {
      return;
    }

    const balanceToWithdraw = balance.minus(minimumBalance);
    await this.withdraw(bigNumberToAmount(balanceToWithdraw));
  }

  async withdraw(amount: Amount): Promise<void> {
    const irys = await this.irys();
    try {
      await irys.withdrawBalance(amountToBigNumber(amount));
    } catch (e: any) {
      throw new IrysWithdrawError(
        e instanceof Error ? e.message : e.toString()
      );
    }
  }

  async irys(): Promise<WebIrys | NodeIrys> {
    if (this._irys) {
      return this._irys;
    }

    return (this._irys = await this.initIrys());
  }

  async initIrys(): Promise<WebIrys | NodeIrys> {
    const currency = 'solana';
    const address = this._options?.address ?? 'https://node1.irys.xyz';
    const options = {
      timeout: this._options.timeout,
      providerUrl: this._options.providerUrl,
    };

    const identity: Signer =
      this._options.identity ?? this._metaplex.identity();

    // if in node use node irys, else use web irys
    // see: https://github.com/metaplex-foundation/js/issues/202
    const isNode =
      typeof window === 'undefined' || window.process?.hasOwnProperty('type');
    let irys;
    if (isNode && isKeypairSigner(identity))
      irys = await this.initNodeirys(address, currency, identity, options);
    else {
      let identitySigner: IdentitySigner;
      if (isIdentitySigner(identity)) identitySigner = identity;
      else
        identitySigner = new KeypairIdentityDriver(
          Keypair.fromSecretKey((identity as KeypairSigner).secretKey)
        );

      irys = await this.initWebirys(address, currency, identitySigner, options);
    }

    try {
      // Check for valid irys node.
      await irys.utils.getBundlerAddress(currency);
    } catch (error) {
      throw new FailedToConnectToIrysAddressError(address, error as Error);
    }

    return irys;
  }

  async initNodeirys(
    address: string,
    currency: string,
    keypair: KeypairSigner,
    options: any
  ): Promise<NodeIrys> {
    const bPackage = _removeDoubleDefault(await import('@irys/sdk'));
    return new bPackage.default({
      url: address,
      token: currency,
      key: keypair.secretKey,
      config: options,
    });
  }

  async initWebirys(
    address: string,
    currency: string,
    identity: IdentitySigner,
    options: any
  ): Promise<WebIrys> {
    const wallet: IrysWalletAdapter = {
      publicKey: identity.publicKey,
      signMessage: (message: Uint8Array) => identity.signMessage(message),
      signTransaction: (transaction: Transaction) =>
        identity.signTransaction(transaction),
      signAllTransactions: (transactions: Transaction[]) =>
        identity.signAllTransactions(transactions),
      sendTransaction: (
        transaction: Transaction,
        connection: Connection,
        options: SendOptions & { signers?: Web3Signer[] } = {}
      ): Promise<TransactionSignature> => {
        const { signers = [], ...sendOptions } = options;

        return this._metaplex
          .rpc()
          .sendTransaction(transaction, sendOptions, [identity, ...signers]);
      },
    };

    const bPackage = _removeDoubleDefault(await import('@irys/sdk'));
    const irys = new bPackage.WebIrys({
      url: address,
      token: currency,
      wallet: { provider: wallet },
      config: options,
    });

    try {
      // Try to initiate irys.
      await irys.ready();
    } catch (error) {
      throw new FailedToInitializeIrysError(error as Error);
    }

    return irys;
  }
}

export const isirysStorageDriver = (
  storageDriver: StorageDriver
): storageDriver is IrysStorageDriver => {
  return (
    'irys' in storageDriver &&
    'getBalance' in storageDriver &&
    'fund' in storageDriver &&
    'withdrawAll' in storageDriver
  );
};

const bigNumberToAmount = (bigNumber: BigNumber): Amount => {
  return lamports(toBigNumber(bigNumber.decimalPlaces(0).toString()));
};

const amountToBigNumber = (amount: Amount): BigNumber => {
  return new BigNumber(amount.basisPoints.toString());
};

const getMetaplexFileTagsWithContentType = (
  file: MetaplexFile
): MetaplexFileTag[] => {
  if (!file.contentType) {
    return file.tags;
  }

  return [{ name: 'Content-Type', value: file.contentType }, ...file.tags];
};
