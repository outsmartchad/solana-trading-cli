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
exports.downloadTx = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
// arweave chunk size
const CHUNK_SIZE = 256 * 1024;
/**
 * Concurrent Arweave transaction downloader - uses `Api` internally
 * to download a transaction via it's Arweave network level chunks with concurrency
 * @param txId - txId to download
 * @param config
 */
function downloadTx(txId, api, options) {
    return __asyncGenerator(this, arguments, function* downloadTx_1() {
        // default concurrency to 100 as the chunks are *tiny* (256kib)
        const opts = Object.assign({ concurrency: 100 }, options);
        try {
            const metadata = yield __await(api.get(`/tx/${txId}/offset`));
            // use big numbers for safety
            const endOffset = new bignumber_js_1.default(metadata.data.offset);
            const size = new bignumber_js_1.default(metadata.data.size);
            const startOffset = endOffset.minus(size).plus(1);
            let processedBytes = 0;
            const chunks = Math.ceil(size.dividedBy(CHUNK_SIZE).toNumber());
            const getChunk = (offset) => __awaiter(this, void 0, void 0, function* () {
                return api.get(`/chunk/${offset.toString()}`).then((r) => {
                    const b = Buffer.from(r.data.chunk, "base64url");
                    // logger.debug(`[getChunk] offset ${offset.toString()} size ${b.length}`);
                    processedBytes += b.length;
                    return b;
                });
            });
            const processing = [];
            // only parallelise everything except last two chunks.
            // last two due to merkle rebalancing due to minimum chunk size, see https://github.com/ArweaveTeam/arweave-js/blob/ce441f8d4e66a2524cfe86bbbcaed34b887ba193/src/common/lib/merkle.ts#LL53C19-L53C19
            const parallelChunks = chunks - 2;
            const concurrency = Math.min(parallelChunks, opts.concurrency);
            let currChunk = 0;
            for (let i = 0; i < concurrency; i++)
                processing.push(getChunk(startOffset.plus(CHUNK_SIZE * currChunk++)));
            while (currChunk < parallelChunks) {
                processing.push(getChunk(startOffset.plus(CHUNK_SIZE * currChunk++)));
                // yield await so that processedBytes works properly
                yield yield __await(processing.shift());
            }
            while (processing.length > 0)
                yield yield __await(processing.shift());
            yield yield __await(getChunk(startOffset.plus(CHUNK_SIZE * currChunk++)));
            if (size.isGreaterThan(processedBytes))
                yield yield __await(getChunk(startOffset.plus(CHUNK_SIZE * currChunk++)));
            if (!size.isEqualTo(processedBytes))
                throw new Error(`got ${processedBytes}B, expected ${size.toString()}B`);
            return yield __await(void 0);
        }
        catch (e) {
            if (e instanceof Error) {
                e.message = "downloadTx: " + e.message;
            }
            throw e;
        }
    });
}
exports.downloadTx = downloadTx;
//# sourceMappingURL=downloader.js.map