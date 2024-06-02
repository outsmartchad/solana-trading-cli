import type { DeepHash } from "../deepHash.js";
import type CryptoInterface from "./crypto-interface.js";
import type { Class } from "../../types.js";
export type AugmentedCrypto = {
    deepHash: DeepHash;
} & CryptoInterface;
export declare function augmentCrypto(crypto: CryptoInterface, augments: {
    deepHash: Class<DeepHash, ConstructorParameters<typeof DeepHash>>;
}): AugmentedCrypto;
