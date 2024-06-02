/// <reference types="node" />
import type FallbackApi from "./fallbackApi.js";
import type Api from "./api.js";
/**
 * Concurrent Arweave transaction downloader - uses `Api` internally
 * to download a transaction via it's Arweave network level chunks with concurrency
 * @param txId - txId to download
 * @param config
 */
export declare function downloadTx(txId: string, api: Api | FallbackApi, options?: {
    concurrency?: number;
}): AsyncGenerator<Buffer>;
