/// <reference types="node" />
import type Api from "./lib/api.js";
import type { SignatureOptions } from "./lib/crypto/crypto-interface.js";
import type CryptoInterface from "./lib/crypto/crypto-interface.js";
import Transaction from "./lib/transaction.js";
import type { JWKInterface } from "./lib/wallet.js";
import type { SerializedUploader } from "./lib/transaction-uploader.js";
import { TransactionUploader } from "./lib/transaction-uploader.js";
import type Chunks from "./chunks.js";
import type FallbackApi from "./lib/fallbackApi.js";
import type Merkle from "./lib/merkle.js";
import type { DeepHash } from "./lib/deepHash.js";
export type TransactionConfirmedData = {
    block_indep_hash: string;
    block_height: number;
    number_of_confirmations: number;
};
export type TransactionStatusResponse = {
    status: number;
    confirmed: TransactionConfirmedData | null;
};
export default class Transactions {
    private api;
    private crypto;
    private chunks;
    protected merkle: Merkle;
    protected deepHash: DeepHash;
    constructor({ deps }: {
        deps: {
            crypto: CryptoInterface;
            api: Api | FallbackApi;
            chunks: Chunks;
            merkle: Merkle;
            deepHash: DeepHash;
        };
    });
    getTransactionAnchor(): Promise<string>;
    getPrice(byteSize: number, targetAddress?: string): Promise<string>;
    get(id: string): Promise<Transaction>;
    fromRaw(attributes: object): Transaction;
    getStatus(id: string): Promise<TransactionStatusResponse>;
    getData(id: string): Promise<Uint8Array>;
    getDataStream(id: string): Promise<AsyncIterable<Uint8Array>>;
    sign(transaction: Transaction, jwk?: JWKInterface | "use_wallet", // "use_wallet" for backwards compatibility only
    options?: SignatureOptions): Promise<void>;
    verify(transaction: Transaction): Promise<boolean>;
    post(transaction: Transaction | Buffer | string | object): Promise<{
        status: number;
        statusText: string;
        data: any;
    }>;
    /**
     * Gets an uploader than can be used to upload a transaction chunk by chunk, giving progress
     * and the ability to resume.
     *
     * Usage example:
     *
     * ```
     * const uploader = arweave.transactions.getUploader(transaction);
     * while (!uploader.isComplete) {
     *   await uploader.uploadChunk();
     *   console.log(`${uploader.pctComplete}%`);
     * }
     * ```
     *
     * @param upload a Transaction object, a previously save progress object, or a transaction id.
     * @param data the data of the transaction. Required when resuming an upload.
     */
    getUploader(upload: Transaction | SerializedUploader | string, data?: Uint8Array | ArrayBuffer): Promise<TransactionUploader>;
    /**
     * Async generator version of uploader
     *
     * Usage example:
     *
     * ```
     * for await (const uploader of arweave.transactions.upload(tx)) {
     *  console.log(`${uploader.pctComplete}%`);
     * }
     * ```
     *
     * @param upload a Transaction object, a previously save uploader, or a transaction id.
     * @param data the data of the transaction. Required when resuming an upload.
     */
    upload(upload: Transaction | SerializedUploader | string, data: Uint8Array): AsyncGenerator<TransactionUploader, TransactionUploader>;
}
