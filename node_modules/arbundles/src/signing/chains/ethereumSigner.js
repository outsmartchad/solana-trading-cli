"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const secp256k1_1 = __importDefault(require("../keys/secp256k1"));
const secp256k1_2 = __importDefault(require("secp256k1"));
const ethers_1 = require("ethers");
class EthereumSigner extends secp256k1_1.default {
    get publicKey() {
        return Buffer.from(this.pk, "hex");
    }
    constructor(key) {
        const b = Buffer.from(key, "hex");
        const pub = secp256k1_2.default.publicKeyCreate(b, false);
        super(key, Buffer.from(pub));
    }
    sign(message) {
        const wallet = new ethers_1.ethers.Wallet(this._key);
        return wallet
            .signMessage(message)
            .then((r) => Buffer.from(r.slice(2), "hex"));
    }
    static async verify(pk, message, signature) {
        const address = ethers_1.ethers.utils.computeAddress(pk);
        return ethers_1.ethers.utils.verifyMessage(message, signature) === address;
    }
}
exports.default = EthereumSigner;
//# sourceMappingURL=ethereumSigner.js.map