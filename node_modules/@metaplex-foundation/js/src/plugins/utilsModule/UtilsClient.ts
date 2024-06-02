import type { Metaplex } from '@/Metaplex';
import {
  addAmounts,
  lamports,
  multiplyAmount,
  SolAmount,
  subtractAmounts,
} from '@/types';

const TRANSACTION_FEE = 5000;

/**
 * @group Modules
 */
export class UtilsClient {
  protected readonly metaplex: Metaplex;
  protected cachedRentPerEmptyAccount: SolAmount | null = null;
  protected cachedRentPerByte: SolAmount | null = null;

  constructor(metaplex: Metaplex) {
    this.metaplex = metaplex;
  }

  async estimate(
    bytes: number,
    numberOfAccounts = 1,
    numberOfTransactions = 1,
    useCache = true
  ): Promise<SolAmount> {
    const rent = await this.estimateRent(bytes, numberOfAccounts, useCache);
    const transactionFees = this.estimateTransactionFee(numberOfTransactions);

    return addAmounts(rent, transactionFees);
  }

  async estimateRent(
    bytes: number,
    numberOfAccounts = 1,
    useCache = true
  ): Promise<SolAmount> {
    if (
      !useCache ||
      this.cachedRentPerEmptyAccount === null ||
      this.cachedRentPerByte === null
    ) {
      const rentFor0Bytes = await this.metaplex.rpc().getRent(0);

      // TODO(loris): Infer from header size in bytes.
      const rentFor1Byte = await this.metaplex.rpc().getRent(1);
      this.cachedRentPerEmptyAccount = rentFor0Bytes;
      this.cachedRentPerByte = subtractAmounts(rentFor1Byte, rentFor0Bytes);
    }

    const rentForAccounts = multiplyAmount(
      this.cachedRentPerEmptyAccount,
      numberOfAccounts
    );
    const rentForBytes = multiplyAmount(this.cachedRentPerByte, bytes);

    return addAmounts(rentForAccounts, rentForBytes);
  }

  estimateTransactionFee(numberOfTransactions = 1): SolAmount {
    // TODO(loris): Improve with an RPC call to get the current transaction fee.
    return lamports(numberOfTransactions * TRANSACTION_FEE);
  }
}
