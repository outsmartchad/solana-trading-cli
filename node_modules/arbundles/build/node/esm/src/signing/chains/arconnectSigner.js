import { SignatureConfig, SIG_CONFIG } from "../../constants.js";
import base64url from "base64url";
import { getCryptoDriver } from "../../nodeUtils.js";
export default class InjectedArweaveSigner {
    signer;
    publicKey;
    ownerLength = SIG_CONFIG[SignatureConfig.ARWEAVE].pubLength;
    signatureLength = SIG_CONFIG[SignatureConfig.ARWEAVE].sigLength;
    signatureType = SignatureConfig.ARWEAVE;
    arweave;
    constructor(windowArweaveWallet, arweave) {
        this.signer = windowArweaveWallet;
        this.arweave = arweave;
    }
    async setPublicKey() {
        const arOwner = await this.signer.getActivePublicKey();
        this.publicKey = base64url.toBuffer(arOwner);
    }
    async sign(message) {
        if (!this.publicKey) {
            await this.setPublicKey();
        }
        const algorithm = {
            name: "RSA-PSS",
            saltLength: 32,
        };
        const signature = await this.signer.signature(message, algorithm);
        const buf = new Uint8Array(Object.values(signature).map((v) => +v));
        return buf;
    }
    static async verify(pk, message, signature) {
        return await getCryptoDriver().verify(pk, message, signature);
    }
}
//# sourceMappingURL=arconnectSigner.js.map