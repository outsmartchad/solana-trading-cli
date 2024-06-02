/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { DataItem, DataItemCreateOptions } from "arbundles";
import { Readable } from "stream";
import { EventEmitter } from "events";
import Api from "./api";
import { Currency } from "./types";
import { AxiosResponse } from "axios";
interface ChunkingUploaderEvents {
    'chunkUpload': ({ id, offset, size, totalUploaded }: {
        id: number;
        offset: number;
        size: number;
        totalUploaded: number;
    }) => void;
    'chunkError': ({ id, offset, size, res }: {
        id: number;
        offset: number;
        size: number;
        res: AxiosResponse<any>;
    }) => void;
    'resume': () => void;
    'pause': () => void;
    'done': (finishedUpload: any) => void;
}
export declare interface ChunkingUploader {
    on<U extends keyof ChunkingUploaderEvents>(event: U, listener: ChunkingUploaderEvents[U]): this;
    emit<U extends keyof ChunkingUploaderEvents>(event: U, ...args: Parameters<ChunkingUploaderEvents[U]>): boolean;
}
export declare class ChunkingUploader extends EventEmitter {
    protected currencyConfig: Currency;
    protected api: Api;
    uploadID: string;
    protected currency: string;
    protected chunkSize: number;
    protected batchSize: number;
    protected paused: Boolean;
    protected isResume: Boolean;
    constructor(currencyConfig: Currency, api: Api);
    setResumeData(uploadID: string | undefined): this;
    /**
     * Note: Will return undefined unless an upload has been started.
     * @returns
     */
    getResumeData(): string | undefined;
    setChunkSize(size: number): this;
    setBatchSize(size: number): this;
    pause(): void;
    resume(): void;
    uploadTransaction(data: Readable | Buffer | DataItem): Promise<AxiosResponse<any, any>>;
    uploadData(dataStream: Readable | Buffer, transactionOpts?: DataItemCreateOptions): Promise<AxiosResponse<any, any>>;
    runUpload(dataStream: Readable | Buffer, transactionOpts?: DataItemCreateOptions): Promise<AxiosResponse<any, any>>;
    get completionPromise(): Promise<AxiosResponse<any, any>>;
}
export {};
