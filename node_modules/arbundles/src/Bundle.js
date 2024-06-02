"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base64url_1 = __importDefault(require("base64url"));
const utils_1 = require("./utils");
const DataItem_1 = __importDefault(require("./DataItem"));
const crypto_1 = require("crypto");
const HEADER_START = 32;
class Bundle {
    constructor(binary) {
        this.binary = binary;
        this.length = this.getDataItemCount();
        this.items = this.getItems();
    }
    getRaw() {
        return this.binary;
    }
    /**
     * Get a DataItem by index (`number`) or by txId (`string`)
     * @param index
     */
    get(index) {
        if (typeof index === "number") {
            if (index >= this.length) {
                throw new RangeError("Index out of range");
            }
            return this.getByIndex(index);
        }
        else {
            return this.getById(index);
        }
    }
    getSizes() {
        const ids = [];
        for (let i = HEADER_START; i < HEADER_START + 64 * this.length; i += 64) {
            ids.push(utils_1.byteArrayToLong(this.binary.subarray(i, i + 32)));
        }
        return ids;
    }
    getIds() {
        const ids = [];
        for (let i = HEADER_START; i < HEADER_START + 64 * this.length; i += 64) {
            ids.push(base64url_1.default.encode(this.binary.subarray(i + 32, i + 64)));
        }
        return ids;
    }
    getIdBy(index) {
        if (index > this.length - 1) {
            throw new RangeError("Index of bundle out of range");
        }
        const start = 64 + 64 * index;
        return base64url_1.default.encode(this.binary.subarray(start, start + 32));
    }
    async toTransaction(attributes, arweave, jwk) {
        const tx = await arweave.createTransaction({ data: this.binary, ...attributes }, jwk);
        tx.addTag("Bundle-Format", "binary");
        tx.addTag("Bundle-Version", "2.0.0");
        return tx;
    }
    async verify() {
        for (const item of this.items) {
            const valid = await item.isValid();
            const expected = base64url_1.default(crypto_1.createHash("sha256").update(item.rawSignature).digest());
            if (!(valid && item.id === expected)) {
                return false;
            }
        }
        return true;
    }
    getOffset(id) {
        let offset = 0;
        for (let i = HEADER_START; i < HEADER_START + 64 * this.length; i += 64) {
            const _offset = utils_1.byteArrayToLong(this.binary.subarray(i, i + 32));
            offset += _offset;
            const _id = this.binary.subarray(i + 32, i + 64);
            if (utils_1.arraybufferEqual(_id, id)) {
                return { startOffset: offset, size: _offset };
            }
        }
        return { startOffset: -1, size: -1 };
    }
    // TODO: Test this
    /**
     * UNSAFE! Assumes index < length
     * @param index
     * @private
     */
    getByIndex(index) {
        let offset = 0;
        const headerStart = 32 + 64 * index;
        const dataItemSize = utils_1.byteArrayToLong(this.binary.subarray(headerStart, headerStart + 32));
        let counter = 0;
        for (let i = HEADER_START; i < HEADER_START + 64 * this.length; i += 64) {
            if (counter == index) {
                break;
            }
            const _offset = utils_1.byteArrayToLong(this.binary.subarray(i, i + 32));
            offset += _offset;
            counter++;
        }
        const bundleStart = this.getBundleStart();
        const dataItemStart = bundleStart + offset;
        const slice = this.binary.subarray(dataItemStart, dataItemStart + dataItemSize + 200);
        const item = new DataItem_1.default(slice);
        item.rawId = this.binary.slice(32 + 64 * index, 64 + 64 * index);
        return item;
    }
    getById(id) {
        const _id = base64url_1.default.toBuffer(id);
        const offset = this.getOffset(_id);
        if (offset.startOffset === -1) {
            throw new Error("Transaction not found");
        }
        const bundleStart = this.getBundleStart();
        const dataItemStart = bundleStart + offset.startOffset;
        return new DataItem_1.default(this.binary.subarray(dataItemStart, dataItemStart + offset.size));
    }
    getDataItemCount() {
        return utils_1.byteArrayToLong(this.binary.subarray(0, 32));
    }
    getBundleStart() {
        return 32 + 64 * this.length;
    }
    getItems() {
        const items = new Array(this.length);
        let offset = 0;
        const bundleStart = this.getBundleStart();
        let counter = 0;
        for (let i = HEADER_START; i < HEADER_START + 64 * this.length; i += 64) {
            const _offset = utils_1.byteArrayToLong(this.binary.subarray(i, i + 32));
            const _id = this.binary.subarray(i + 32, i + 64);
            const dataItemStart = bundleStart + offset;
            const bytes = this.binary.subarray(dataItemStart, dataItemStart + _offset);
            offset += _offset;
            const item = new DataItem_1.default(bytes);
            item.rawId = _id;
            items[counter] = item;
            counter++;
        }
        return items;
    }
}
exports.default = Bundle;
//# sourceMappingURL=Bundle.js.map