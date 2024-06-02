"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const signing_1 = require("arbundles/src/signing");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const near_api_js_1 = require("near-api-js");
const bs58_1 = require("bs58");
const bn_js_1 = __importDefault(require("bn.js"));
const js_sha256_1 = require("js-sha256");
const currency_1 = __importDefault(require("../currency"));
class NearConfig extends currency_1.default {
    constructor(config) {
        super(config);
        this.near = this.wallet._near;
        this.base = ["yoctoNEAR", 1e25];
        // this.keyPair = KeyPair.fromString(this.wallet)
    }
    async ready() {
        if (!this.wallet.isSignedIn()) {
            throw new Error("Wallet has not been signed in!");
        }
        const keystore = new near_api_js_1.keyStores.BrowserLocalStorageKeyStore();
        const account = this.wallet.account();
        // console.log(this.address)
        // console.log(await account.getAccessKeys())
        // this._address = this.wallet.getAccountId()
        // this.keyPair = KeyPair.fromString(this.wallet)
        // console.log(await account.getAccessKeys())
        this.keyPair = await keystore.getKey(this.wallet._networkId, account.accountId);
        if (!this.keyPair) {
            this.keyPair = near_api_js_1.KeyPair.fromRandom("ed25519");
            const publicKey = this.keyPair.getPublicKey().toString();
            // this.wallet._networkId
            await keystore.setKey(this.wallet._networkId, account.accountId, this.keyPair);
            // can't do this :c
            // console.log(publicKey)
            await account.addKey(publicKey);
        }
        // console.log(this.keyPair.getPublicKey().toString());
        // this._address = this.ownerToAddress(Buffer.from(this.keyPair.getPublicKey().data));
        this._address = await this.wallet.getAccountId();
        // this.providerInstance = new providers.JsonRpcProvider({ url: this.providerUrl });
        this.providerInstance = this.wallet._near.connection.provider;
        // console.log(this.keyPair);
    }
    /**
     * NEAR wants both the sender ID and tx Hash, so we have to concatenate to keep with the interface.
     * @param txId assumes format senderID:txHash
     */
    async getTx(txId) {
        var _a;
        // NOTE: their type defs are out of date with their actual API (23-01-2022)... beware the expect-error when debugging! 
        const provider = await this.providerInstance;
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
        // console.log(decode(status.receipts_outcome[0].block_hash))
        // // const routcometx = await provider.txStatusReceipts(decode(status.receipts_outcome[0].block_hash), status.receipts_outcome[0].id)
        // console.log({ blockHeight, status, latestBlockHeight })
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
        // should just return the loaded address?
        const pubkey = typeof owner === "string" ? owner : (0, bs58_1.encode)(owner);
        return (0, bs58_1.decode)(pubkey.replace("ed25519:", "")).toString("hex");
    }
    async sign(data) {
        return this.getSigner().sign(data);
    }
    getSigner() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        return new signing_1.NearSigner(this.keyPair.secretKey);
    }
    async verify(pub, data, signature) {
        return signing_1.NearSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        // const provider = await this.getProvider();
        const res = await this.providerInstance.status();
        return new bignumber_js_1.default(res.sync_info.latest_block_height);
    }
    async getFee(_amount, _to) {
        // const provider = await this.getProvider();
        // one unit of gas
        // const res = await provider.connection.provider.gasPrice(await (await this.getCurrentHeight()).toNumber())
        const res = await this.providerInstance.gasPrice(null); // null == gas price as of latest block
        // multiply by action cost in gas units (assume only action is transfer)
        // 4.5x10^11 gas units for fund transfers
        return new bignumber_js_1.default(res.gas_price).multipliedBy(450000000000);
    }
    async sendTx(data) {
        data;
        const res = await this.providerInstance.sendTransaction(data);
        return `${this.address}:${res.transaction.hash}`; // encode into compound format
    }
    async createTx(amount, to, _fee) {
        const accessKey = await this.providerInstance.query({ request_type: "view_access_key", finality: "final", account_id: this.address, public_key: this.keyPair.getPublicKey().toString() });
        // console.log(accessKey);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const nonce = ++accessKey.nonce;
        const recentBlockHash = near_api_js_1.utils.serialize.base_decode(accessKey.block_hash);
        const actions = [near_api_js_1.transactions.transfer(new bn_js_1.default(new bignumber_js_1.default(amount).toString()))];
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
    async getPublicKey() {
        return Buffer.from(this.keyPair.getPublicKey().data);
    }
}
exports.default = NearConfig;
//# sourceMappingURL=near.js.map