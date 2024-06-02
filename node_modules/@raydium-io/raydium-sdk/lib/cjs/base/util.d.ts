import { Mint, TransferFeeConfig } from '@solana/spl-token';
import { Connection, EpochInfo, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import BN from 'bn.js';
import { CacheLTA } from '../common';
import { CurrencyAmount, TokenAmount } from '../entity';
import { TokenAccount } from './base';
import { InnerSimpleTransaction, InnerSimpleV0Transaction, InnerTransaction, TxVersion } from './type';
export declare function getWSOLAmount({ tokenAccounts }: {
    tokenAccounts: TokenAccount[];
}): BN;
export declare function unwarpSol({ ownerInfo, tokenAccounts, makeTxVersion, connection, }: {
    connection: Connection;
    ownerInfo: {
        wallet: PublicKey;
        payer: PublicKey;
    };
    tokenAccounts: TokenAccount[];
    makeTxVersion: TxVersion;
}): Promise<{
    address: {};
    innerTransactions: (import("./type").InnerSimpleLegacyTransaction | InnerSimpleV0Transaction)[];
}>;
export declare function buildSimpleTransaction({ connection, makeTxVersion, payer, innerTransactions, recentBlockhash, addLookupTableInfo, }: {
    makeTxVersion: TxVersion;
    payer: PublicKey;
    connection: Connection;
    innerTransactions: InnerSimpleTransaction[];
    recentBlockhash?: string | undefined;
    addLookupTableInfo?: CacheLTA | undefined;
}): Promise<(VersionedTransaction | Transaction)[]>;
export declare function buildTransaction({ connection, makeTxVersion, payer, innerTransactions, recentBlockhash, lookupTableCache, }: {
    makeTxVersion: TxVersion;
    payer: PublicKey;
    connection: Connection;
    innerTransactions: InnerTransaction[];
    recentBlockhash?: string | undefined;
    lookupTableCache?: CacheLTA;
}): Promise<(VersionedTransaction | Transaction)[]>;
export interface TransferAmountFee {
    amount: TokenAmount | CurrencyAmount;
    fee: TokenAmount | CurrencyAmount | undefined;
    expirationTime: number | undefined;
}
export interface GetTransferAmountFee {
    amount: BN;
    fee: BN | undefined;
    expirationTime: number | undefined;
}
export declare function getTransferAmountFee(amount: BN, feeConfig: TransferFeeConfig | undefined, epochInfo: EpochInfo, addFee: boolean): GetTransferAmountFee;
export declare function minExpirationTime(expirationTime1: number | undefined, expirationTime2: number | undefined): number | undefined;
export type ReturnTypeFetchMultipleMintInfo = Mint & {
    feeConfig: TransferFeeConfig | undefined;
};
export interface ReturnTypeFetchMultipleMintInfos {
    [mint: string]: ReturnTypeFetchMultipleMintInfo;
}
export declare function fetchMultipleMintInfos({ connection, mints }: {
    connection: Connection;
    mints: PublicKey[];
}): Promise<ReturnTypeFetchMultipleMintInfos>;
export declare function BNDivCeil(bn1: BN, bn2: BN): BN;
