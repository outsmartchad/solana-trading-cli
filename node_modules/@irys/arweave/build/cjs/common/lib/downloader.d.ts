/// <reference types="node" />
import type FallbackApi from "./fallbackApi";
import type Api from "./api";
/**
 * Concurrent Arweave transaction downloader - uses `Api` internally
 * to download a transaction via it's Arweave network level chunks with concurrency
 * @param txId - txId to download
 * @param config
 */
export declare function downloadTx(txId: string, api: Api | FallbackApi, options?: {
    concurrency?: number;
}): AsyncGenerator<Buffer>;
