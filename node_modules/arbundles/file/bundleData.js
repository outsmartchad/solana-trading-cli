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
exports.bundleAndSignData = void 0;
const tmp_promise_1 = require("tmp-promise");
const fs = __importStar(require("fs"));
const utils_1 = require("../src/utils");
const FileBundle_1 = __importDefault(require("./FileBundle"));
async function bundleAndSignData(dataItems, signer, dir) {
    const headerFile = await tmp_promise_1.file({ dir });
    const headerStream = fs.createWriteStream(headerFile.path);
    const files = new Array(dataItems.length);
    headerStream.write(utils_1.longTo32ByteArray(dataItems.length));
    for (const [index, item] of dataItems.entries()) {
        let dataItem;
        dataItem = item;
        if (!dataItem.isSigned()) {
            await dataItem.sign(signer);
        }
        files[index] = dataItem.filename;
        headerStream.write(Buffer.concat([utils_1.longTo32ByteArray(await dataItem.size()), dataItem.rawId]));
    }
    await new Promise((resolve) => headerStream.end(resolve));
    headerStream.close();
    return new FileBundle_1.default(headerFile.path, files);
}
exports.bundleAndSignData = bundleAndSignData;
//# sourceMappingURL=bundleData.js.map