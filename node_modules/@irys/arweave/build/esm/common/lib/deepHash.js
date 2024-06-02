export class DeepHash {
    crypto;
    utils;
    constructor({ deps }) {
        this.crypto = deps.crypto;
        this.utils = deps.utils;
    }
    async deepHash(data) {
        if (Array.isArray(data)) {
            const tag = this.utils.concatBuffers([this.utils.stringToBuffer("list"), this.utils.stringToBuffer(data.length.toString())]);
            return await this.deepHashChunks(data, await this.crypto.hash(tag, "SHA-384"));
        }
        const tag = this.utils.concatBuffers([this.utils.stringToBuffer("blob"), this.utils.stringToBuffer(data.byteLength.toString())]);
        const taggedHash = this.utils.concatBuffers([await this.crypto.hash(tag, "SHA-384"), await this.crypto.hash(data, "SHA-384")]);
        return await this.crypto.hash(taggedHash, "SHA-384");
    }
    async deepHashChunks(chunks, acc) {
        if (chunks.length < 1)
            return acc;
        const hashPair = this.utils.concatBuffers([acc, await this.deepHash(chunks[0])]);
        const newAcc = await this.crypto.hash(hashPair, "SHA-384");
        return await this.deepHashChunks(chunks.slice(1), newAcc);
    }
}
//# sourceMappingURL=deepHash.js.map