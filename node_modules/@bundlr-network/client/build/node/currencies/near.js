"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const signing_1 = require("arbundles/src/signing");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const currency_1 = __importDefault(require("../currency"));
const near_api_js_1 = require("near-api-js");
const bs58_1 = require("bs58");
const bn_js_1 = __importDefault(require("bn.js"));
const js_sha256_1 = require("js-sha256");
const near_seed_phrase_1 = require("near-seed-phrase");
const base64url_1 = __importDefault(require("base64url"));
const axios_1 = __importDefault(require("axios"));
class NearConfig extends currency_1.default {
    constructor(config) {
        let wallet = config.wallet;
        if ((wallet === null || wallet === void 0 ? void 0 : wallet.split(":")) !== "ed25519") {
            wallet = (0, near_seed_phrase_1.parseSeedPhrase)(wallet, near_seed_phrase_1.KEY_DERIVATION_PATH).secretKey;
        }
        config.wallet = wallet;
        super(config);
        this.base = ["yoctoNEAR", 1e24];
        this.keyPair = near_api_js_1.KeyPair.fromString(this.wallet);
    }
    async getProvider() {
        if (!this.providerInstance) {
            this.providerInstance = new near_api_js_1.providers.JsonRpcProvider({ url: this.providerUrl });
        }
        return this.providerInstance;
    }
    /**
     * NEAR wants both the sender ID and tx Hash, so we have to concatenate to keep with the interface.
     * @param txId assumes format senderID:txHash
     */
    async getTx(txId) {
        var _a;
        // NOTE: their type defs are out of date with their actual API (23-01-2022)... beware the expect-error when debugging! 
        const provider = await this.getProvider();
        const [id, hash] = txId.split(":");
        const status = await provider.txStatusReceipts((0, bs58_1.decode)(hash), id);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const blockHeight = (await provider.block(status.transaction_outcome.block_hash));
        const latestBlockHeight = (await provider.block({ finality: "final" })).header.height;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        if (status.receipts_outcome[0].outcome.status.SuccessValue !== "") {
            throw new Error("Transaction failed!");
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const deposit = (_a = status.receipts[0].receipt.Action.actions[0].Transfer.deposit) !== null && _a !== void 0 ? _a : 0;
        return {
            from: id,
            to: status.transaction.receiver_id,
            amount: new bignumber_js_1.default(deposit),
            blockHeight: new bignumber_js_1.default(blockHeight.header.height),
            pending: false,
            confirmed: latestBlockHeight - blockHeight.header.height >= this.minConfirm
        };
    }
    /**
     * address = accountID
     * @param owner // assumed to be the "ed25519:" header + b58 encoded key
     */
    ownerToAddress(owner) {
        return (typeof owner === "string")
            ? (0, bs58_1.decode)(owner.replace("ed25519:", "")).toString("hex")
            : (0, bs58_1.decode)((0, bs58_1.encode)(owner)).toString("hex");
    }
    async sign(data) {
        return this.getSigner().sign(data);
    }
    getSigner() {
        return new signing_1.NearSigner(this.wallet);
    }
    async verify(pub, data, signature) {
        return signing_1.NearSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        const provider = await this.getProvider();
        const res = await provider.status();
        return new bignumber_js_1.default(res.sync_info.latest_block_height);
    }
    /**
     * NOTE: assumes only operation is transfer
     * @param _amount
     * @param _to
     * @returns
     */
    async getFee(_amount, _to) {
        // TODO: use https://docs.near.org/docs/concepts/gas and https://docs.near.org/docs/api/rpc/protocol#genesis-config
        // to derive cost from genesis config to generalise support.
        const provider = await this.getProvider();
        const res = await provider.gasPrice(null); // null == gas price as of latest block
        // multiply by action cost in gas units (assume only action is transfer)
        // 4.5x10^11 gas units for fund transfers
        return new bignumber_js_1.default(res.gas_price).multipliedBy(450000000000);
    }
    async sendTx(data) {
        data;
        const res = await (await this.getProvider()).sendTransaction(data);
        return `${this.address}:${res.transaction.hash}`; // encode into compound format
    }
    async createTx(amount, to, _fee) {
        const provider = await this.getProvider();
        const accessKey = await provider.query(({ request_type: "view_access_key", finality: "final", account_id: this.address, public_key: this.keyPair.getPublicKey().toString() }));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const nonce = ++accessKey.nonce;
        const recentBlockHash = near_api_js_1.utils.serialize.base_decode(accessKey.block_hash);
        const actions = [near_api_js_1.transactions.transfer(new bn_js_1.default(new bignumber_js_1.default(amount).toFixed().toString()))];
        const tx = near_api_js_1.transactions.createTransaction(this.address, this.keyPair.getPublicKey(), to, nonce, actions, recentBlockHash);
        const serialTx = near_api_js_1.utils.serialize.serialize(near_api_js_1.transactions.SCHEMA, tx);
        const serialTxHash = new Uint8Array(js_sha256_1.sha256.array(serialTx));
        const signature = this.keyPair.sign(serialTxHash);
        const signedTx = new near_api_js_1.transactions.SignedTransaction({
            transaction: tx,
            signature: new near_api_js_1.transactions.Signature({
                keyType: tx.publicKey.keyType,
                data: signature.signature,
            }),
        });
        return { tx: signedTx, txId: undefined };
    }
    getPublicKey() {
        this.keyPair = near_api_js_1.KeyPair.fromString(this.wallet);
        return Buffer.from(this.keyPair.getPublicKey().data);
    }
    async ready() {
        var _a, _b;
        try {
            // resolve loaded pubkey to parent address
            const pubkey = this.keyPair.getPublicKey().toString();
            const resolved = await axios_1.default.get(`${this.bundlrUrl}/account/near/lookup?address=${base64url_1.default.encode(pubkey.split(":")[1])}`).catch(e => { return e; });
            this._address = (_b = (_a = resolved === null || resolved === void 0 ? void 0 : resolved.data) === null || _a === void 0 ? void 0 : _a.address) !== null && _b !== void 0 ? _b : this._address;
        }
        catch (e) {
            console.error(e);
        }
    }
}
exports.default = NearConfig;
//# sourceMappingURL=near.js.map