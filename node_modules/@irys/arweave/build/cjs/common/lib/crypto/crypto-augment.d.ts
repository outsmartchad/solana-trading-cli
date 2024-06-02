import type { DeepHash } from "../deepHash";
import type CryptoInterface from "./crypto-interface";
import type { Class } from "../../types";
export type AugmentedCrypto = {
    deepHash: DeepHash;
} & CryptoInterface;
export declare function augmentCrypto(crypto: CryptoInterface, augments: {
    deepHash: Class<DeepHash, ConstructorParameters<typeof DeepHash>>;
}): AugmentedCrypto;
