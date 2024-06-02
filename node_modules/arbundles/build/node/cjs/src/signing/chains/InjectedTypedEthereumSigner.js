"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectedTypedEthereumSigner = void 0;
const constants_1 = require("../../constants");
const wallet_1 = require("@ethersproject/wallet");
const TypedEthereumSigner_1 = require("./TypedEthereumSigner");
class InjectedTypedEthereumSigner {
    constructor(provider) {
        this.ownerLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.TYPEDETHEREUM].pubLength;
        this.signatureLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.TYPEDETHEREUM].sigLength;
        this.signatureType = constants_1.SignatureConfig.TYPEDETHEREUM;
        this.signer = provider.getSigner();
    }
    ready() {
        return __awaiter(this, void 0, void 0, function* () {
            this.address = (yield this.signer.getAddress()).toString().toLowerCase();
            this.publicKey = Buffer.from(this.address); // pk *is* address
        });
    }
    sign(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const signature = yield this.signer._signTypedData(TypedEthereumSigner_1.domain, TypedEthereumSigner_1.types, {
                address: this.address,
                "Transaction hash": message,
            });
            return Buffer.from(signature.slice(2), "hex"); // trim leading 0x, convert to hex.
        });
    }
    static verify(pk, message, signature) {
        const address = pk.toString();
        const addr = (0, wallet_1.verifyTypedData)(TypedEthereumSigner_1.domain, TypedEthereumSigner_1.types, { address, "Transaction hash": message }, signature);
        return address.toLowerCase() === addr.toLowerCase();
    }
}
exports.InjectedTypedEthereumSigner = InjectedTypedEthereumSigner;
exports.default = InjectedTypedEthereumSigner;
//# sourceMappingURL=InjectedTypedEthereumSigner.js.map