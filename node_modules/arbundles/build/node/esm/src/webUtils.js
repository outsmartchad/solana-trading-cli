import webDriver from "@irys/arweave/web/webcrypto-driver";
export { stringToBuffer, concatBuffers } from "@irys/arweave/common/lib/utils";
export { deepHash } from "./deepHash.js";
export { Arweave } from "@irys/arweave/web/arweave";
// import { sha384 as SHA384 } from "sha";
// export { default as Arweave } from "arweave/web/index.js";
// import type { Hash } from "crypto";
// export const sha384 = (): Hash => SHA384("sha384");
// hack as ESM won't unpack .default CJS imports, so we do so dynamically
// eslint-disable-next-line @typescript-eslint/dot-notation
const driver = webDriver["default"] ? webDriver["default"] : webDriver;
export class CryptoDriver extends driver {
    getPublicKey(_jwk) {
        throw new Error("Unimplemented");
    }
}
let driverInstance;
export function getCryptoDriver() {
    return (driverInstance ??= new CryptoDriver());
}
//# sourceMappingURL=webUtils.js.map