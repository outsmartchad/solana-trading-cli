/// <reference types="node" />
import { DataItem, DataItemCreateOptions } from "arbundles";
import Bundlr from "./bundlr";
/**
 * Extended DataItem that allows for seamless bundlr operations, such as signing and uploading.
 * Takes the same parameters as a regular DataItem.
 */
export default class BundlrTransaction extends DataItem {
    private bundlr;
    private signer;
    constructor(data: string | Uint8Array, bundlr: Bundlr, opts?: DataItemCreateOptions);
    sign(): Promise<Buffer>;
    get size(): number;
    upload(): Promise<any>;
}
