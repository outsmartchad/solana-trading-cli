"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arweave_1 = __importDefault(require("./arweave"));
if (typeof globalThis === "object") {
    globalThis.Arweave = arweave_1.default;
}
else if (typeof self === "object") {
    self.Arweave = arweave_1.default;
}
//# sourceMappingURL=bundle.js.map