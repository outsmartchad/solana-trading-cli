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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const error_1 = require("./lib/error");
const ArweaveUtils = __importStar(require("./lib/utils"));
const merkle_1 = require("./lib/merkle");
class Chunks {
    constructor(api) {
        this.api = api;
    }
    getTransactionMetadata(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield this.api.get(`tx/${id}/offset`);
            if (resp.status === 200) {
                return resp.data;
            }
            throw new Error(`Unable to get transaction offset: ${(0, error_1.getError)(resp)}`);
        });
    }
    getChunk(offset) {
        return __awaiter(this, void 0, void 0, function* () {
            const resp = yield this.api.get(`chunk/${offset}`);
            if (resp.status === 200) {
                return resp.data;
            }
            throw new Error(`Unable to get chunk: ${(0, error_1.getError)(resp)}`);
        });
    }
    getChunkData(offset) {
        return __awaiter(this, void 0, void 0, function* () {
            const chunk = yield this.getChunk(offset);
            const buf = ArweaveUtils.b64UrlToBuffer(chunk.chunk);
            return buf;
        });
    }
    firstChunkOffset(offsetResponse) {
        return parseInt(offsetResponse.offset) - parseInt(offsetResponse.size) + 1;
    }
    /**
     * Downloads chunks from the configured API peers, with a default concurrency of 10
     * @param id - ID of the transaction to download
     * @param options - Options object for configuring the downloader
     * @param options.concurrency - The number of chunks to download simultaneously. reduce on slower connections.
     * @returns
     */
    downloadChunkedData(id, options) {
        var _a, e_1, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const offsetResponse = yield this.getTransactionMetadata(id);
            const size = parseInt(offsetResponse.size);
            const data = new Uint8Array(size);
            let byte = 0;
            try {
                for (var _d = true, _e = __asyncValues(this.concurrentChunkDownloader(id, options)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const chunkData = _c;
                    data.set(chunkData, byte);
                    byte += chunkData.length;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return data;
        });
    }
    concurrentChunkDownloader(id, options) {
        return __asyncGenerator(this, arguments, function* concurrentChunkDownloader_1() {
            const opts = Object.assign({ concurrency: 10 }, options);
            const metadata = yield __await(this.getTransactionMetadata(id));
            // use big numbers for safety
            const endOffset = new bignumber_js_1.default(metadata.offset);
            const size = new bignumber_js_1.default(metadata.size);
            const startOffset = endOffset.minus(size).plus(1);
            let processedBytes = 0;
            const chunks = Math.ceil(size.dividedBy(merkle_1.MAX_CHUNK_SIZE).toNumber());
            const downloadData = (offset) => this.getChunkData(offset.toString()).then((r) => {
                processedBytes += r.length;
                return r;
            });
            const processing = [];
            // only parallelise everything except last two chunks.
            // last two due to merkle rebalancing due to minimum chunk size, see https://github.com/ArweaveTeam/arweave-js/blob/ce441f8d4e66a2524cfe86bbbcaed34b887ba193/src/common/lib/merkle.ts#LL53C19-L53C19
            const parallelChunks = chunks - 2;
            const concurrency = Math.min(parallelChunks, opts.concurrency);
            let currChunk = 0;
            // logger.debug(`[downloadTx] Tx ${txId} start ${startOffset} size ${size} chunks ${chunks} concurrency ${concurrency}`);
            for (let i = 0; i < concurrency; i++)
                processing.push(downloadData(startOffset.plus(merkle_1.MAX_CHUNK_SIZE * currChunk++)));
            while (currChunk < parallelChunks) {
                processing.push(downloadData(startOffset.plus(merkle_1.MAX_CHUNK_SIZE * currChunk++)));
                // yield await so that processedBytes works properly
                yield yield __await(processing.shift());
            }
            while (processing.length > 0)
                yield yield __await(processing.shift());
            yield yield __await(downloadData(startOffset.plus(merkle_1.MAX_CHUNK_SIZE * currChunk++)));
            if (size.isGreaterThan(processedBytes))
                yield yield __await(downloadData(startOffset.plus(merkle_1.MAX_CHUNK_SIZE * currChunk++)));
            if (!size.isEqualTo(processedBytes))
                throw new Error(`got ${processedBytes}B, expected ${size.toString()}B`);
            return yield __await(void 0);
        });
    }
}
exports.default = Chunks;
//# sourceMappingURL=chunks.js.map