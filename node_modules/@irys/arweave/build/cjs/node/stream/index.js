"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stream = void 0;
const promises_1 = require("stream/promises");
const merkle_1 = require("../../common/lib/merkle");
const transaction_1 = __importDefault(require("../../common/lib/transaction"));
const transaction_uploader_1 = require("../../common/lib/transaction-uploader");
const utils_1 = require("../../common/lib/utils");
const chunker_1 = require("./chunker");
const MAX_CONCURRENT_CHUNK_UPLOAD_COUNT = 128;
class Stream {
    constructor({ deps, }) {
        this.crypto = deps.crypto;
        this.merkle = deps.merkle;
        this.api = deps.api;
        this.transactions = deps.transactions;
        this.deepHash = deps.deepHash;
    }
    /**
     * Creates an Arweave transaction from the piped data stream.
     */
    createTransactionAsync(attributes, jwk) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const oThis = this;
        return (source) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const chunks = yield (0, promises_1.pipeline)(source, oThis.generateTransactionChunksAsync());
            const txAttrs = Object.assign({}, attributes);
            (_a = txAttrs.owner) !== null && _a !== void 0 ? _a : (txAttrs.owner = jwk === null || jwk === void 0 ? void 0 : jwk.n);
            (_b = txAttrs.last_tx) !== null && _b !== void 0 ? _b : (txAttrs.last_tx = yield oThis.transactions.getTransactionAnchor());
            const lastChunk = chunks.chunks[chunks.chunks.length - 1];
            const dataByteLength = lastChunk.maxByteRange;
            (_c = txAttrs.reward) !== null && _c !== void 0 ? _c : (txAttrs.reward = yield oThis.transactions.getPrice(dataByteLength, txAttrs.target));
            txAttrs.data_size = dataByteLength.toString();
            const tx = new transaction_1.default({ attributes: txAttrs, deps: { merkle: oThis.merkle, deepHash: oThis.deepHash } });
            tx.chunks = chunks;
            tx.data_root = (0, utils_1.bufferTob64Url)(chunks.data_root);
            return tx;
        });
    }
    /**
     * Generates the Arweave transaction chunk information from the piped data stream.
     */
    generateTransactionChunksAsync() {
        const crypto = this.crypto;
        return (source) => __awaiter(this, void 0, void 0, function* () {
            const chunks = [];
            /**
             * @param chunkByteIndex the index the start of the specified chunk is located at within its original data stream.
             */
            const addChunk = (chunkByteIndex, chunk) => __awaiter(this, void 0, void 0, function* () {
                const dataHash = yield crypto.hash(chunk);
                const chunkRep = {
                    dataHash,
                    minByteRange: chunkByteIndex,
                    maxByteRange: chunkByteIndex + chunk.byteLength,
                };
                chunks.push(chunkRep);
                return chunkRep;
            });
            let chunkStreamByteIndex = 0;
            let previousDataChunk;
            let expectChunkGenerationCompleted = false;
            yield (0, promises_1.pipeline)(source, (0, chunker_1.chunker)(merkle_1.MAX_CHUNK_SIZE, { flush: true }), (chunkedSource) => { var _a, chunkedSource_1, chunkedSource_1_1; return __awaiter(this, void 0, void 0, function* () {
                var _b, e_1, _c, _d;
                try {
                    for (_a = true, chunkedSource_1 = __asyncValues(chunkedSource); chunkedSource_1_1 = yield chunkedSource_1.next(), _b = chunkedSource_1_1.done, !_b; _a = true) {
                        _d = chunkedSource_1_1.value;
                        _a = false;
                        const chunk = _d;
                        if (expectChunkGenerationCompleted) {
                            throw Error("Expected chunk generation to have completed.");
                        }
                        if (chunk.byteLength >= merkle_1.MIN_CHUNK_SIZE && chunk.byteLength <= merkle_1.MAX_CHUNK_SIZE) {
                            yield addChunk(chunkStreamByteIndex, chunk);
                        }
                        else if (chunk.byteLength < merkle_1.MIN_CHUNK_SIZE) {
                            if (previousDataChunk) {
                                // If this final chunk is smaller than the minimum chunk size, rebalance this final chunk and
                                // the previous chunk to keep the final chunk size above the minimum threshold.
                                const remainingBytes = Buffer.concat([previousDataChunk, chunk], previousDataChunk.byteLength + chunk.byteLength);
                                const rebalancedSizeForPreviousChunk = Math.ceil(remainingBytes.byteLength / 2);
                                const previousChunk = chunks.pop();
                                const rebalancedPreviousChunk = yield addChunk(previousChunk.minByteRange, remainingBytes.slice(0, rebalancedSizeForPreviousChunk));
                                yield addChunk(rebalancedPreviousChunk.maxByteRange, remainingBytes.slice(rebalancedSizeForPreviousChunk));
                            }
                            else {
                                // This entire stream should be smaller than the minimum chunk size, just add the chunk in.
                                yield addChunk(chunkStreamByteIndex, chunk);
                            }
                            expectChunkGenerationCompleted = true;
                        }
                        else if (chunk.byteLength > merkle_1.MAX_CHUNK_SIZE) {
                            throw Error("Encountered chunk larger than max chunk size.");
                        }
                        chunkStreamByteIndex += chunk.byteLength;
                        previousDataChunk = chunk;
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_a && !_b && (_c = chunkedSource_1.return)) yield _c.call(chunkedSource_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }); });
            const leaves = yield this.merkle.generateLeaves(chunks);
            const root = yield this.merkle.buildLayers(leaves);
            const proofs = this.merkle.generateProofs(root);
            return {
                data_root: root.id,
                chunks,
                proofs,
            };
        });
    }
    /**
     * Uploads the piped data to the specified transaction.
     *
     * @param tx
     * @param arweave
     * @param createTx whether or not the passed transaction should be created on the network.
     * This can be false if we want to reseed an existing transaction,
     * @param debugOpts
     */
    uploadTransactionAsync(tx, createTx = true, debugOpts) {
        var _a, _b;
        const txId = tx.id;
        const log = (message) => {
            if (debugOpts === null || debugOpts === void 0 ? void 0 : debugOpts.log)
                debugOpts.log(`[uploadTransactionAsync:${txId}] ${message}`);
        };
        log(`Starting chunked upload - ${(_b = (_a = tx.chunks) === null || _a === void 0 ? void 0 : _a.chunks) === null || _b === void 0 ? void 0 : _b.length} chunks / ${tx.data_size} total bytes`);
        return (source) => __awaiter(this, void 0, void 0, function* () {
            if (!tx.chunks) {
                throw Error("Transaction has no computed chunks!");
            }
            if (createTx) {
                // Ensure the transaction data field is blank.
                // We'll upload this data in chunks instead.
                tx.data = new Uint8Array(0);
                const createTxRes = yield this.api.post(`tx`, tx);
                if (!(createTxRes.status >= 200 && createTxRes.status < 300)) {
                    throw new Error(`Failed to create transaction: status ${createTxRes.status} / data ${createTxRes.data}`);
                }
            }
            const txChunkData = tx.chunks;
            const { chunks, proofs } = txChunkData;
            function prepareChunkUploadPayload(chunkIndex, chunkData) {
                const proof = proofs[chunkIndex];
                return {
                    data_root: tx.data_root,
                    data_size: tx.data_size,
                    data_path: (0, utils_1.bufferTob64Url)(proof.proof),
                    offset: proof.offset.toString(),
                    chunk: (0, utils_1.bufferTob64Url)(chunkData),
                };
            }
            log(`Starting pipe - MAX_CHUNK_SIZE=${merkle_1.MAX_CHUNK_SIZE}`);
            yield (0, promises_1.pipeline)(source, (0, chunker_1.chunker)(merkle_1.MAX_CHUNK_SIZE, { flush: true }), (chunkedSource) => { var _a, chunkedSource_2, chunkedSource_2_1; return __awaiter(this, void 0, void 0, function* () {
                var _b, e_2, _c, _d;
                let chunkIndex = 0;
                let dataRebalancedIntoFinalChunk;
                const activeChunkUploads = [];
                try {
                    for (_a = true, chunkedSource_2 = __asyncValues(chunkedSource); chunkedSource_2_1 = yield chunkedSource_2.next(), _b = chunkedSource_2_1.done, !_b; _a = true) {
                        _d = chunkedSource_2_1.value;
                        _a = false;
                        const chunkData = _d;
                        const currentChunk = chunks[chunkIndex];
                        const chunkSize = currentChunk.maxByteRange - currentChunk.minByteRange;
                        log(`Got chunk - ${chunkData.byteLength} bytes / chunkSize ${chunkSize}`);
                        const expectedToBeFinalRebalancedChunk = dataRebalancedIntoFinalChunk != null;
                        let chunkPayload;
                        if (chunkData.byteLength === chunkSize) {
                            // If the transaction data chunks was never rebalanced this is the only code path that
                            // will execute as the incoming chunked data as the will always be equivalent to `chunkSize`.
                            chunkPayload = prepareChunkUploadPayload(chunkIndex, chunkData);
                        }
                        else if (chunkData.byteLength > chunkSize) {
                            // If the incoming chunk data is larger than the expected size of the current chunk
                            // it means that the transaction had chunks that were rebalanced to meet the minimum chunk size.
                            //
                            // It also means that the chunk we're currently processing should be the second to last
                            // chunk.
                            chunkPayload = prepareChunkUploadPayload(chunkIndex, chunkData.slice(0, chunkSize));
                            dataRebalancedIntoFinalChunk = chunkData.slice(chunkSize);
                        }
                        else if (chunkData.byteLength < chunkSize && expectedToBeFinalRebalancedChunk) {
                            // If this is the final rebalanced chunk, create the upload payload by concatenating the previous
                            // chunk's data that was moved into this and the remaining stream data.
                            chunkPayload = prepareChunkUploadPayload(chunkIndex, Buffer.concat([dataRebalancedIntoFinalChunk, chunkData], dataRebalancedIntoFinalChunk.length + chunkData.length));
                        }
                        else {
                            throw Error("Transaction data stream terminated incorrectly.");
                        }
                        const chunkValid = yield this.merkle.validatePath(txChunkData.data_root, parseInt(chunkPayload.offset), 0, parseInt(chunkPayload.data_size), (0, utils_1.b64UrlToBuffer)(chunkPayload.data_path));
                        if (!chunkValid) {
                            throw new Error(`Unable to validate chunk ${chunkIndex}.`);
                        }
                        // Upload multiple transaction chunks in parallel to speed up the upload.
                        // If we are already at the maximum concurrent chunk upload limit,
                        // wait till all of them to complete first before continuing.
                        if (activeChunkUploads.length >= MAX_CONCURRENT_CHUNK_UPLOAD_COUNT) {
                            yield Promise.all(activeChunkUploads);
                            // Clear the active chunk uploads array.
                            activeChunkUploads.length = 0;
                        }
                        // TODO: allow for this abort code behaviour
                        activeChunkUploads.push(this.api.post("chunk", chunkPayload, { retry: { onRetry: (err) => !transaction_uploader_1.FATAL_CHUNK_UPLOAD_ERRORS.includes(err.message) } }));
                        chunkIndex++;
                        log(`Chunk process done - ${chunkIndex}`);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (!_a && !_b && (_c = chunkedSource_2.return)) yield _c.call(chunkedSource_2);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                log(`Active chunks to upload - ${activeChunkUploads.length}`);
                yield Promise.all(activeChunkUploads);
                if (chunkIndex < chunks.length) {
                    throw Error(`Transaction upload incomplete: ${chunkIndex + 1}/${chunks.length} chunks uploaded.`);
                }
            }); }).catch((e) => {
                log(e.message);
                throw e;
            });
        });
    }
}
exports.Stream = Stream;
//# sourceMappingURL=index.js.map