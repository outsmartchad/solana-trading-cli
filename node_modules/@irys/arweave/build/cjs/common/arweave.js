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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Arweave = void 0;
// import Ar from "./ar";
const blocks_1 = __importDefault(require("./blocks"));
const chunks_1 = __importDefault(require("./chunks"));
const crypto_augment_1 = require("./lib/crypto/crypto-augment");
const deepHash_1 = require("./lib/deepHash");
const fallbackApi_1 = __importDefault(require("./lib/fallbackApi"));
const merkle_1 = __importDefault(require("./lib/merkle"));
const transaction_1 = __importDefault(require("./lib/transaction"));
const ArweaveUtils = __importStar(require("./lib/utils"));
const network_1 = __importDefault(require("./network"));
const transactions_1 = __importDefault(require("./transactions"));
const wallets_1 = __importDefault(require("./wallets"));
class Arweave {
    constructor(config) {
        this.config = config;
        if (!config.crypto)
            throw new Error(`config.crypto is required`); // `crypto` is automatically added by the wrapper constructors, users should never encounter this
        this.crypto = (0, crypto_augment_1.augmentCrypto)(config.crypto, { deepHash: deepHash_1.DeepHash });
        this.deepHash = this.crypto.deepHash;
        const apiConfig = config.gateways ? (Array.isArray(config.gateways) ? config.gateways : [config.gateways]) : undefined;
        this.api = new fallbackApi_1.default({ gateways: apiConfig, miners: config.miners });
        this.wallets = new wallets_1.default(this.api, this.crypto);
        this.chunks = new chunks_1.default(this.api);
        this.network = new network_1.default(this.api);
        this.blocks = new blocks_1.default(this.api, this.network);
        this.merkle = new merkle_1.default({ deps: { crypto: this.crypto } });
        this.transactions = new transactions_1.default({
            deps: { api: this.api, crypto: config.crypto, chunks: this.chunks, merkle: this.merkle, deepHash: this.deepHash },
        });
    }
    get utils() {
        return Arweave.utils;
    }
    getConfig() {
        return this.config;
    }
    createTransaction(attributes, jwk) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = {};
            Object.assign(transaction, attributes);
            if (!attributes.data && !(attributes.target && attributes.quantity)) {
                throw new Error(`A new Arweave transaction must have a 'data' value, or 'target' and 'quantity' values.`);
            }
            if (attributes.owner == undefined) {
                if (jwk && jwk !== "use_wallet") {
                    transaction.owner = jwk.n;
                }
            }
            if (attributes.last_tx == undefined) {
                transaction.last_tx = yield this.transactions.getTransactionAnchor();
            }
            if (typeof attributes.data === "string") {
                attributes.data = ArweaveUtils.stringToBuffer(attributes.data);
            }
            if (attributes.data instanceof ArrayBuffer) {
                attributes.data = new Uint8Array(attributes.data);
            }
            if (attributes.data && !(attributes.data instanceof Uint8Array)) {
                throw new Error("Expected data to be a string, Uint8Array or ArrayBuffer");
            }
            if (attributes.reward == undefined) {
                const length = attributes.data ? attributes.data.byteLength : 0;
                transaction.reward = yield this.transactions.getPrice(length, transaction.target);
            }
            // here we should call prepare chunk
            transaction.data_root = "";
            transaction.data_size = attributes.data ? attributes.data.byteLength.toString() : "0";
            transaction.data = attributes.data || new Uint8Array(0);
            const createdTransaction = new transaction_1.default({
                attributes: transaction,
                deps: { merkle: this.merkle, deepHash: this.deepHash },
            });
            yield createdTransaction.getSignatureData();
            return createdTransaction;
        });
    }
}
exports.Arweave = Arweave;
Arweave.utils = ArweaveUtils;
Arweave.VERSION = "0.0.1";
exports.default = Arweave;
//# sourceMappingURL=arweave.js.map