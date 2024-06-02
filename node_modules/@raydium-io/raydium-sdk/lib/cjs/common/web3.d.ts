/// <reference types="node" />
import { AccountInfo, AddressLookupTableAccount, Commitment, Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { ComputeBudgetConfig, InnerSimpleLegacyTransaction, InnerSimpleV0Transaction, InnerTransaction, TxVersion } from '../base';
export interface GetMultipleAccountsInfoConfig {
    batchRequest?: boolean;
    commitment?: Commitment;
}
export declare function getMultipleAccountsInfo(connection: Connection, publicKeys: PublicKey[], config?: GetMultipleAccountsInfoConfig): Promise<(AccountInfo<Buffer> | null)[]>;
export declare function getMultipleAccountsInfoWithCustomFlags<T extends {
    pubkey: PublicKey;
}>(connection: Connection, publicKeysWithCustomFlag: T[], config?: GetMultipleAccountsInfoConfig): Promise<({
    accountInfo: AccountInfo<Buffer> | null;
} & T)[]>;
export interface GetTokenAccountsByOwnerConfig {
    commitment?: Commitment;
}
/**
 * Forecast transaction size
 */
export declare function forecastTransactionSize(instructions: TransactionInstruction[], signers: PublicKey[]): boolean;
/**
 * Simulates multiple instruction
 */
export declare function simulateMultipleInstruction(connection: Connection, instructions: TransactionInstruction[], keyword: string, batchRequest?: boolean): Promise<string[]>;
export declare function parseSimulateLogToJson(log: string, keyword: string): string;
export declare function parseSimulateValue(log: string, key: string): string;
export declare function simulateTransaction(connection: Connection, transactions: Transaction[], batchRequest?: boolean): Promise<any[]>;
export declare function splitTxAndSigners<T extends TxVersion>({ connection, makeTxVersion, innerTransaction, lookupTableCache, computeBudgetConfig, payer, }: {
    connection: Connection;
    makeTxVersion: T;
    innerTransaction: InnerTransaction[];
    lookupTableCache?: CacheLTA;
    computeBudgetConfig?: ComputeBudgetConfig;
    payer: PublicKey;
}): Promise<(T extends typeof TxVersion.LEGACY ? InnerSimpleLegacyTransaction : InnerSimpleV0Transaction)[]>;
export declare const MAX_BASE64_SIZE = 1644;
export interface CacheLTA {
    [key: string]: AddressLookupTableAccount;
}
export declare function getMultipleLookupTableInfo({ connection, address, }: {
    connection: Connection;
    address: PublicKey[];
}): Promise<CacheLTA>;
