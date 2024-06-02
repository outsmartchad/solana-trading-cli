"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arbundles_1 = require("arbundles");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Extended DataItem that allows for seamless bundlr operations, such as signing and uploading.
 * Takes the same parameters as a regular DataItem.
 */
class BundlrTransaction extends arbundles_1.DataItem {
    constructor(data, bundlr, opts) {
        var _a;
        super((0, arbundles_1.createData)(data, bundlr.currencyConfig.getSigner(), {
            ...opts, anchor: (_a = opts === null || opts === void 0 ? void 0 : opts.anchor) !== null && _a !== void 0 ? _a : crypto_1.default.randomBytes(32).toString("base64").slice(0, 32)
        }).getRaw());
        this.bundlr = bundlr;
        this.signer = bundlr.currencyConfig.getSigner();
    }
    sign() {
        return super.sign(this.signer);
    }
    get size() {
        return this.getRaw().length;
    }
    async upload() {
        return this.bundlr.uploader.transactionUploader(this);
    }
}
exports.default = BundlrTransaction;
//# sourceMappingURL=transaction.js.map