"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const constants_1 = require("../../constants");
class InjectedEthereumSigner {
    constructor(provider) {
        this.ownerLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.ETHEREUM].pubLength;
        this.signatureLength = constants_1.SIG_CONFIG[constants_1.SignatureConfig.ETHEREUM].sigLength;
        this.signatureType = constants_1.SignatureConfig.ETHEREUM;
        this.signer = provider.getSigner();
    }
    async setPublicKey() {
        const address = "sign this message to connect to Bundlr.Network";
        const signedMsg = await this.signer.signMessage(address);
        const hash = await ethers_1.ethers.utils.hashMessage(address);
        const recoveredKey = ethers_1.ethers.utils.recoverPublicKey(ethers_1.ethers.utils.arrayify(hash), signedMsg);
        this.publicKey = Buffer.from(ethers_1.ethers.utils.arrayify(recoveredKey));
    }
    async sign(message) {
        if (!this.publicKey) {
            await this.setPublicKey();
        }
        const sig = await this.signer.signMessage(message);
        return Buffer.from(sig.slice(2), "hex");
    }
    static verify(pk, message, signature) {
        const address = ethers_1.ethers.utils.computeAddress(pk);
        return ethers_1.ethers.utils.verifyMessage(message, signature) === address;
    }
}
exports.default = InjectedEthereumSigner;
//# sourceMappingURL=injectedEthereumSigner.js.map