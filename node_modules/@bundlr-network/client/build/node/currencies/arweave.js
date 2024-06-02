"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arweave_1 = __importDefault(require("arweave"));
const signing_1 = require("arbundles/src/signing");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const crypto_1 = __importDefault(require("crypto"));
const base64url_1 = __importDefault(require("base64url"));
const currency_1 = __importDefault(require("../currency"));
class ArweaveConfig extends currency_1.default {
    constructor(config) {
        super(config);
        this.base = ["winston", 1e12];
        this.needsFee = true;
    }
    async getProvider() {
        var _a, _b;
        if (!this.providerInstance) {
            const purl = new URL((_a = this.providerUrl) !== null && _a !== void 0 ? _a : "https://arweave.net");
            this.providerInstance = arweave_1.default.init({ host: purl.hostname, protocol: purl.protocol.replaceAll(":", "").replaceAll("/", ""), port: purl.port, network: (_b = this === null || this === void 0 ? void 0 : this.opts) === null || _b === void 0 ? void 0 : _b.network });
        }
        return this.providerInstance;
    }
    async getTx(txId) {
        var _a, _b, _c;
        const arweave = await this.getProvider();
        const txs = await arweave.transactions.getStatus(txId);
        let tx;
        if (txs.status == 200) {
            tx = await arweave.transactions.get(txId);
        }
        const confirmed = (txs.status !== 202 && ((_a = txs.confirmed) === null || _a === void 0 ? void 0 : _a.number_of_confirmations) >= this.minConfirm);
        let owner;
        if (tx === null || tx === void 0 ? void 0 : tx.owner) {
            owner = this.ownerToAddress(tx.owner);
        }
        return {
            from: owner !== null && owner !== void 0 ? owner : undefined,
            to: (_b = tx === null || tx === void 0 ? void 0 : tx.target) !== null && _b !== void 0 ? _b : undefined,
            amount: new bignumber_js_1.default((_c = tx === null || tx === void 0 ? void 0 : tx.quantity) !== null && _c !== void 0 ? _c : 0),
            pending: (txs.status == 202),
            confirmed
        };
    }
    ownerToAddress(owner) {
        return arweave_1.default.utils.bufferTob64Url(crypto_1.default
            .createHash("sha256")
            .update((arweave_1.default.utils.b64UrlToBuffer((Buffer.isBuffer(owner) ? (0, base64url_1.default)(owner) : owner))))
            .digest());
    }
    async sign(data) {
        return arweave_1.default.crypto.sign(this.wallet, data);
    }
    getSigner() {
        return new signing_1.ArweaveSigner(this.wallet);
    }
    async verify(pub, data, signature) {
        if (Buffer.isBuffer(pub)) {
            pub = pub.toString();
        }
        return arweave_1.default.crypto.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        return (await this.getProvider()).network.getInfo().then(r => new bignumber_js_1.default(r.height));
    }
    async getFee(amount, to) {
        return new bignumber_js_1.default(await (await this.getProvider()).transactions.getPrice((new bignumber_js_1.default(amount)).toNumber(), to)).integerValue(bignumber_js_1.default.ROUND_CEIL);
    }
    async sendTx(data) {
        return await (await this.getProvider()).transactions.post(data);
    }
    async createTx(amount, to, fee) {
        const arweave = await this.getProvider();
        const tx = await arweave.createTransaction({ quantity: (new bignumber_js_1.default(amount)).toString(), reward: fee, target: to }, this.wallet);
        await arweave.transactions.sign(tx, this.wallet);
        return { txId: tx.id, tx };
    }
    getPublicKey() {
        return this.wallet.n;
    }
}
exports.default = ArweaveConfig;
//# sourceMappingURL=arweave.js.map