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
exports.signedFileStream = exports.getTags = exports.getAnchor = exports.getTarget = exports.getOwner = exports.getSignature = exports.getId = exports.getHeaders = exports.getHeaderAt = exports.numberOfItems = exports.fileToJson = void 0;
const fs = __importStar(require("fs"));
const util_1 = require("util");
const utils_1 = require("../src/utils");
const parser_1 = require("../src/parser");
const base64url_1 = __importDefault(require("base64url"));
const stream_1 = require("../stream");
const read = util_1.promisify(fs.read);
const fileToFd = async (f) => typeof f === "string" ? await fs.promises.open(f, "r") : f;
async function fileToJson(filename) {
    const fd = await fs.promises.open(filename, "r").then((handle) => handle.fd);
    let tagsStart = 512 + 512 + 2;
    const targetPresent = await read(fd, Buffer.alloc(1), 1024, 64, null).then((value) => value.buffer[0] == 1);
    tagsStart += targetPresent ? 32 : 0;
    const anchorPresentByte = targetPresent ? 1057 : 1025;
    const anchorPresent = await read(fd, Buffer.alloc(1), anchorPresentByte, 64, null).then((value) => value.buffer[0] == 1);
    tagsStart += anchorPresent ? 32 : 0;
    const numberOfTags = utils_1.byteArrayToLong(await read(fd, Buffer.alloc(8), tagsStart, 8, 0).then((value) => value.buffer));
    let tags = [];
    if (numberOfTags > 0) {
        const numberOfTagBytesArray = await read(fd, Buffer.alloc(8), tagsStart + 8, 8, 0).then((value) => value.buffer);
        const numberOfTagBytes = utils_1.byteArrayToLong(numberOfTagBytesArray);
        const tagBytes = await read(fd, Buffer.alloc(8), tagsStart + 16, numberOfTagBytes, 0).then((value) => value.buffer);
        tags = parser_1.tagsParser.fromBuffer(tagBytes);
    }
    const id = filename;
    const owner = "";
    const target = "";
    const data_size = 0;
    const fee = 0;
    const signature = "";
    return {
        id,
        owner,
        tags,
        target,
        data_size,
        fee,
        signature,
    };
}
exports.fileToJson = fileToJson;
async function numberOfItems(file) {
    const fd = await fileToFd(file);
    const headerBuffer = await read(fd.fd, Buffer.allocUnsafe(32), 0, 32, 0).then((v) => v.buffer);
    await fd.close();
    return utils_1.byteArrayToLong(headerBuffer);
}
exports.numberOfItems = numberOfItems;
async function getHeaderAt(file, index) {
    const fd = await fileToFd(file);
    const headerBuffer = await read(fd.fd, Buffer.alloc(64), 0, 64, 32 + 64 * index).then((v) => v.buffer);
    return {
        offset: utils_1.byteArrayToLong(headerBuffer.subarray(0, 32)),
        id: base64url_1.default.encode(headerBuffer.subarray(32, 64)),
    };
}
exports.getHeaderAt = getHeaderAt;
async function* getHeaders(file) {
    const count = await numberOfItems(file);
    for (let i = 0; i < count; i++) {
        yield getHeaderAt(file, i);
    }
}
exports.getHeaders = getHeaders;
async function getId(file, options) {
    var _a;
    const fd = await fileToFd(file);
    const offset = (_a = options.offset) !== null && _a !== void 0 ? _a : 0;
    const buffer = await read(fd.fd, Buffer.allocUnsafe(512), offset, 512, null).then((r) => r.buffer);
    await fd.close();
    return buffer;
}
exports.getId = getId;
async function getSignature(file, options) {
    var _a;
    const fd = await fileToFd(file);
    const offset = (_a = options.offset) !== null && _a !== void 0 ? _a : 0;
    const buffer = await read(fd.fd, Buffer.allocUnsafe(512), offset, 512, null).then((r) => r.buffer);
    await fd.close();
    return buffer;
}
exports.getSignature = getSignature;
async function getOwner(file, options) {
    var _a;
    const fd = await fileToFd(file);
    const offset = (_a = options.offset) !== null && _a !== void 0 ? _a : 0;
    const buffer = await read(fd.fd, Buffer.allocUnsafe(512), offset + 512, 512, null).then((r) => r.buffer);
    await fd.close();
    return base64url_1.default.encode(buffer);
}
exports.getOwner = getOwner;
async function getTarget(file, options) {
    var _a;
    const fd = await fileToFd(file);
    const offset = (_a = options.offset) !== null && _a !== void 0 ? _a : 0;
    const targetStart = offset + 1024;
    const targetPresent = await read(fd.fd, Buffer.allocUnsafe(1), targetStart, 1, null).then((value) => value.buffer[0] == 1);
    if (!targetPresent) {
        return undefined;
    }
    const buffer = await read(fd.fd, Buffer.allocUnsafe(32), targetStart + 1, 32, null).then((r) => r.buffer);
    await fd.close();
    return base64url_1.default.encode(buffer);
}
exports.getTarget = getTarget;
async function getAnchor(file, options) {
    var _a;
    const fd = await fileToFd(file);
    const offset = (_a = options.offset) !== null && _a !== void 0 ? _a : 0;
    const targetPresent = await read(fd.fd, Buffer.allocUnsafe(1), 1024, 1, null).then((value) => value.buffer[0] == 1);
    let anchorStart = offset + 1025;
    if (targetPresent) {
        anchorStart += 32;
    }
    const anchorPresent = await read(fd.fd, Buffer.allocUnsafe(1), anchorStart, 1, null).then((value) => value.buffer[0] == 1);
    if (!anchorPresent) {
        return undefined;
    }
    const buffer = await read(fd.fd, Buffer.allocUnsafe(32), anchorStart + 1, 32, null).then((r) => r.buffer);
    await fd.close();
    return base64url_1.default.encode(buffer);
}
exports.getAnchor = getAnchor;
async function getTags(file, options) {
    var _a, _b;
    const fd = await fileToFd(file);
    const offset = (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : 0;
    let tagsStart = 512 + 512 + 2 + ((_b = options === null || options === void 0 ? void 0 : options.offset) !== null && _b !== void 0 ? _b : 0);
    const targetPresent = await read(fd.fd, Buffer.allocUnsafe(1), 0, 1, offset + 1024).then((value) => value.buffer[0] == 1);
    tagsStart += targetPresent ? 32 : 0;
    const anchorPresentByte = offset + (targetPresent ? 1057 : 1025);
    const anchorPresent = await read(fd.fd, Buffer.allocUnsafe(1), 0, 1, anchorPresentByte).then((value) => value.buffer[0] == 1);
    tagsStart += anchorPresent ? 32 : 0;
    const numberOfTags = utils_1.byteArrayToLong(await read(fd.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart).then((value) => value.buffer));
    if (numberOfTags == 0) {
        return [];
    }
    const numberOfTagBytesArray = await read(fd.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart + 8).then((value) => value.buffer);
    const numberOfTagBytes = utils_1.byteArrayToLong(numberOfTagBytesArray);
    const tagBytes = await read(fd.fd, Buffer.allocUnsafe(numberOfTagBytes), 0, numberOfTagBytes, tagsStart + 16).then((value) => value.buffer);
    await fd.close();
    return parser_1.tagsParser.fromBuffer(tagBytes);
}
exports.getTags = getTags;
async function signedFileStream(path, signer, opts) {
    return stream_1.streamSigner(fs.createReadStream(path), fs.createReadStream(path), signer, opts);
}
exports.signedFileStream = signedFileStream;
//# sourceMappingURL=file.js.map