"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const keccak256_1 = __importDefault(require("arbundles/src/signing/keccak256"));
const ethers_1 = require("ethers");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const signing_1 = require("arbundles/src/signing");
const currency_1 = __importDefault(require("../currency"));
const ethBigNumber = ethers_1.ethers.BigNumber; // required for hexString conversions (w/ 0x padding)
const ethereumSigner = signing_1.InjectedEthereumSigner;
class EthereumConfig extends currency_1.default {
    constructor(config) {
        super(config);
        this.base = ["wei", 1e18];
    }
    async getTx(txId) {
        const provider = this.providerInstance;
        const response = await provider.getTransaction(txId);
        if (!response)
            throw new Error("Tx doesn't exist");
        return {
            from: response.from,
            to: response.to,
            blockHeight: response.blockNumber ? new bignumber_js_1.default(response.blockNumber) : null,
            amount: new bignumber_js_1.default(response.value.toHexString(), 16),
            pending: response.blockNumber ? false : true,
            confirmed: response.confirmations >= this.minConfirm,
        };
    }
    ownerToAddress(owner) {
        return "0x" + (0, keccak256_1.default)(Buffer.from(owner.slice(1))).slice(-20).toString("hex");
    }
    async sign(data) {
        const signer = await this.getSigner();
        return signer.sign(data);
    }
    getSigner() {
        if (!this.signer) {
            this.signer = new signing_1.InjectedEthereumSigner(this.wallet);
        }
        return this.signer;
    }
    async verify(pub, data, signature) {
        return ethereumSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        const provider = this.providerInstance;
        const response = await provider.send("eth_blockNumber", []);
        return new bignumber_js_1.default(response, 16);
    }
    async getFee(amount, to) {
        const provider = this.providerInstance;
        const tx = {
            to,
            from: this.address,
            value: "0x" + (new bignumber_js_1.default(amount)).toString(16),
        };
        const estimatedGas = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();
        return new bignumber_js_1.default(estimatedGas.mul(gasPrice).toString());
    }
    async sendTx(data) {
        const signer = this.w3signer;
        const receipt = await signer.sendTransaction(data); // .catch((e) => { console.error(`Sending tx: ${e}`) })
        return receipt ? receipt.hash : undefined;
    }
    async createTx(amount, to, _fee) {
        const amountc = ethBigNumber.from((new bignumber_js_1.default(amount)).toFixed());
        const signer = this.w3signer;
        const estimatedGas = await signer.estimateGas({ to, from: this.address, value: amountc.toHexString() });
        let gasPrice = await signer.getGasPrice();
        if (this.name === "matic") {
            gasPrice = ethers_1.ethers.BigNumber.from(new bignumber_js_1.default(gasPrice.toString()).multipliedBy(10).decimalPlaces(0).toString());
        }
        const txr = await signer.populateTransaction({ to, from: this.address, value: amountc.toHexString(), gasPrice, gasLimit: estimatedGas });
        return { txId: undefined, tx: txr };
    }
    async getPublicKey() {
        const signer = await this.getSigner();
        await signer.setPublicKey();
        return signer.publicKey;
    }
    pruneBalanceTransactions(_txIds) {
        throw new Error("Method not implemented.");
    }
    async ready() {
        var _a;
        this.w3signer = await this.wallet.getSigner();
        this._address = this.ownerToAddress(await this.getPublicKey());
        this.providerInstance = new ethers_1.ethers.providers.JsonRpcProvider(this.providerUrl);
        await ((_a = this.providerInstance) === null || _a === void 0 ? void 0 : _a._ready());
    }
}
exports.default = EthereumConfig;
//# sourceMappingURL=ethereum.js.map