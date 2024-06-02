import { concatBuffers, stringToBuffer } from "../utils.js";
export function augmentCrypto(crypto, augments) {
    const crypt = crypto;
    crypt.deepHash = new augments.deepHash({ deps: { utils: { stringToBuffer, concatBuffers }, crypto } });
    return crypt;
    //   crypto: Class<CryptoInterface>,
    //   augments: { deepHash: Class<DeepHash, ConstructorParameters<typeof DeepHash>> },
    // ): AugmentedCrypto {
    //   const cryptoAugment = class Crypto extends crypto implements CryptoInterface {
    //     public deepHash: DeepHash;
    //     constructor() {
    //       super();
    //       this.deepHash = new augments.deepHash({ deps: { crypto: this, utils: ArweaveUtils } });
    //     }
    //   };
    //   return new cryptoAugment();
}
//# sourceMappingURL=crypto-augment.js.map