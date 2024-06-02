import type { JWKInterface } from "./interface-jwk.js";
export type { default as Transaction } from "@irys/arweave/common/lib/transaction";
export type { CreateTransactionInterface } from "@irys/arweave/common/arweave";
import webDriver from "@irys/arweave/web/webcrypto-driver";
export { stringToBuffer, concatBuffers } from "@irys/arweave/common/lib/utils";
export { deepHash } from "./deepHash.js";
export { Arweave } from "@irys/arweave/web/arweave";
declare const driver: typeof webDriver;
export declare class CryptoDriver extends driver {
    getPublicKey(_jwk: JWKInterface): string;
}
export declare function getCryptoDriver(): CryptoDriver;
