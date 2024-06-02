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
const error_1 = __importDefault(require("./lib/error"));
const transaction_1 = __importStar(require("./lib/transaction"));
const ArweaveUtils = __importStar(require("./lib/utils"));
const transaction_uploader_1 = require("./lib/transaction-uploader");
class Transactions {
    constructor({ deps }) {
        this.api = deps.api;
        this.crypto = deps.crypto;
        this.chunks = deps.chunks;
        this.merkle = deps.merkle;
        this.deepHash = deps.deepHash;
    }
    getTransactionAnchor() {
        /**
         * Maintain compatibility with erdjs which sets a global axios.defaults.transformResponse
         * in order to overcome some other issue in:  https://github.com/axios/axios/issues/983
         *
         * However, this introduces a problem with ardrive-js, so we will enforce
         * config =  {transformResponse: []} where we do not require a transform
         */
        return this.api.get(`tx_anchor`, { transformResponse: [] }).then((response) => {
            return response.data;
        });
    }
    getPrice(byteSize, targetAddress) {
        const endpoint = targetAddress ? `price/${byteSize}/${targetAddress}` : `price/${byteSize}`;
        return this.api
            .get(endpoint, {
            transformResponse: [
                /**
                 * We need to specify a response transformer to override
                 * the default JSON.parse behavior, as this causes
                 * winston to be converted to a number and we want to
                 * return it as a winston string.
                 * @param data
                 */
                function (data) {
                    return data;
                },
            ],
        })
            .then((response) => {
            return response.data;
        });
    }
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.api.get(`tx/${id}`);
            if (response.status == 200) {
                const data_size = parseInt(response.data.data_size);
                if (response.data.format >= 2 && data_size > 0 && data_size <= 1024 * 1024 * 12) {
                    const data = yield this.getData(id);
                    return new transaction_1.default({
                        attributes: Object.assign(Object.assign({}, response.data), { data }),
                        deps: { merkle: this.merkle, deepHash: this.deepHash },
                    });
                }
                return new transaction_1.default({
                    attributes: Object.assign(Object.assign({}, response.data), { format: response.data.format || 1 }),
                    deps: { merkle: this.merkle, deepHash: this.deepHash },
                });
            }
            if (response.status === 404) {
                throw new error_1.default("TX_NOT_FOUND" /* ArweaveErrorType.TX_NOT_FOUND */);
            }
            if (response.status === 410) {
                throw new error_1.default("TX_FAILED" /* ArweaveErrorType.TX_FAILED */);
            }
            throw new error_1.default("TX_INVALID" /* ArweaveErrorType.TX_INVALID */);
        });
    }
    fromRaw(attributes) {
        return new transaction_1.default({ attributes, deps: { merkle: this.merkle, deepHash: this.deepHash } });
    }
    getStatus(id) {
        return this.api.get(`tx/${id}/status`).then((response) => {
            if (response.status === 200) {
                return {
                    status: 200,
                    confirmed: response.data,
                };
            }
            return {
                status: response.status,
                confirmed: null,
            };
        });
    }
    getData(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = undefined;
            try {
                data = (yield this.api.get(`/${id}`, { responseType: "arraybuffer" })).data;
            }
            catch (error) {
                console.error(`Error while trying to download contiguous data from gateway cache for ${id}`);
                console.error(error);
            }
            if (!data) {
                console.warn(`Falling back to chunks for ${id}`);
                try {
                    data = yield this.chunks.downloadChunkedData(id);
                }
                catch (error) {
                    console.error(`Error while trying to download chunked data for ${id}`);
                    console.error(error);
                }
            }
            if (!data) {
                throw new Error(`${id} data was not found!`);
            }
            return data;
        });
    }
    getDataStream(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let data = undefined;
            try {
                const resData = (yield this.api.get(`/${id}`, { responseType: "arraybuffer" })).data;
                const gen = function g() {
                    return __asyncGenerator(this, arguments, function* g_1() {
                        yield yield __await(resData);
                    });
                };
                data = gen();
            }
            catch (error) {
                console.error(`Error while trying to download contiguous data from gateway cache for ${id}`);
                console.error(error);
            }
            if (!data) {
                console.warn(`Falling back to chunks for ${id}`);
                try {
                    const gen = this.chunks.concurrentChunkDownloader(id);
                    data = gen;
                }
                catch (error) {
                    console.error(`Error while trying to download chunked data for ${id}`);
                    console.error(error);
                }
            }
            if (!data) {
                throw new Error(`${id} data was not found!`);
            }
            return data;
        });
    }
    sign(transaction, jwk, // "use_wallet" for backwards compatibility only
    options) {
        return __awaiter(this, void 0, void 0, function* () {
            /** Non-exhaustive (only checks key names), but previously no jwk checking was done */
            const isJwk = (obj) => {
                let valid = true;
                ["n", "e", "d", "p", "q", "dp", "dq", "qi"].map((key) => !(key in obj) && (valid = false));
                return valid;
            };
            const validJwk = typeof jwk === "object" && isJwk(jwk);
            const externalWallet = typeof arweaveWallet === "object";
            if (!validJwk && !externalWallet) {
                throw new Error(`No valid JWK or external wallet found to sign transaction.`);
            }
            else if (externalWallet) {
                try {
                    const existingPermissions = yield arweaveWallet.getPermissions();
                    if (!existingPermissions.includes("SIGN_TRANSACTION"))
                        yield arweaveWallet.connect(["SIGN_TRANSACTION"]);
                }
                catch (_a) {
                    // Permission is already granted
                }
                // for external compatibility
                transaction.tags = transaction.tags.map((v) => new transaction_1.ArweaveTag(v.name, v.value));
                const signedTransaction = yield arweaveWallet.sign(transaction, options);
                transaction.setSignature({
                    id: signedTransaction.id,
                    owner: signedTransaction.owner,
                    reward: signedTransaction.reward,
                    tags: signedTransaction.tags,
                    signature: signedTransaction.signature,
                });
            }
            else if (validJwk) {
                transaction.setOwner(jwk.n);
                const dataToSign = yield transaction.getSignatureData();
                const rawSignature = yield this.crypto.sign(jwk, dataToSign, options);
                const id = yield this.crypto.hash(rawSignature);
                transaction.setSignature({
                    id: ArweaveUtils.bufferTob64Url(id),
                    owner: jwk.n,
                    signature: ArweaveUtils.bufferTob64Url(rawSignature),
                });
            }
            else {
                // can't get here, but for sanity we'll throw an error.
                throw new Error(`An error occurred while signing. Check wallet is valid`);
            }
        });
    }
    verify(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            const signaturePayload = yield transaction.getSignatureData();
            /**
             * The transaction ID should be a SHA-256 hash of the raw signature bytes, so this needs
             * to be recalculated from the signature and checked against the transaction ID.
             */
            const rawSignature = transaction.get("signature", {
                decode: true,
                string: false,
            });
            const expectedId = ArweaveUtils.bufferTob64Url(yield this.crypto.hash(rawSignature));
            if (transaction.id !== expectedId) {
                throw new Error(`Invalid transaction signature or ID! The transaction ID doesn't match the expected SHA-256 hash of the signature.`);
            }
            /**
             * Now verify the signature is valid and signed by the owner wallet (owner field = originating wallet public key).
             */
            return this.crypto.verify(transaction.owner, signaturePayload, rawSignature);
        });
    }
    post(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof transaction === "string") {
                transaction = new transaction_1.default({ attributes: JSON.parse(transaction), deps: { merkle: this.merkle, deepHash: this.deepHash } });
            }
            else if (typeof transaction.readInt32BE === "function") {
                transaction = new transaction_1.default({ attributes: JSON.parse(transaction.toString()), deps: { merkle: this.merkle, deepHash: this.deepHash } });
            }
            else if (typeof transaction === "object" && !(transaction instanceof transaction_1.default)) {
                transaction = new transaction_1.default({ attributes: transaction, deps: { merkle: this.merkle, deepHash: this.deepHash } });
            }
            if (!(transaction instanceof transaction_1.default)) {
                throw new Error(`Must be Transaction object`);
            }
            if (!transaction.chunks) {
                yield transaction.prepareChunks(transaction.data);
            }
            const uploader = yield this.getUploader(transaction, transaction.data);
            // Emulate existing error & return value behavior.
            try {
                while (!uploader.isComplete) {
                    yield uploader.uploadChunk();
                }
            }
            catch (e) {
                if (uploader.lastResponseStatus > 0) {
                    return {
                        status: uploader.lastResponseStatus,
                        statusText: uploader.lastResponseError,
                        data: {
                            error: uploader.lastResponseError,
                        },
                    };
                }
                throw e;
            }
            return {
                status: 200,
                statusText: "OK",
                data: {},
            };
        });
    }
    /**
     * Gets an uploader than can be used to upload a transaction chunk by chunk, giving progress
     * and the ability to resume.
     *
     * Usage example:
     *
     * ```
     * const uploader = arweave.transactions.getUploader(transaction);
     * while (!uploader.isComplete) {
     *   await uploader.uploadChunk();
     *   console.log(`${uploader.pctComplete}%`);
     * }
     * ```
     *
     * @param upload a Transaction object, a previously save progress object, or a transaction id.
     * @param data the data of the transaction. Required when resuming an upload.
     */
    getUploader(upload, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let uploader;
            if (data instanceof ArrayBuffer) {
                data = new Uint8Array(data);
            }
            if (upload instanceof transaction_1.default) {
                if (!data) {
                    data = upload.data;
                }
                if (!(data instanceof Uint8Array)) {
                    throw new Error("Data format is invalid");
                }
                if (!upload.chunks) {
                    yield upload.prepareChunks(data);
                }
                uploader = new transaction_uploader_1.TransactionUploader({
                    transaction: upload,
                    deps: { api: this.api, crypto: this.crypto, merkle: this.merkle, deepHash: this.deepHash },
                });
                if (!uploader.data || uploader.data.length === 0) {
                    uploader.data = data;
                }
            }
            else {
                if (typeof upload === "string") {
                    upload = yield transaction_uploader_1.TransactionUploader.fromTransactionId(this.api, upload);
                }
                if (!data || !(data instanceof Uint8Array)) {
                    throw new Error(`Must provide data when resuming upload`);
                }
                // upload should be a serialized upload.
                uploader = yield transaction_uploader_1.TransactionUploader.fromSerialized({
                    deps: { api: this.api, merkle: this.merkle, crypto: this.crypto, deepHash: this.deepHash },
                    serialized: upload,
                    data,
                });
            }
            return uploader;
        });
    }
    /**
     * Async generator version of uploader
     *
     * Usage example:
     *
     * ```
     * for await (const uploader of arweave.transactions.upload(tx)) {
     *  console.log(`${uploader.pctComplete}%`);
     * }
     * ```
     *
     * @param upload a Transaction object, a previously save uploader, or a transaction id.
     * @param data the data of the transaction. Required when resuming an upload.
     */
    upload(upload, data) {
        return __asyncGenerator(this, arguments, function* upload_1() {
            const uploader = yield __await(this.getUploader(upload, data));
            while (!uploader.isComplete) {
                yield __await(uploader.uploadChunk());
                yield yield __await(uploader);
            }
            return yield __await(uploader);
        });
    }
}
exports.default = Transactions;
//# sourceMappingURL=transactions.js.map