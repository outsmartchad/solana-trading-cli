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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSignatureData = void 0;
const utils_1 = require("arweave/node/lib/utils");
const utils_2 = require("./utils");
const deepHash_1 = require("./deepHash");
async function getSignatureData(item) {
    if (utils_2.isBrowser) {
        const web = await Promise.resolve().then(() => __importStar(require("arweave/web/lib/deepHash")));
        return web.default([
            utils_1.stringToBuffer("dataitem"),
            utils_1.stringToBuffer("1"),
            utils_1.stringToBuffer(item.signatureType.toString()),
            item.rawOwner,
            item.rawTarget,
            item.rawAnchor,
            item.rawTags,
            item.rawData,
        ]);
    }
    else {
        return deepHash_1.deepHash([
            utils_1.stringToBuffer("dataitem"),
            utils_1.stringToBuffer("1"),
            utils_1.stringToBuffer(item.signatureType.toString()),
            item.rawOwner,
            item.rawTarget,
            item.rawAnchor,
            item.rawTags,
            item.rawData,
        ]);
    }
}
exports.getSignatureData = getSignatureData;
//# sourceMappingURL=ar-data-base.js.map