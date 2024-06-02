import type Api from "./lib/api";
import type FallbackApi from "./lib/fallbackApi";
export type TransactionChunkMetadataResponse = {
    size: string;
    offset: string;
};
export type TransactionChunkResponse = {
    chunk: string;
    data_path: string;
    tx_path: string;
};
export default class Chunks {
    private api;
    constructor(api: Api | FallbackApi);
    getTransactionMetadata(id: string): Promise<TransactionChunkMetadataResponse>;
    getChunk(offset: string | number | bigint): Promise<TransactionChunkResponse>;
    getChunkData(offset: string | number | bigint): Promise<Uint8Array>;
    firstChunkOffset(offsetResponse: TransactionChunkMetadataResponse): number;
    /**
     * Downloads chunks from the configured API peers, with a default concurrency of 10
     * @param id - ID of the transaction to download
     * @param options - Options object for configuring the downloader
     * @param options.concurrency - The number of chunks to download simultaneously. reduce on slower connections.
     * @returns
     */
    downloadChunkedData(id: string, options?: {
        concurrency?: number;
    }): Promise<Uint8Array>;
    concurrentChunkDownloader(id: string, options?: {
        concurrency?: number;
    }): AsyncGenerator<Uint8Array, void, unknown>;
}
