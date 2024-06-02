import { createPublicKey } from "crypto";
import { default as nodeDriver } from "@irys/arweave/node/node-driver";
// import CryptoInterface from "arweave/node/lib/crypto/crypto-interface.js";
export { stringToBuffer, concatBuffers } from "@irys/arweave/common/lib/utils";
export { default as Transaction } from "@irys/arweave/common/lib/transaction";
export { deepHash } from "./deepHash.js";
export { default as Arweave } from "@irys/arweave/node";
// hack as ESM won't unpack .default CJS imports, so we do so dynamically
// eslint-disable-next-line @typescript-eslint/dot-notation
const driver = nodeDriver["default"] ? nodeDriver["default"] : nodeDriver;
export class CryptoDriver extends driver {
    getPublicKey(jwk) {
        return createPublicKey({
            key: this.jwkToPem(jwk),
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
let driverInstance;
export function getCryptoDriver() {
    return (driverInstance ??= new CryptoDriver());
}
//# sourceMappingURL=nodeUtils.js.map