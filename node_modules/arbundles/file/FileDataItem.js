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
const base64url_1 = __importDefault(require("base64url"));
const fs = __importStar(require("fs"));
const utils_1 = require("../src/utils");
const parser_1 = require("../src/parser");
const src_1 = require("../src");
const utils_2 = require("arweave/node/lib/utils");
const arweave_1 = __importDefault(require("arweave"));
const util_1 = require("util");
const signing_1 = require("../src/signing");
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../src/constants");
const write = util_1.promisify(fs.write);
const read = util_1.promisify(fs.read);
class FileDataItem {
    constructor(filename, id) {
        this.filename = filename;
        this._id = id;
    }
    async signatureLength() {
        var _a;
        const length = (_a = constants_1.SIG_CONFIG[await this.signatureType()]) === null || _a === void 0 ? void 0 : _a.sigLength;
        if (!length)
            throw new Error("Signature type not supported");
        return length;
    }
    async ownerLength() {
        var _a;
        const length = (_a = constants_1.SIG_CONFIG[await this.signatureType()]) === null || _a === void 0 ? void 0 : _a.pubLength;
        if (!length)
            throw new Error("Signature type not supported");
        return length;
    }
    get id() {
        return base64url_1.default.encode(this._id);
    }
    get rawId() {
        if (this._id) {
            return this._id;
        }
        throw new Error("ID is not set");
    }
    set rawId(id) {
        this._id = id;
    }
    static isDataItem(obj) {
        return obj.filename && typeof obj.filename === "string";
    }
    static async verify(filename) {
        const handle = await fs.promises.open(filename, "r");
        const item = new FileDataItem(filename);
        const sigType = await item.signatureType();
        const tagsStart = await item.getTagsStart();
        const numberOfTags = await read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart).then((r) => utils_1.byteArrayToLong(r.buffer));
        const numberOfTagsBytes = await read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart + 8).then((r) => utils_1.byteArrayToLong(r.buffer));
        if (numberOfTagsBytes > 4096) {
            await handle.close();
            return false;
        }
        const tagsBytes = await read(handle.fd, Buffer.allocUnsafe(numberOfTagsBytes), 0, numberOfTagsBytes, tagsStart + 16).then((r) => r.buffer);
        if (numberOfTags > 0) {
            try {
                parser_1.tagsParser.fromBuffer(tagsBytes);
            }
            catch (e) {
                await handle.close();
                return false;
            }
        }
        const Signer = signing_1.indexToType[sigType];
        const owner = await item.rawOwner();
        const signatureData = await src_1.deepHash([
            utils_2.stringToBuffer("dataitem"),
            utils_2.stringToBuffer("1"),
            utils_2.stringToBuffer(sigType.toString()),
            owner,
            await item.rawTarget(),
            await item.rawAnchor(),
            await item.rawTags(),
            fs.createReadStream(filename, {
                start: await item.dataStart(),
            }),
        ]);
        const sig = await item.rawSignature();
        if (!(await Signer.verify(owner, signatureData, sig))) {
            await handle.close();
            return false;
        }
        await handle.close();
        return true;
    }
    isValid() {
        return FileDataItem.verify(this.filename);
    }
    isSigned() {
        return this._id !== undefined;
    }
    async size() {
        return await fs.promises.stat(this.filename).then((r) => r.size);
    }
    async signatureType() {
        const handle = await fs.promises.open(this.filename, "r");
        const buffer = await read(handle.fd, Buffer.allocUnsafe(2), 0, 2, 0).then((r) => r.buffer);
        await handle.close();
        return utils_1.byteArrayToLong(buffer);
    }
    async rawSignature() {
        const handle = await fs.promises.open(this.filename, "r");
        const length = await this.signatureLength();
        const buffer = await read(handle.fd, Buffer.alloc(length), 0, length, 2).then((r) => r.buffer);
        await handle.close();
        return buffer;
    }
    async signature() {
        return base64url_1.default.encode(await this.rawSignature());
    }
    async rawOwner() {
        const handle = await fs.promises.open(this.filename, "r");
        const length = await this.ownerLength();
        const buffer = await read(handle.fd, Buffer.allocUnsafe(length), 0, length, 2 + (await this.signatureLength())).then((r) => r.buffer);
        await handle.close();
        return buffer;
    }
    async owner() {
        return base64url_1.default.encode(await this.rawOwner());
    }
    async rawTarget() {
        const handle = await fs.promises.open(this.filename, "r");
        const targetStart = await this.getTargetStart();
        const targetPresentBuffer = await read(handle.fd, Buffer.allocUnsafe(1), 0, 1, targetStart).then((r) => r.buffer);
        const targetPresent = targetPresentBuffer[0] === 1;
        if (targetPresent) {
            const targetBuffer = await read(handle.fd, Buffer.allocUnsafe(32), 0, 32, targetStart + 1).then((r) => r.buffer);
            await handle.close();
            return targetBuffer;
        }
        await handle.close();
        return Buffer.allocUnsafe(0);
    }
    async target() {
        return base64url_1.default.encode(await this.rawTarget());
    }
    async getTargetStart() {
        return 2 + (await this.signatureLength()) + (await this.ownerLength());
    }
    async rawAnchor() {
        const [anchorPresent, anchorStart] = await this.anchorStart();
        if (anchorPresent) {
            const handle = await fs.promises.open(this.filename, "r");
            const anchorBuffer = await read(handle.fd, Buffer.allocUnsafe(32), 0, 32, anchorStart + 1).then((r) => r.buffer);
            await handle.close();
            return anchorBuffer;
        }
        return Buffer.allocUnsafe(0);
    }
    async anchor() {
        return (await this.rawAnchor()).toString();
    }
    async rawTags() {
        const handle = await fs.promises.open(this.filename, "r");
        const tagsStart = await this.getTagsStart();
        const numberOfTagsBuffer = await read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart).then((r) => r.buffer);
        const numberOfTags = utils_1.byteArrayToLong(numberOfTagsBuffer);
        if (numberOfTags === 0) {
            await handle.close();
            return Buffer.allocUnsafe(0);
        }
        const numberOfTagsBytesBuffer = await read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart + 8).then((r) => r.buffer);
        const numberOfTagsBytes = utils_1.byteArrayToLong(numberOfTagsBytesBuffer);
        if (numberOfTagsBytes > 4096) {
            await handle.close();
            throw new Error("Tags too large");
        }
        const tagsBytes = await read(handle.fd, Buffer.allocUnsafe(numberOfTagsBytes), 0, numberOfTagsBytes, tagsStart + 16).then((r) => r.buffer);
        await handle.close();
        return tagsBytes;
    }
    async tags() {
        const tagsBytes = await this.rawTags();
        if (tagsBytes.byteLength === 0)
            return [];
        return parser_1.tagsParser.fromBuffer(tagsBytes);
    }
    async rawData() {
        const dataStart = await this.dataStart();
        const size = await this.size();
        const dataSize = size - dataStart;
        if (dataSize === 0) {
            return Buffer.allocUnsafe(0);
        }
        const handle = await fs.promises.open(this.filename, "r");
        const dataBuffer = await read(handle.fd, Buffer.allocUnsafe(dataSize), 0, dataSize, dataStart).then((r) => r.buffer);
        await handle.close();
        return dataBuffer;
    }
    async data() {
        return base64url_1.default.encode(await this.rawData());
    }
    async sign(signer) {
        const dataStart = await this.dataStart();
        const signatureData = await src_1.deepHash([
            utils_2.stringToBuffer("dataitem"),
            utils_2.stringToBuffer("1"),
            utils_2.stringToBuffer((await this.signatureType()).toString()),
            await this.rawOwner(),
            await this.rawTarget(),
            await this.rawAnchor(),
            await this.rawTags(),
            fs.createReadStream(this.filename, { start: dataStart }),
        ]);
        const signatureBytes = await signer.sign(signatureData);
        const idBytes = await arweave_1.default.crypto.hash(signatureBytes);
        const handle = await fs.promises.open(this.filename, "r+");
        await write(handle.fd, signatureBytes, 0, await this.signatureLength(), 2);
        this.rawId = Buffer.from(idBytes);
        await handle.close();
        return Buffer.from(idBytes);
    }
    /**
     * @deprecated Since version 0.3.0. Will be deleted in version 0.4.0. Use @bundlr-network/client package instead to interact with Bundlr
     */
    async sendToBundler(bundler) {
        const headers = {
            "Content-Type": "application/octet-stream",
        };
        if (!this.isSigned())
            throw new Error("You must sign before sending to bundler");
        const response = await axios_1.default.post(`${bundler}/tx`, fs.createReadStream(this.filename), {
            headers,
            timeout: 100000,
            maxBodyLength: Infinity,
            validateStatus: (status) => (status > 200 && status < 300) || status !== 402,
        });
        if (response.status === 402)
            throw new Error("Not enough funds to send data");
        return response;
    }
    async getTagsStart() {
        const [anchorPresent, anchorStart] = await this.anchorStart();
        let tagsStart = anchorStart;
        tagsStart += anchorPresent ? 33 : 1;
        return tagsStart;
    }
    async dataStart() {
        const handle = await fs.promises.open(this.filename, "r");
        const tagsStart = await this.getTagsStart();
        const numberOfTagsBytesBuffer = await read(handle.fd, Buffer.allocUnsafe(8), 0, 8, tagsStart + 8).then((r) => r.buffer);
        const numberOfTagsBytes = utils_1.byteArrayToLong(numberOfTagsBytesBuffer);
        await handle.close();
        return tagsStart + 16 + numberOfTagsBytes;
    }
    async anchorStart() {
        const targetStart = await this.getTargetStart();
        const handle = await fs.promises.open(this.filename, "r");
        const targetPresentBuffer = await read(handle.fd, Buffer.allocUnsafe(1), 0, 1, targetStart).then((r) => r.buffer);
        const targetPresent = targetPresentBuffer[0] === 1;
        const anchorStart = targetStart + (targetPresent ? 33 : 1);
        const anchorPresentBuffer = await read(handle.fd, Buffer.allocUnsafe(1), 0, 1, anchorStart).then((r) => r.buffer);
        const anchorPresent = anchorPresentBuffer[0] === 1;
        await handle.close();
        return [anchorPresent, anchorStart];
    }
}
exports.default = FileDataItem;
//# sourceMappingURL=FileDataItem.js.map