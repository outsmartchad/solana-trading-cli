/// <reference types="node" />
/// <reference types="node" />
import { DataItem, DataItemCreateOptions } from "arbundles";
import { AxiosResponse } from "axios";
import Utils from "./utils";
import Api from "./api";
import { Currency, Manifest } from "./types";
import { ChunkingUploader } from "./chunkingUploader";
import { Readable } from "stream";
export declare const sleep: (ms: number) => Promise<void>;
export default class Uploader {
    protected readonly api: Api;
    protected currency: string;
    protected currencyConfig: Currency;
    protected utils: Utils;
    protected contentTypeOverride: string;
    protected forceUseChunking: boolean;
    constructor(api: Api, utils: Utils, currency: string, currencyConfig: Currency);
    /**
     * Uploads data to the bundler
     * @param data
     * @param opts
     * @returns the response from the bundler
     */
    upload(data: Buffer | Readable, opts?: DataItemCreateOptions): Promise<AxiosResponse<any>>;
    get chunkedUploader(): ChunkingUploader;
    /**
     * Uploads a given transaction to the bundler
     * @param transaction
     */
    transactionUploader(transaction: DataItem | Readable | Buffer): Promise<AxiosResponse<any>>;
    concurrentUploader(data: (DataItem | Buffer | Readable)[], concurrency?: number, resultProcessor?: (res: any) => Promise<any>, logFunction?: (log: string) => Promise<any>): Promise<{
        errors: Array<any>;
        results: Array<any>;
    }>;
    protected processItem(item: string | Buffer | DataItem | Readable): Promise<any>;
    /**
     * geneates a manifest JSON object
     * @param config.items mapping of logical paths to item IDs
     * @param config.indexFile optional logical path of the index file for the manifest
     * @returns
     */
    generateManifest(config: {
        items: Map<string, string>;
        indexFile?: string;
    }): Promise<Manifest>;
    set useChunking(state: boolean);
    set contentType(type: string);
}
