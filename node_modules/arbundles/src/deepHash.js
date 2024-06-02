"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashStream = exports.deepHashChunks = exports.deepHash = void 0;
// In TypeScript 3.7, could be written as a single type:
// `type DeepHashChunk = Uint8Array | DeepHashChunk[];`
const arweave_1 = __importDefault(require("arweave"));
const crypto_1 = require("crypto");
async function deepHash(data) {
    if (typeof data[Symbol.asyncIterator] ===
        "function") {
        const _data = data;
        const context = crypto_1.createHash("sha384");
        let length = 0;
        for await (const chunk of _data) {
            length += chunk.byteLength;
            context.update(chunk);
        }
        const tag = arweave_1.default.utils.concatBuffers([
            arweave_1.default.utils.stringToBuffer("blob"),
            arweave_1.default.utils.stringToBuffer(length.toString()),
        ]);
        const taggedHash = arweave_1.default.utils.concatBuffers([
            await arweave_1.default.crypto.hash(tag, "SHA-384"),
            context.digest(),
        ]);
        return await arweave_1.default.crypto.hash(taggedHash, "SHA-384");
    }
    else if (Array.isArray(data)) {
        const tag = arweave_1.default.utils.concatBuffers([
            arweave_1.default.utils.stringToBuffer("list"),
            arweave_1.default.utils.stringToBuffer(data.length.toString()),
        ]);
        return await deepHashChunks(data, await arweave_1.default.crypto.hash(tag, "SHA-384"));
    }
    const _data = data;
    const tag = arweave_1.default.utils.concatBuffers([
        arweave_1.default.utils.stringToBuffer("blob"),
        arweave_1.default.utils.stringToBuffer(_data.byteLength.toString()),
    ]);
    const taggedHash = arweave_1.default.utils.concatBuffers([
        await arweave_1.default.crypto.hash(tag, "SHA-384"),
        await arweave_1.default.crypto.hash(_data, "SHA-384"),
    ]);
    return await arweave_1.default.crypto.hash(taggedHash, "SHA-384");
}
exports.deepHash = deepHash;
async function deepHashChunks(chunks, acc) {
    if (chunks.length < 1) {
        return acc;
    }
    const hashPair = arweave_1.default.utils.concatBuffers([
        acc,
        await deepHash(chunks[0]),
    ]);
    const newAcc = await arweave_1.default.crypto.hash(hashPair, "SHA-384");
    return await deepHashChunks(chunks.slice(1), newAcc);
}
exports.deepHashChunks = deepHashChunks;
async function hashStream(stream) {
    const context = crypto_1.createHash("sha384");
    for await (const chunk of stream) {
        context.update(chunk);
    }
    return context.digest();
}
exports.hashStream = hashStream;
//# sourceMappingURL=deepHash.js.map