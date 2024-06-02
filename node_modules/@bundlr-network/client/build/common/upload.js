"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
const arbundles_1 = require("arbundles");
const dist_1 = __importDefault(require("@supercharge/promise-pool/dist"));
const async_retry_1 = __importDefault(require("async-retry"));
const chunkingUploader_1 = require("./chunkingUploader");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.sleep = sleep;
// eslint-disable-next-line @typescript-eslint/naming-convention
class Uploader {
    constructor(api, utils, currency, currencyConfig) {
        this.api = api;
        this.currency = currency;
        this.currencyConfig = currencyConfig;
        this.utils = utils;
    }
    /**
     * Uploads data to the bundler
     * @param data
     * @param opts
     * @returns the response from the bundler
     */
    async upload(data, opts) {
        // const signer = await this.currencyConfig.getSigner();
        // const dataItem = createData(
        //     data,
        //     signer,
        //     { tags, anchor: Crypto.randomBytes(32).toString("base64").slice(0, 32) }
        // );
        // await dataItem.sign(signer);
        // return await this.transactionUploader(dataItem);
        return await this.chunkedUploader.uploadData(data, opts);
    }
    get chunkedUploader() {
        return new chunkingUploader_1.ChunkingUploader(this.currencyConfig, this.api);
    }
    /**
     * Uploads a given transaction to the bundler
     * @param transaction
     */
    async transactionUploader(transaction) {
        let res;
        const isDataItem = arbundles_1.DataItem.isDataItem(transaction);
        if (this.forceUseChunking || (isDataItem && transaction.getRaw().length > 50000000) || !isDataItem) {
            const uploader = this.chunkedUploader;
            res = await uploader.uploadTransaction(isDataItem ? transaction.getRaw() : transaction);
        }
        else {
            const { protocol, host, port, timeout } = this.api.getConfig();
            res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, transaction.getRaw(), {
                headers: { "Content-Type": "application/octet-stream" },
                timeout,
                maxBodyLength: Infinity
            });
            if (res.status == 201) {
                res.data = { id: transaction.id };
            }
        }
        switch (res.status) {
            case 402:
                throw new Error("Not enough funds to send data");
            default:
                if (res.status >= 400) {
                    throw new Error(`whilst uploading DataItem: ${res.status} ${res.statusText}`);
                }
        }
        return res;
    }
    async concurrentUploader(data, concurrency = 5, resultProcessor, logFunction) {
        const errors = [];
        const results = await dist_1.default
            .for(data)
            .withConcurrency(concurrency >= 1 ? concurrency : 5)
            .handleError(async (error, _) => {
            errors.push(error);
            if (error.message === "Not enough funds to send data") {
                throw error;
            }
        })
            .process(async (item, i, _) => {
            await (0, async_retry_1.default)(async (bail) => {
                try {
                    const res = await this.processItem(item);
                    if (i % concurrency == 0) {
                        await logFunction(`Processed ${i} Items`);
                    }
                    if (resultProcessor) {
                        return await resultProcessor({ item, res, i });
                    }
                    else {
                        return { item, res, i };
                    }
                }
                catch (e) {
                    if (e.message === "Not enough funds to send data") {
                        bail(e);
                    }
                    throw e;
                }
            }, { retries: 3, minTimeout: 1000, maxTimeout: 10000 });
        });
        return { errors, results: results.results };
    }
    async processItem(item) {
        if (typeof item === "string") {
            item = Buffer.from(item);
        }
        // if (Buffer.isBuffer(item)) {
        //     const signer = await this.currencyConfig.getSigner();
        //     item = createData(item, signer, { anchor: Crypto.randomBytes(32).toString("base64").slice(0, 32) });
        //     await item.sign(signer);
        // }
        return await this.transactionUploader(item);
    }
    /**
     * geneates a manifest JSON object
     * @param config.items mapping of logical paths to item IDs
     * @param config.indexFile optional logical path of the index file for the manifest
     * @returns
     */
    async generateManifest(config) {
        const { items, indexFile } = config;
        const manifest = {
            manifest: "arweave/paths",
            version: "0.1.0",
            paths: {}
        };
        if (indexFile) {
            if (!items.has(indexFile)) {
                throw new Error(`Unable to access item: ${indexFile}`);
            }
            manifest["index"] = { path: indexFile };
        }
        for (const [k, v] of items.entries()) {
            manifest.paths[k] = { id: v };
        }
        return manifest;
    }
    ;
    set useChunking(state) {
        if (typeof state === "boolean") {
            this.forceUseChunking = state;
        }
    }
    set contentType(type) {
        // const fullType = mime.contentType(type)
        // if(!fullType){
        //     throw new Error("Invali")
        // }
        this.contentTypeOverride = type;
    }
}
exports.default = Uploader;
//# sourceMappingURL=upload.js.map