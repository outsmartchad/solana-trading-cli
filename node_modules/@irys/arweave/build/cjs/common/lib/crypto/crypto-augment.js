"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.augmentCrypto = void 0;
const utils_1 = require("../utils");
function augmentCrypto(crypto, augments) {
    const crypt = crypto;
    crypt.deepHash = new augments.deepHash({ deps: { utils: { stringToBuffer: utils_1.stringToBuffer, concatBuffers: utils_1.concatBuffers }, crypto } });
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
exports.augmentCrypto = augmentCrypto;
//# sourceMappingURL=crypto-augment.js.map