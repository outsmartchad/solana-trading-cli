"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const arweave_1 = __importDefault(require("arweave"));
const base64url_1 = __importDefault(require("base64url"));
const constants_1 = require("../../constants");
class Rsa4096Pss {
    constructor(_key, pk) {
        this._key = _key;
        this.pk = pk;
        this.signatureType = 1;
        this.ownerLength = constants_1.SIG_CONFIG[1].pubLength;
        this.signatureLength = constants_1.SIG_CONFIG[1].sigLength;
        if (!pk) {
            this.pk = crypto_1.createPublicKey({
                key: _key,
                type: "pkcs1",
                format: "pem",
            })
                .export({
                format: "pem",
                type: "pkcs1",
            })
                .toString();
        }
    }
    get publicKey() {
        return this._publicKey;
    }
    sign(message) {
        return crypto_1.createSign("sha256").update(message).sign({
            key: this._key,
            padding: crypto_1.constants.RSA_PKCS1_PSS_PADDING,
        });
    }
    static async verify(pk, message, signature) {
        return await arweave_1.default.crypto.verify(Buffer.isBuffer(pk) ? base64url_1.default.encode(pk) : pk, message, signature);
    }
}
exports.default = Rsa4096Pss;
//# sourceMappingURL=Rsa4096Pss.js.map