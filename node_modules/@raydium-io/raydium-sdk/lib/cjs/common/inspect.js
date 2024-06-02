"use strict";
/* eslint-disable @typescript-eslint/ban-ts-comment */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectAll = exports.inspectBN = exports.inspectPublicKey = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
function inspectPublicKey() {
    // @ts-ignore
    web3_js_1.PublicKey.prototype.inspect = function () {
        return `<PublicKey: ${this.toString()}>`;
    };
}
exports.inspectPublicKey = inspectPublicKey;
function inspectBN() {
    // @ts-ignore
    bn_js_1.default.prototype.inspect = function () {
        // @ts-ignore
        return `<${this.red ? 'BN-R' : 'BN'}: ${this.toString()}>`;
    };
}
exports.inspectBN = inspectBN;
function inspectAll() {
    inspectPublicKey();
    inspectBN();
}
exports.inspectAll = inspectAll;
//# sourceMappingURL=inspect.js.map