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
exports.signers = exports.deepHash = exports.unbundleData = exports.bundleAndSignData = exports.createData = exports.DataItem = exports.Bundle = exports.MIN_BINARY_SIZE = void 0;
const ar_data_bundle_1 = require("./ar-data-bundle");
Object.defineProperty(exports, "bundleAndSignData", { enumerable: true, get: function () { return ar_data_bundle_1.bundleAndSignData; } });
Object.defineProperty(exports, "unbundleData", { enumerable: true, get: function () { return ar_data_bundle_1.unbundleData; } });
const Bundle_1 = __importDefault(require("./Bundle"));
exports.Bundle = Bundle_1.default;
const DataItem_1 = __importStar(require("./DataItem"));
exports.DataItem = DataItem_1.default;
Object.defineProperty(exports, "MIN_BINARY_SIZE", { enumerable: true, get: function () { return DataItem_1.MIN_BINARY_SIZE; } });
const deepHash_1 = require("./deepHash");
Object.defineProperty(exports, "deepHash", { enumerable: true, get: function () { return deepHash_1.deepHash; } });
const ar_data_create_1 = require("./ar-data-create");
Object.defineProperty(exports, "createData", { enumerable: true, get: function () { return ar_data_create_1.createData; } });
const signing_1 = require("./signing");
const SolanaSigner_1 = __importDefault(require("./signing/chains/SolanaSigner"));
const ethereumSigner_1 = __importDefault(require("./signing/chains/ethereumSigner"));
const signers = {
    ArweaveSigner: signing_1.ArweaveSigner,
    SolanaSigner: SolanaSigner_1.default,
    EthereumSigner: ethereumSigner_1.default,
};
exports.signers = signers;
//# sourceMappingURL=index.js.map