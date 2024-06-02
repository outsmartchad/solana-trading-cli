import Transaction from "./transaction";
import type Api from "./api";
import type FallbackApi from "./fallbackApi";
import type CryptoInterface from "./crypto/crypto-interface";
import type Merkle from "./merkle";
import type { DeepHash } from "./deepHash";
export declare const FATAL_CHUNK_UPLOAD_ERRORS: string[];
export type SerializedUploader = {
    chunkIndex: number;
    txPosted: boolean;
    transaction: any;
    lastRequestTimeEnd: number;
    lastResponseStatus: number;
    lastResponseError: string;
};
export declare class TransactionUploader {
    private chunkIndex;
    private txPosted;
    private transaction;
    private lastRequestTimeEnd;
    private totalErrors;
    data: Uint8Array;
    lastResponseStatus: number;
    lastResponseError: string;
    get isComplete(): boolean;
    get totalChunks(): number;
    get uploadedChunks(): number;
    get pctComplete(): number;
    protected crypto: CryptoInterface;
    protected api: Api | FallbackApi;
    protected merkle: Merkle;
    protected deepHash: DeepHash;
    constructor({ deps, transaction, }: {
        deps: {
            crypto: CryptoInterface;
            api: Api | FallbackApi;
            merkle: Merkle;
            deepHash: DeepHash;
        };
        transaction: Transaction;
    });
    /**
     * Uploads the next part of the transaction.
     * On the first call this posts the transaction
     * itself and on any subsequent calls uploads the
     * next chunk until it completes.
     */
    uploadChunk(chunkIndex_?: number): Promise<void>;
    /**
     * Reconstructs an upload from its serialized state and data.
     * Checks if data matches the expected data_root.
     *
     * @param serialized
     * @param data
     */
    static fromSerialized({ serialized, data, deps, }: {
        serialized: SerializedUploader;
        data: Uint8Array;
        deps: {
            api: Api | FallbackApi;
            merkle: Merkle;
            crypto: CryptoInterface;
            deepHash: DeepHash;
        };
    }): Promise<TransactionUploader>;
    /**
     * Reconstruct an upload from the tx metadata, ie /tx/<id>.
     *
     * @param api
     * @param id
     * @param data
     */
    static fromTransactionId(api: Api | FallbackApi, id: string): Promise<SerializedUploader>;
    toJSON(): {
        chunkIndex: number;
        transaction: Transaction;
        lastRequestTimeEnd: number;
        lastResponseStatus: number;
        lastResponseError: string;
        txPosted: boolean;
    };
    private postTransaction;
}
