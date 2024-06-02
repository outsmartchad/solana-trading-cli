"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamSigner = void 0;
const stream_1 = require("stream");
const utils_1 = require("../src/utils");
const base64url_1 = __importDefault(require("base64url"));
const constants_1 = require("../src/signing/constants");
const index_1 = require("../src/index");
const constants_2 = require("../src/constants");
const parser_1 = require("../src/parser");
const crypto = __importStar(require("crypto"));
const utils_2 = require("arweave/node/lib/utils");
const deepHash_1 = require("../src/deepHash");
async function processStream(stream) {
    const reader = getReader(stream);
    let bytes = (await reader.next()).value;
    bytes = await readBytes(reader, bytes, 32);
    const itemCount = utils_1.byteArrayToLong(bytes.subarray(0, 32));
    bytes = bytes.subarray(32);
    const headersLength = 64 * itemCount;
    bytes = await readBytes(reader, bytes, headersLength);
    const headers = new Array(itemCount);
    for (let i = 0; i < headersLength; i += 64) {
        headers[i / 64] = [
            utils_1.byteArrayToLong(bytes.subarray(i, i + 32)),
            base64url_1.default(Buffer.from(bytes.subarray(i + 32, i + 64))),
        ];
    }
    bytes = bytes.subarray(headersLength);
    let offsetSum = 32 + headersLength;
    const items = [];
    for (const [length, id] of headers) {
        bytes = await readBytes(reader, bytes, index_1.MIN_BINARY_SIZE);
        // Get sig type
        bytes = await readBytes(reader, bytes, 2);
        const signatureType = utils_1.byteArrayToLong(bytes.subarray(0, 2));
        bytes = bytes.subarray(2);
        const { sigLength, pubLength, sigName } = constants_2.SIG_CONFIG[signatureType];
        // Get sig
        bytes = await readBytes(reader, bytes, sigLength);
        const signature = bytes.subarray(0, sigLength);
        bytes = bytes.subarray(sigLength);
        // Get owner
        bytes = await readBytes(reader, bytes, pubLength);
        const owner = bytes.subarray(0, pubLength);
        bytes = bytes.subarray(pubLength);
        // Get target
        bytes = await readBytes(reader, bytes, 1);
        const targetPresent = bytes[0] === 1;
        if (targetPresent)
            bytes = await readBytes(reader, bytes, 33);
        const target = targetPresent
            ? bytes.subarray(1, 33)
            : Buffer.allocUnsafe(0);
        bytes = bytes.subarray(targetPresent ? 33 : 1);
        // Get anchor
        bytes = await readBytes(reader, bytes, 1);
        const anchorPresent = bytes[0] === 1;
        if (anchorPresent)
            bytes = await readBytes(reader, bytes, 33);
        const anchor = anchorPresent
            ? bytes.subarray(1, 33)
            : Buffer.allocUnsafe(0);
        bytes = bytes.subarray(anchorPresent ? 33 : 1);
        // Get tags
        bytes = await readBytes(reader, bytes, 8);
        const tagsLength = utils_1.byteArrayToLong(bytes.subarray(0, 8));
        bytes = bytes.subarray(8);
        bytes = await readBytes(reader, bytes, 8);
        const tagsBytesLength = utils_1.byteArrayToLong(bytes.subarray(0, 8));
        bytes = bytes.subarray(8);
        bytes = await readBytes(reader, bytes, tagsBytesLength);
        const tagsBytes = bytes.subarray(0, tagsBytesLength);
        const tags = tagsLength !== 0 && tagsBytesLength !== 0
            ? parser_1.tagsParser.fromBuffer(Buffer.from(tagsBytes))
            : [];
        if (tags.length !== tagsLength)
            throw new Error("Tags lengths don't match");
        bytes = bytes.subarray(tagsBytesLength);
        const transform = new stream_1.Transform();
        transform._transform = function (chunk, _, done) {
            this.push(chunk);
            done();
        };
        // Verify signature
        const signatureData = deepHash_1.deepHash([
            utils_2.stringToBuffer("dataitem"),
            utils_2.stringToBuffer("1"),
            utils_2.stringToBuffer(signatureType.toString()),
            owner,
            target,
            anchor,
            tagsBytes,
            transform,
        ]);
        // Get offset of data start and length of data
        const dataOffset = 2 +
            sigLength +
            pubLength +
            (targetPresent ? 33 : 1) +
            (anchorPresent ? 33 : 1) +
            16 +
            tagsBytesLength;
        const dataSize = length - dataOffset;
        if (bytes.byteLength > dataSize) {
            transform.write(bytes.subarray(0, dataSize));
            bytes = bytes.subarray(dataSize);
        }
        else {
            let skipped = bytes.byteLength;
            transform.write(bytes);
            while (dataSize > skipped) {
                bytes = (await reader.next()).value;
                if (!bytes) {
                    throw new Error(`Not enough data bytes  expected: ${dataSize} received: ${skipped}`);
                }
                skipped += bytes.byteLength;
                if (skipped > dataSize)
                    transform.write(bytes.subarray(0, bytes.byteLength - (skipped - dataSize)));
                else
                    transform.write(bytes);
            }
            bytes = bytes.subarray(bytes.byteLength - (skipped - dataSize));
        }
        transform.end();
        // Check id
        if (id !== base64url_1.default(crypto.createHash("sha256").update(signature).digest()))
            throw new Error("ID doesn't match signature");
        const Signer = constants_1.indexToType[signatureType];
        if (!(await Signer.verify(owner, (await signatureData), signature)))
            throw new Error("Invalid signature");
        items.push({
            id,
            sigName,
            signature: base64url_1.default(Buffer.from(signature)),
            target: base64url_1.default(Buffer.from(target)),
            anchor: base64url_1.default(Buffer.from(anchor)),
            owner: base64url_1.default(Buffer.from(owner)),
            tags,
            dataOffset: offsetSum + dataOffset,
            dataSize,
        });
        offsetSum += dataOffset + dataSize;
    }
    return items;
}
exports.default = processStream;
/**
 * Signs a stream (requires two instances/read passes)
 * @param s1 Stream to sign - same as s2
 * @param s2 Stream to sign - same as s1
 * @param signer Signer to use to sign the stream
 * @param opts Optional options to apply to the stream (same as DataItem)
 */
async function streamSigner(s1, s2, signer, opts) {
    const header = index_1.createData("", signer, opts);
    const output = new stream_1.PassThrough();
    const parts = [
        utils_2.stringToBuffer("dataitem"),
        utils_2.stringToBuffer("1"),
        utils_2.stringToBuffer(header.signatureType.toString()),
        header.rawOwner,
        header.rawTarget,
        header.rawAnchor,
        header.rawTags,
        s1
    ];
    const hash = await deepHash_1.deepHash(parts);
    const sigBytes = Buffer.from(await signer.sign(hash));
    header.setSignature(sigBytes);
    output.write(header.getRaw());
    return s2.pipe(output);
}
exports.streamSigner = streamSigner;
async function readBytes(reader, buffer, length) {
    if (buffer.byteLength > length)
        return buffer;
    const { done, value } = await reader.next();
    if (done && !value)
        throw new Error("Invalid buffer");
    return readBytes(reader, Buffer.concat([buffer, value]), length);
}
async function* getReader(s) {
    for await (const chunk of s) {
        yield chunk;
    }
}
//# sourceMappingURL=index.js.map