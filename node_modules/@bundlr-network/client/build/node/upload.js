"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPath = void 0;
const fs_1 = require("fs");
const upload_1 = __importDefault(require("../common/upload"));
const p = __importStar(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const inquirer_1 = __importDefault(require("inquirer"));
const stream_1 = require("stream");
const csv = __importStar(require("csv"));
const checkPath = async (path) => { return fs_1.promises.stat(path).then(_ => true).catch(_ => false); };
exports.checkPath = checkPath;
class NodeUploader extends upload_1.default {
    constructor(api, utils, currency, currencyConfig) {
        super(api, utils, currency, currencyConfig);
    }
    /**
     * Uploads a file to the bundler
     * @param path to the file to be uploaded
     * @returns the response from the bundler
     */
    async uploadFile(path) {
        var _a;
        if (!fs_1.promises.stat(path).then(_ => true).catch(_ => false)) {
            throw new Error(`Unable to access path: ${path}`);
        }
        const mimeType = mime_types_1.default.contentType(mime_types_1.default.lookup(path) || "application/octet-stream");
        const tags = [{ name: "Content-Type", value: (_a = this.contentTypeOverride) !== null && _a !== void 0 ? _a : mimeType }];
        const data = (0, fs_1.createReadStream)(path);
        return await this.upload(data, { tags });
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    async *walk(dir) {
        for await (const d of await fs_1.promises.opendir(dir)) {
            const entry = p.join(dir, d.name);
            if (d.isDirectory())
                yield* await this.walk(entry);
            else if (d.isFile())
                yield entry;
        }
    }
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
    // eslint-disable-next-line @typescript-eslint/ban-types
    async uploadFolder(path, indexFile, batchSize = 10, interactivePreflight, keepDeleted = true, logFunction) {
        var _a, _b, _c;
        path = p.resolve(path);
        const alreadyProcessed = new Map();
        if (!await (0, exports.checkPath)(path)) {
            throw new Error(`Unable to access path: ${path}`);
        }
        // fallback to console.log if no logging function is given and interactive preflight is on.
        if (!logFunction && interactivePreflight) {
            logFunction = async (log) => { console.log(log); };
        }
        else if (!logFunction) { // blackhole logs
            logFunction = async (_) => { return; };
        }
        // manifest with folder name placed in parent directory of said folder - keeps contamination down.
        const manifestPath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.csv`);
        const csvHeader = "path,id\n";
        if (await (0, exports.checkPath)(manifestPath)) {
            const rstrm = (0, fs_1.createReadStream)(manifestPath);
            // check if empty
            if ((await fs_1.promises.stat(manifestPath)).size === 0) {
                await fs_1.promises.writeFile(manifestPath, csvHeader);
            }
            // validate header
            await new Promise(res => {
                (0, fs_1.createReadStream)(manifestPath).once("data", async (d) => {
                    const fl = d.toString().split("\n")[0];
                    if (`${fl}\n` !== csvHeader) {
                        await fs_1.promises.writeFile(manifestPath, csvHeader);
                    }
                    res(d);
                });
            });
            const csvStream = stream_1.Readable.from(rstrm
                .pipe(csv.parse({ delimiter: ",", columns: true })));
            for await (const record of csvStream) {
                record;
                if (record.path && record.id) {
                    alreadyProcessed.set(record.path, null);
                }
            }
        }
        else {
            await fs_1.promises.writeFile(manifestPath, csvHeader);
        }
        const files = [];
        let total = 0;
        let i = 0;
        for await (const f of this.walk(path)) {
            const relPath = p.relative(path, f);
            if (!alreadyProcessed.has(relPath)) {
                files.push(f);
                total += (await fs_1.promises.stat(f)).size;
            }
            else {
                alreadyProcessed.delete(relPath);
            }
            if (++i % batchSize == 0) {
                logFunction(`Checked ${i} files...`);
            }
        }
        if (!keepDeleted) {
            alreadyProcessed.clear();
        }
        // TODO: add logic to detect changes (MD5/other hash)
        if (files.length == 0 && alreadyProcessed.size === 0) {
            logFunction("No items to process");
            // return the txID of the upload
            const idpath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-id.txt`);
            if (await (0, exports.checkPath)(idpath)) {
                return (await fs_1.promises.readFile(idpath)).toString();
            }
            return undefined;
        }
        const zprice = (await this.utils.getPrice(this.currency, 0)).multipliedBy(files.length);
        const price = (await this.utils.getPrice(this.currency, total)).plus(zprice).toFixed(0);
        if (interactivePreflight) {
            if (!(await confirmation(`Authorize upload?\nTotal amount of data: ${total} bytes over ${files.length} files - cost: ${price} ${this.currencyConfig.base[0]} (${this.utils.unitConverter(price).toFixed()} ${this.currency})\n Y / N`))) {
                throw new Error("Confirmation failed");
            }
        }
        const stringifier = csv.stringify({
            header: false,
            columns: {
                path: "path",
                id: "id"
            }
        });
        const wstrm = (0, fs_1.createWriteStream)(manifestPath, { flags: "a+" });
        stringifier.pipe(wstrm);
        const processor = async (data) => {
            var _a, _b;
            if ((_b = (_a = data === null || data === void 0 ? void 0 : data.res) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.id) {
                stringifier.write([p.relative(path, data.item), data.res.data.id]);
            }
        };
        const processingResults = await this.concurrentUploader(files, batchSize, processor, logFunction);
        if (processingResults.errors.length > 0) {
            await logFunction(`${processingResults.errors.length} Errors detected, skipping manifest upload...`);
            const ewstrm = (0, fs_1.createWriteStream)(p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-errors.txt`), { flags: "a+" });
            ewstrm.write(`Errors from upload at ${new Date().toString()}:\n`);
            processingResults.errors.forEach(e => { var _a; return ewstrm.write(`${(_a = e === null || e === void 0 ? void 0 : e.stack) !== null && _a !== void 0 ? _a : JSON.stringify(e)}\n`); });
            await new Promise(res => ewstrm.close(res));
            throw new Error(`${processingResults.errors.length} Errors detected - check ${p.basename(path)}-errors.txt for more information.`);
        }
        await logFunction(`Finished processing ${files.length} Items`);
        await new Promise(r => wstrm.close(r));
        // generate JSON
        await logFunction("Generating JSON manifest...");
        const jsonManifestPath = await this.generateManifestFromCsv(path, alreadyProcessed, indexFile);
        // upload the manifest
        await logFunction("Uploading JSON manifest...");
        const tags = [{ name: "Type", value: "manifest" }, { name: "Content-Type", value: "application/x.arweave-manifest+json" }];
        const mres = await this.upload((0, fs_1.createReadStream)(jsonManifestPath), { tags })
            .catch((e) => {
            throw new Error(`Failed to upload manifest: ${e.message}`);
        });
        await logFunction("Done!");
        if ((_a = mres === null || mres === void 0 ? void 0 : mres.data) === null || _a === void 0 ? void 0 : _a.id) {
            await fs_1.promises.writeFile(p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-id.txt`), mres.data.id);
        }
        return (_c = (_b = mres.data) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "none";
    }
    /**
     * processes an item to convert it into a DataItem, and then uploads it.
     * @param item can be a string value, a path to a file, a Buffer of data or a DataItem
     * @returns A dataItem
     */
    async processItem(item) {
        var _a;
        let tags;
        // let returnVal;
        if (typeof item === "string") {
            if (await (0, exports.checkPath)(item)) {
                const mimeType = mime_types_1.default.contentType(mime_types_1.default.lookup(item) || "application/octet-stream");
                tags = [{ name: "Content-Type", value: (_a = this.contentTypeOverride) !== null && _a !== void 0 ? _a : mimeType }];
                // returnVal = item;
                item = (0, fs_1.createReadStream)(item);
            }
            else {
                item = Buffer.from(item);
                if (this.contentTypeOverride) {
                    tags = [{ name: "Content-Type", value: this.contentTypeOverride }];
                }
            }
        }
        // if (Buffer.isBuffer(item)) {
        //     // const signer = await this.currencyConfig.getSigner();
        //     // item = createData(item, signer, { tags, anchor: Crypto.randomBytes(32).toString("base64").slice(0, 32) });
        //     // await item.sign(signer);
        // }
        // if(returnVal){
        //     return {path: returnVal, }
        // }
        return await this.chunkedUploader.uploadData(item, { tags });
        // return await this.transactionUploader(item);
    }
    /**
     * Stream-based CSV parser and JSON assembler
     * @param path base path of the upload
     * @param indexFile optional path to an index file
     * @returns the path to the generated manifest
     */
    async generateManifestFromCsv(path, nowRemoved, indexFile) {
        const csvstrm = csv.parse({ delimiter: ",", columns: true });
        const csvPath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.csv`);
        const manifestPath = p.join(p.join(path, `${p.sep}..`), `${p.basename(path)}-manifest.json`);
        const wstrm = (0, fs_1.createWriteStream)(manifestPath, { flags: "w+" });
        (0, fs_1.createReadStream)(csvPath).pipe(csvstrm); // pipe csv
        /* eslint-disable quotes */
        // "header"
        wstrm.write(`{\n"manifest": "arweave/paths",\n"version": "0.1.0",\n"paths": {\n`);
        const csvs = stream_1.Readable.from(csvstrm);
        let firstValue = true;
        for await (const d of csvs) {
            if (nowRemoved === null || nowRemoved === void 0 ? void 0 : nowRemoved.has(d.path)) {
                nowRemoved.delete(d.path);
                continue;
            }
            ;
            const prefix = firstValue ? "" : ",\n";
            wstrm.write(`${prefix}"${d.path.replaceAll("\\", "/")}":{"id":"${d.id}"}`);
            firstValue = false;
        }
        // "trailer"
        wstrm.write(`\n}`);
        // add index
        if (indexFile) {
            wstrm.write(`,\n"index":{"path":"${indexFile.replaceAll("\\", "/")}"}`);
        }
        wstrm.write(`\n}`);
        await new Promise(r => wstrm.close(r));
        return manifestPath;
    }
}
exports.default = NodeUploader;
async function confirmation(message) {
    const answers = await inquirer_1.default.prompt([
        { type: "input", name: "confirmation", message }
    ]);
    return answers.confirmation.toLowerCase() == "y";
}
//# sourceMappingURL=upload.js.map