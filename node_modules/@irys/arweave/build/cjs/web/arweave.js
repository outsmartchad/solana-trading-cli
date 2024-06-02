"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebArweave = exports.Arweave = void 0;
const common_1 = __importDefault(require("../common"));
const webcrypto_driver_1 = __importDefault(require("./webcrypto-driver"));
class Arweave extends common_1.default {
    /**
     * Constructor for a new `Arweave` instance - this one uses the web crypto driver
     * @param gatways - Specify the Arweave gateway(s) you want to use for requests
     * @param options - Other configuration options
     * @param options.miners - A list of Arweave miners (peers) to use for requests
     * @param options.gateways - A list of Arweave miners (peers) to use for requests
     */
    constructor(gateways, options) {
        var _a;
        super(Object.assign(Object.assign({ crypto: (_a = options === null || options === void 0 ? void 0 : options.crypto) !== null && _a !== void 0 ? _a : new webcrypto_driver_1.default() }, options), { gateways: gateways !== null && gateways !== void 0 ? gateways : "https://arweave.net" }));
    }
    static init(apiConfig) {
        return new Arweave(apiConfig);
    }
}
exports.Arweave = Arweave;
exports.WebArweave = Arweave;
exports.default = Arweave;
//# sourceMappingURL=arweave.js.map