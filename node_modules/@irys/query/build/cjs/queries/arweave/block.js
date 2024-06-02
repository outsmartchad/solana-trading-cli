"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arweaveBlockQuery = exports.blockVars = exports.block = void 0;
exports.block = {
    id: "",
    timestamp: 0,
    height: "",
    previous: "",
};
// default variables
exports.blockVars = {
    id: undefined,
};
exports.arweaveBlockQuery = {
    name: "block",
    query: exports.block,
    vars: exports.blockVars,
};
//# sourceMappingURL=block.js.map