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
const signing_1 = require("arbundles/src/signing");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const currency_1 = __importDefault(require("../currency"));
const algosdk = __importStar(require("algosdk"));
const axios_1 = __importDefault(require("axios"));
class AlgorandConfig extends currency_1.default {
    constructor(config) {
        super(config);
        this.base = ["microAlgos", 1e6];
        this.keyPair = algosdk.mnemonicToSecretKey(this.wallet);
        this.apiURL = this.providerUrl.slice(0, 8) + "node." + this.providerUrl.slice(8);
        this.indexerURL = this.providerUrl.slice(0, 8) + "algoindexer." + this.providerUrl.slice(8);
    }
    async getTx(txId) {
        const endpoint = `${this.indexerURL}/v2/transactions/${txId}`;
        const response = await axios_1.default.get(endpoint);
        const latestBlockHeight = new bignumber_js_1.default(await this.getCurrentHeight()).toNumber();
        const txBlockHeight = new bignumber_js_1.default(response.data.transaction["confirmed-round"]);
        const tx = {
            from: response.data.transaction["sender"],
            to: response.data.transaction["payment-transaction"].receiver,
            amount: new bignumber_js_1.default(response.data.transaction["payment-transaction"].amount),
            blockHeight: txBlockHeight,
            pending: false,
            confirmed: latestBlockHeight - txBlockHeight.toNumber() >= this.minConfirm
        };
        return tx;
    }
    ownerToAddress(owner) {
        return algosdk.encodeAddress(owner);
    }
    async sign(data) {
        return this.getSigner().sign(data);
    }
    getSigner() {
        return new signing_1.AlgorandSigner(this.keyPair.sk, this.getPublicKey());
    }
    async verify(pub, data, signature) {
        return signing_1.AlgorandSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        //  "last-round" = blockheight
        const endpoint = `${this.apiURL}/v2/transactions/params`;
        const response = await axios_1.default.get(endpoint);
        return new bignumber_js_1.default(await response.data["last-round"]);
    }
    async getFee() {
        const endpoint = `${this.apiURL}/v2/transactions/params`;
        const response = await axios_1.default.get(endpoint);
        return new bignumber_js_1.default(response.data["min-fee"]);
    }
    async sendTx(data) {
        const endpoint = `${this.apiURL}/v2/transactions`;
        const response = await axios_1.default.post(endpoint, data);
        return response.data["txId"]; // return TX id
    }
    async createTx(amount, to) {
        const endpoint = `${this.apiURL}/v2/transactions/params`;
        const response = await axios_1.default.get(endpoint);
        const params = await response.data;
        const unsigned = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            from: this.keyPair.addr,
            to: to,
            amount: new bignumber_js_1.default(amount).toNumber(),
            note: undefined,
            suggestedParams: {
                fee: params["fee"],
                firstRound: params["last-round"],
                flatFee: false,
                genesisHash: params["genesis-hash"],
                genesisID: params["genesis-id"],
                lastRound: (params["last-round"] + 1000)
            }
        });
        const signed = algosdk.signTransaction(unsigned, this.keyPair.sk);
        return { tx: signed.blob, txId: signed.txID };
    }
    getPublicKey() {
        this.keyPair = algosdk.mnemonicToSecretKey(this.wallet);
        const pub = algosdk.decodeAddress(this.keyPair.addr).publicKey;
        return Buffer.from(pub);
    }
}
exports.default = AlgorandConfig;
//# sourceMappingURL=algorand.js.map