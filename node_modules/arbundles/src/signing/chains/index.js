"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HexSolanaSigner = exports.HexInjectedSolanaSigner = exports.AlgorandSigner = exports.NearSigner = exports.InjectedEthereumSigner = exports.PolygonSigner = exports.ArweaveSigner = exports.InjectedSolanaSigner = void 0;
const ArweaveSigner_1 = __importDefault(require("./ArweaveSigner"));
exports.ArweaveSigner = ArweaveSigner_1.default;
__exportStar(require("./ethereumSigner"), exports);
const PolygonSigner_1 = __importDefault(require("./PolygonSigner"));
exports.PolygonSigner = PolygonSigner_1.default;
__exportStar(require("./SolanaSigner"), exports);
const injectedEthereumSigner_1 = __importDefault(require("./injectedEthereumSigner"));
exports.InjectedEthereumSigner = injectedEthereumSigner_1.default;
var injectedSolanaSigner_1 = require("./injectedSolanaSigner");
Object.defineProperty(exports, "InjectedSolanaSigner", { enumerable: true, get: function () { return __importDefault(injectedSolanaSigner_1).default; } });
var NearSigner_1 = require("./NearSigner");
Object.defineProperty(exports, "NearSigner", { enumerable: true, get: function () { return __importDefault(NearSigner_1).default; } });
var AlgorandSigner_1 = require("./AlgorandSigner");
Object.defineProperty(exports, "AlgorandSigner", { enumerable: true, get: function () { return __importDefault(AlgorandSigner_1).default; } });
var HexInjectedSolanaSigner_1 = require("./HexInjectedSolanaSigner");
Object.defineProperty(exports, "HexInjectedSolanaSigner", { enumerable: true, get: function () { return __importDefault(HexInjectedSolanaSigner_1).default; } });
var HexSolanaSigner_1 = require("./HexSolanaSigner");
Object.defineProperty(exports, "HexSolanaSigner", { enumerable: true, get: function () { return __importDefault(HexSolanaSigner_1).default; } });
//# sourceMappingURL=index.js.map