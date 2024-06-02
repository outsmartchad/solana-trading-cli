import { AxiosResponse } from "axios";
import Bundlr from "../common/bundlr";
import { NodeCurrency } from "./types";
import NodeUploader from "./upload";
export default class NodeBundlr extends Bundlr {
    uploader: NodeUploader;
    currencyConfig: NodeCurrency;
    /**
     * Constructs a new Bundlr instance, as well as supporting subclasses
     * @param url - URL to the bundler
     * @param wallet - private key (in whatever form required)
     */
    constructor(url: string, currency: string, wallet?: any, config?: {
        timeout?: number;
        providerUrl?: string;
        contractAddress?: string;
        currencyOpts?: any;
    });
    /**
     * Upload a file at the specified path to the bundler
     * @param path path to the file to upload
     * @returns bundler response
     */
    uploadFile(path: string): Promise<AxiosResponse<any>>;
    ready(): Promise<void>;
}
