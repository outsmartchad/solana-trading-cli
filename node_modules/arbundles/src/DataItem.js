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
exports.MIN_BINARY_SIZE = void 0;
const utils_1 = require("./utils");
const parser_1 = require("./parser");
const base64url_1 = __importDefault(require("base64url"));
const buffer_1 = require("buffer");
const ar_data_bundle_1 = require("./ar-data-bundle");
const index_1 = require("./signing/index");
const ar_data_base_1 = require("./ar-data-base");
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("./constants");
const crypto = __importStar(require("crypto"));
const arweave_1 = __importDefault(require("arweave"));
exports.MIN_BINARY_SIZE = 80;
class DataItem {
    constructor(binary) {
        this.binary = binary;
    }
    static isDataItem(obj) {
        return obj.binary !== undefined;
    }
    get signatureType() {
        const signatureTypeVal = utils_1.byteArrayToLong(this.binary.subarray(0, 2));
        switch (signatureTypeVal) {
            case 1: {
                return constants_1.SignatureConfig.ARWEAVE;
            }
            case 2: {
                return constants_1.SignatureConfig.ED25519;
            }
            case 3: {
                return constants_1.SignatureConfig.ETHEREUM;
            }
            case 4: {
                return constants_1.SignatureConfig.SOLANA;
            }
            default: {
                throw new Error("Unknown signature type: " + signatureTypeVal);
            }
        }
    }
    async isValid() {
        return DataItem.verify(this.binary);
    }
    get id() {
        return base64url_1.default.encode(this.rawId);
    }
    set id(id) {
        this._id = base64url_1.default.toBuffer(id);
    }
    get rawId() {
        return crypto.createHash("sha256").update(this.rawSignature).digest();
    }
    set rawId(id) {
        this._id = id;
    }
    get rawSignature() {
        return this.binary.subarray(2, 2 + this.signatureLength);
    }
    get signature() {
        return base64url_1.default.encode(this.rawSignature);
    }
    get signatureLength() {
        return constants_1.SIG_CONFIG[this.signatureType].sigLength;
    }
    get rawOwner() {
        return this.binary.subarray(2 + this.signatureLength, 2 + this.signatureLength + this.ownerLength);
    }
    get owner() {
        return base64url_1.default.encode(this.rawOwner);
    }
    get ownerLength() {
        return constants_1.SIG_CONFIG[this.signatureType].pubLength;
    }
    get rawTarget() {
        const targetStart = this.getTargetStart();
        const isPresent = this.binary[targetStart] == 1;
        return isPresent
            ? this.binary.subarray(targetStart + 1, targetStart + 33)
            : buffer_1.Buffer.alloc(0);
    }
    get target() {
        return base64url_1.default.encode(this.rawTarget);
    }
    get rawAnchor() {
        const anchorStart = this.getAnchorStart();
        const isPresent = this.binary[anchorStart] == 1;
        return isPresent
            ? this.binary.subarray(anchorStart + 1, anchorStart + 33)
            : buffer_1.Buffer.alloc(0);
    }
    get anchor() {
        return this.rawAnchor.toString();
    }
    get rawTags() {
        const tagsStart = this.getTagsStart();
        const tagsSize = utils_1.byteArrayToLong(this.binary.subarray(tagsStart + 8, tagsStart + 16));
        return this.binary.subarray(tagsStart + 16, tagsStart + 16 + tagsSize);
    }
    get tags() {
        const tagsStart = this.getTagsStart();
        const tagsCount = utils_1.byteArrayToLong(this.binary.subarray(tagsStart, tagsStart + 8));
        if (tagsCount == 0) {
            return [];
        }
        const tagsSize = utils_1.byteArrayToLong(this.binary.subarray(tagsStart + 8, tagsStart + 16));
        return parser_1.tagsParser.fromBuffer(buffer_1.Buffer.from(this.binary.subarray(tagsStart + 16, tagsStart + 16 + tagsSize)));
    }
    get tagsB64Url() {
        const _tags = this.tags;
        return _tags.map((t) => ({
            name: base64url_1.default.encode(t.name),
            value: base64url_1.default.encode(t.value),
        }));
    }
    getStartOfData() {
        const tagsStart = this.getTagsStart();
        const numberOfTagBytesArray = this.binary.subarray(tagsStart + 8, tagsStart + 16);
        const numberOfTagBytes = utils_1.byteArrayToLong(numberOfTagBytesArray);
        return tagsStart + 16 + numberOfTagBytes;
    }
    get rawData() {
        const tagsStart = this.getTagsStart();
        const numberOfTagBytesArray = this.binary.subarray(tagsStart + 8, tagsStart + 16);
        const numberOfTagBytes = utils_1.byteArrayToLong(numberOfTagBytesArray);
        const dataStart = tagsStart + 16 + numberOfTagBytes;
        return this.binary.subarray(dataStart, this.binary.length);
    }
    get data() {
        return base64url_1.default.encode(this.rawData);
    }
    /**
     * UNSAFE!!
     * DO NOT MUTATE THE BINARY ARRAY. THIS WILL CAUSE UNDEFINED BEHAVIOUR.
     */
    getRaw() {
        return this.binary;
    }
    async sign(signer) {
        this._id = await ar_data_bundle_1.sign(this, signer);
        return this.rawId;
    }
    async setSignature(signature) {
        this.binary.set(signature, 2);
        this._id = buffer_1.Buffer.from(await arweave_1.default.crypto.hash(signature));
    }
    isSigned() {
        var _a, _b;
        return ((_b = (_a = this._id) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0;
    }
    /**
     * Returns a JSON representation of a DataItem
     */
    toJSON() {
        return {
            signature: this.signature,
            owner: this.owner,
            target: this.target,
            tags: this.tags.map((t) => ({
                name: base64url_1.default.encode(t.name),
                value: base64url_1.default.encode(t.value),
            })),
            data: this.data,
        };
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
        const response = await axios_1.default.post(`${bundler}/tx`, this.getRaw(), {
            headers,
            timeout: 100000,
            maxBodyLength: Infinity,
            validateStatus: (status) => (status > 200 && status < 300) || status !== 402,
        });
        if (response.status === 402)
            throw new Error("Not enough funds to send data");
        return response;
    }
    /**
     * Verifies a `Buffer` and checks it fits the format of a DataItem
     *
     * A binary is valid iff:
     * - the tags are encoded correctly
     */
    static async verify(buffer) {
        if (buffer.byteLength < exports.MIN_BINARY_SIZE) {
            return false;
        }
        const item = new DataItem(buffer);
        const sigType = item.signatureType;
        const tagsStart = item.getTagsStart();
        const numberOfTags = utils_1.byteArrayToLong(buffer.subarray(tagsStart, tagsStart + 8));
        const numberOfTagBytesArray = buffer.subarray(tagsStart + 8, tagsStart + 16);
        const numberOfTagBytes = utils_1.byteArrayToLong(numberOfTagBytesArray);
        if (numberOfTagBytes > 4096)
            return false;
        if (numberOfTags > 0) {
            try {
                const tags = parser_1.tagsParser.fromBuffer(buffer_1.Buffer.from(buffer.subarray(tagsStart + 16, tagsStart + 16 + numberOfTagBytes)));
                if (tags.length !== numberOfTags) {
                    return false;
                }
            }
            catch (e) {
                return false;
            }
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const Signer = index_1.indexToType[sigType];
        const signatureData = await ar_data_base_1.getSignatureData(item);
        return await Signer.verify(item.rawOwner, signatureData, item.rawSignature);
    }
    async getSignatureData() {
        return ar_data_base_1.getSignatureData(this);
    }
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    getTagsStart() {
        const targetStart = this.getTargetStart();
        const targetPresent = this.binary[targetStart] == 1;
        let tagsStart = targetStart + (targetPresent ? 33 : 1);
        const anchorPresent = this.binary[tagsStart] == 1;
        tagsStart += anchorPresent ? 33 : 1;
        return tagsStart;
    }
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    getTargetStart() {
        return 2 + this.signatureLength + this.ownerLength;
    }
    /**
     * Returns the start byte of the tags section (number of tags)
     *
     * @private
     */
    getAnchorStart() {
        let anchorStart = this.getTargetStart() + 1;
        const targetPresent = this.binary[this.getTargetStart()] == 1;
        anchorStart += targetPresent ? 32 : 0;
        return anchorStart;
    }
}
exports.default = DataItem;
//# sourceMappingURL=DataItem.js.map