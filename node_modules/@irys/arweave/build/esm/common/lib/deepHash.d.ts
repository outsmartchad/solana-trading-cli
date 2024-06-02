import type { stringToBuffer, concatBuffers } from "./utils.js";
import type CryptoInterface from "./crypto/crypto-interface.js";
type DeepHashChunk = Uint8Array | DeepHashChunks;
type DeepHashChunks = object & DeepHashChunk[];
type DeepHashDeps = {
    utils: {
        stringToBuffer: typeof stringToBuffer;
        concatBuffers: typeof concatBuffers;
    };
    crypto: Pick<CryptoInterface, "hash">;
};
export declare class DeepHash {
    protected crypto: DeepHashDeps["crypto"];
    protected utils: DeepHashDeps["utils"];
    constructor({ deps }: {
        deps: {
            utils: DeepHashDeps["utils"];
            crypto: DeepHashDeps["crypto"];
        };
    });
    deepHash(data: DeepHashChunk): Promise<Uint8Array>;
    deepHashChunks(chunks: DeepHashChunks, acc: Uint8Array): Promise<Uint8Array>;
}
export {};
