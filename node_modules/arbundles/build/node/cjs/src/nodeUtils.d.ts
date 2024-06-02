import { default as nodeDriver } from "@irys/arweave/node/node-driver";
import type { JWKInterface } from "./interface-jwk";
export { stringToBuffer, concatBuffers } from "@irys/arweave/common/lib/utils";
export { default as Transaction } from "@irys/arweave/common/lib/transaction";
export { deepHash } from "./deepHash";
export type { CreateTransactionInterface } from "@irys/arweave/common/arweave";
export { default as Arweave } from "@irys/arweave/node";
declare const driver: typeof nodeDriver;
export declare class CryptoDriver extends driver {
    getPublicKey(jwk: JWKInterface): string;
}
export declare function getCryptoDriver(): CryptoDriver;
