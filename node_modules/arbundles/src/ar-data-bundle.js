"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = exports.getSignatureAndId = exports.bundleAndSignData = exports.unbundleData = void 0;
const ar_data_base_1 = require("./ar-data-base");
const utils_1 = require("./utils");
const arweave_1 = __importDefault(require("arweave"));
const Bundle_1 = __importDefault(require("./Bundle"));
/**
 * Unbundles a transaction into an Array of DataItems.
 *
 * Takes either a json string or object. Will throw if given an invalid json
 * string but otherwise, it will return an empty array if
 *
 * a) the json object is the wrong format
 * b) the object contains no valid DataItems.
 *
 * It will verify all DataItems and discard ones that don't pass verification.
 *
 * @param txData
 */
function unbundleData(txData) {
    return new Bundle_1.default(txData);
}
exports.unbundleData = unbundleData;
/**
 * Verifies all data items and returns a json object with an items array.
 * Throws if any of the data items fail verification.
 *
 * @param dataItems
 * @param signer
 */
async function bundleAndSignData(dataItems, signer) {
    const headers = new Uint8Array(64 * dataItems.length);
    const binaries = await Promise.all(dataItems.map(async (d, index) => {
        // Sign DataItem
        const id = d.isSigned() ? d.rawId : await sign(d, signer);
        // Create header array
        const header = new Uint8Array(64);
        // Set offset
        header.set(utils_1.longTo32ByteArray(d.getRaw().byteLength), 0);
        // Set id
        header.set(id, 32);
        // Add header to array of headers
        headers.set(header, 64 * index);
        // Convert to array for flattening
        return d.getRaw();
    })).then((a) => {
        return Buffer.concat(a);
    });
    const buffer = Buffer.concat([
        utils_1.longTo32ByteArray(dataItems.length),
        headers,
        binaries,
    ]);
    return new Bundle_1.default(buffer);
}
exports.bundleAndSignData = bundleAndSignData;
/**
 * Signs a single
 *
 * @param item
 * @param signer
 * @returns signings - signature and id in byte-arrays
 */
async function getSignatureAndId(item, signer) {
    const signatureData = await ar_data_base_1.getSignatureData(item);
    const signatureBytes = await signer.sign(signatureData);
    const idBytes = await arweave_1.default.crypto.hash(signatureBytes);
    return { signature: Buffer.from(signatureBytes), id: Buffer.from(idBytes) };
}
exports.getSignatureAndId = getSignatureAndId;
/**
 * Signs and returns item id
 *
 * @param item
 * @param jwk
 */
async function sign(item, signer) {
    const { signature, id } = await getSignatureAndId(item, signer);
    item.getRaw().set(signature, 2);
    return id;
}
exports.sign = sign;
//# sourceMappingURL=ar-data-bundle.js.map