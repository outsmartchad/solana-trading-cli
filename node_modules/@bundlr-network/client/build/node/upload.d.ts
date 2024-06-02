/// <reference types="node" />
/// <reference types="node" />
import { PathLike } from "fs";
import { AxiosResponse } from "axios";
import { Currency } from "../common/types";
import Uploader from "../common/upload";
import Api from "../common/api";
import Utils from "../common/utils";
import { Readable } from "stream";
export declare const checkPath: (path: PathLike) => Promise<boolean>;
export default class NodeUploader extends Uploader {
    constructor(api: Api, utils: Utils, currency: string, currencyConfig: Currency);
    /**
     * Uploads a file to the bundler
     * @param path to the file to be uploaded
     * @returns the response from the bundler
     */
    uploadFile(path: string): Promise<AxiosResponse<any>>;
    private walk;
    /**
     * Preprocessor for folder uploads, ensures the rest of the system has a correct operating environment.
     * @param path - path to the folder to be uploaded
     * @param indexFile - path to the index file (i.e index.html)
     * @param batchSize - number of items to upload concurrently
     * @param interactivePreflight - whether to interactively prompt the user for confirmation of upload (CLI ONLY)
     * @param keepDeleted - Whether to keep previously uploaded (but now deleted) files in the manifest
     * @param logFunction - for handling logging from the uploader for UX
    * @returns
     */
    uploadFolder(path: string, indexFile?: string, batchSize?: number, interactivePreflight?: boolean, keepDeleted?: boolean, logFunction?: (log: string) => Promise<any>): Promise<string>;
    /**
     * processes an item to convert it into a DataItem, and then uploads it.
     * @param item can be a string value, a path to a file, a Buffer of data or a DataItem
     * @returns A dataItem
     */
    protected processItem(item: string | Buffer | Readable): Promise<any>;
    /**
     * Stream-based CSV parser and JSON assembler
     * @param path base path of the upload
     * @param indexFile optional path to an index file
     * @returns the path to the generated manifest
     */
    private generateManifestFromCsv;
}
