// import Ar from "./ar";
import Blocks from "./blocks.js";
import Chunks from "./chunks.js";
import { augmentCrypto } from "./lib/crypto/crypto-augment.js";
import { DeepHash } from "./lib/deepHash.js";
import FallbackApi from "./lib/fallbackApi.js";
import Merkle from "./lib/merkle.js";
import Transaction from "./lib/transaction.js";
import * as ArweaveUtils from "./lib/utils.js";
import Network from "./network.js";
import Transactions from "./transactions.js";
import Wallets from "./wallets.js";
export class Arweave {
    config;
    api;
    wallets;
    transactions;
    network;
    blocks;
    chunks;
    static init;
    static utils = ArweaveUtils;
    crypto;
    deepHash;
    merkle;
    static VERSION = "0.0.1";
    constructor(config) {
        this.config = config;
        if (!config.crypto)
            throw new Error(`config.crypto is required`); // `crypto` is automatically added by the wrapper constructors, users should never encounter this
        this.crypto = augmentCrypto(config.crypto, { deepHash: DeepHash });
        this.deepHash = this.crypto.deepHash;
        const apiConfig = config.gateways ? (Array.isArray(config.gateways) ? config.gateways : [config.gateways]) : undefined;
        this.api = new FallbackApi({ gateways: apiConfig, miners: config.miners });
        this.wallets = new Wallets(this.api, this.crypto);
        this.chunks = new Chunks(this.api);
        this.network = new Network(this.api);
        this.blocks = new Blocks(this.api, this.network);
        this.merkle = new Merkle({ deps: { crypto: this.crypto } });
        this.transactions = new Transactions({
            deps: { api: this.api, crypto: config.crypto, chunks: this.chunks, merkle: this.merkle, deepHash: this.deepHash },
        });
    }
    get utils() {
        return Arweave.utils;
    }
    getConfig() {
        return this.config;
    }
    async createTransaction(attributes, jwk) {
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
            transaction.last_tx = await this.transactions.getTransactionAnchor();
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
            transaction.reward = await this.transactions.getPrice(length, transaction.target);
        }
        // here we should call prepare chunk
        transaction.data_root = "";
        transaction.data_size = attributes.data ? attributes.data.byteLength.toString() : "0";
        transaction.data = attributes.data || new Uint8Array(0);
        const createdTransaction = new Transaction({
            attributes: transaction,
            deps: { merkle: this.merkle, deepHash: this.deepHash },
        });
        await createdTransaction.getSignatureData();
        return createdTransaction;
    }
}
export default Arweave;
//# sourceMappingURL=arweave.js.map