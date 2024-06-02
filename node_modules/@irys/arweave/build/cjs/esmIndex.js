"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeArweave = exports.WebArweave = void 0;
const arweave_1 = require("./node/arweave");
var arweave_2 = require("./web/arweave");
Object.defineProperty(exports, "WebArweave", { enumerable: true, get: function () { return __importDefault(arweave_2).default; } });
exports.NodeArweave = arweave_1.Arweave;
exports.default = arweave_1.Arweave;
//# sourceMappingURL=esmIndex.js.map