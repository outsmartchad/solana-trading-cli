"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SolanaSigner_1 = __importDefault(require("./SolanaSigner"));
class HexSolanaSigner extends SolanaSigner_1.default {
    constructor(provider) {
        super(provider);
        this.signatureType = 4; // for solana sig type
    }
    async sign(message) {
        return super.sign(Buffer.from(Buffer.from(message).toString("hex")));
    }
    static async verify(pk, message, signature) {
        return super.verify(pk, Buffer.from(Buffer.from(message).toString("hex")), signature);
    }
}
exports.default = HexSolanaSigner;
//# sourceMappingURL=HexSolanaSigner.js.map