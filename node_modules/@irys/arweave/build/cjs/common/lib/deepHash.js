"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepHash = void 0;
class DeepHash {
    constructor({ deps }) {
        this.crypto = deps.crypto;
        this.utils = deps.utils;
    }
    deepHash(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Array.isArray(data)) {
                const tag = this.utils.concatBuffers([this.utils.stringToBuffer("list"), this.utils.stringToBuffer(data.length.toString())]);
                return yield this.deepHashChunks(data, yield this.crypto.hash(tag, "SHA-384"));
            }
            const tag = this.utils.concatBuffers([this.utils.stringToBuffer("blob"), this.utils.stringToBuffer(data.byteLength.toString())]);
            const taggedHash = this.utils.concatBuffers([yield this.crypto.hash(tag, "SHA-384"), yield this.crypto.hash(data, "SHA-384")]);
            return yield this.crypto.hash(taggedHash, "SHA-384");
        });
    }
    deepHashChunks(chunks, acc) {
        return __awaiter(this, void 0, void 0, function* () {
            if (chunks.length < 1)
                return acc;
            const hashPair = this.utils.concatBuffers([acc, yield this.deepHash(chunks[0])]);
            const newAcc = yield this.crypto.hash(hashPair, "SHA-384");
            return yield this.deepHashChunks(chunks.slice(1), newAcc);
        });
    }
}
exports.DeepHash = DeepHash;
//# sourceMappingURL=deepHash.js.map