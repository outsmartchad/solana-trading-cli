"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Rsa4096Pss_1 = __importDefault(require("../keys/Rsa4096Pss"));
const pem_1 = require("arweave/node/lib/crypto/pem");
const base64url_1 = __importDefault(require("base64url"));
const arweave_1 = __importDefault(require("arweave"));
class ArweaveSigner extends Rsa4096Pss_1.default {
    constructor(jwk) {
        super(pem_1.jwkTopem(jwk), jwk.n);
        this.jwk = jwk;
    }
    get publicKey() {
        return base64url_1.default.toBuffer(this.pk);
    }
    sign(message) {
        return arweave_1.default.crypto.sign(this.jwk, message);
    }
    static async verify(pk, message, signature) {
        return await arweave_1.default.crypto.verify(pk, message, signature);
    }
}
exports.default = ArweaveSigner;
//# sourceMappingURL=ArweaveSigner.js.map