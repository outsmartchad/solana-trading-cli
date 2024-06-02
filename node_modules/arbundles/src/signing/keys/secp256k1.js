"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base64url_1 = __importDefault(require("base64url"));
const secp256k1_1 = __importDefault(require("secp256k1"));
const constants_1 = require("../../constants");
const keccak256_1 = __importDefault(require("../keccak256"));
class Secp256k1 {
    constructor(_key, pk) {
        this._key = _key;
        this.ownerLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.ETHEREUM].pubLength;
        this.signatureLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.ETHEREUM].sigLength;
        this.signatureType = constants_1.SignatureConfig.ETHEREUM;
        this.pk = pk.toString("hex");
    }
    get publicKey() {
        return Buffer.alloc(0);
    }
    get key() {
        return Buffer.from(this._key, "hex");
    }
    static async verify(pk, message, signature) {
        let p = pk;
        if (typeof pk === "string")
            p = base64url_1.default.toBuffer(pk);
        let verified = false;
        try {
            verified = secp256k1_1.default.ecdsaVerify(signature, keccak256_1.default(Buffer.from(message)), p);
            // eslint-disable-next-line no-empty
        }
        catch (e) { }
        return verified;
    }
    sign(message) {
        return secp256k1_1.default.ecdsaSign(keccak256_1.default(Buffer.from(message)), Buffer.from(this.key)).signature;
    }
}
exports.default = Secp256k1;
//# sourceMappingURL=secp256k1.js.map