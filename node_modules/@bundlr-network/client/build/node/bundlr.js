"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = __importDefault(require("../common/api"));
const bundlr_1 = __importDefault(require("../common/bundlr"));
const fund_1 = __importDefault(require("../common/fund"));
const utils_1 = __importDefault(require("../common/utils"));
const currencies_1 = __importDefault(require("./currencies"));
const upload_1 = __importDefault(require("./upload"));
class NodeBundlr extends bundlr_1.default {
    /**
     * Constructs a new Bundlr instance, as well as supporting subclasses
     * @param url - URL to the bundler
     * @param wallet - private key (in whatever form required)
     */
    constructor(url, currency, wallet, config) {
        var _a;
        super();
        const parsed = new URL(url);
        this.api = new api_1.default({ protocol: parsed.protocol.slice(0, -1), port: parsed.port, host: parsed.hostname, timeout: (_a = config === null || config === void 0 ? void 0 : config.timeout) !== null && _a !== void 0 ? _a : 100000 });
        this.currency = currency.toLowerCase();
        this.currencyConfig = (0, currencies_1.default)(this.currency, wallet, parsed.toString(), config === null || config === void 0 ? void 0 : config.providerUrl, config === null || config === void 0 ? void 0 : config.contractAddress, config === null || config === void 0 ? void 0 : config.currencyOpts);
        this.address = this.currencyConfig.address;
        this.utils = new utils_1.default(this.api, this.currency, this.currencyConfig);
        this.funder = new fund_1.default(this.utils);
        this.uploader = new upload_1.default(this.api, this.utils, this.currency, this.currencyConfig);
    }
    /**
     * Upload a file at the specified path to the bundler
     * @param path path to the file to upload
     * @returns bundler response
     */
    async uploadFile(path) {
        return this.uploader.uploadFile(path);
    }
    ;
    async ready() {
        this.currencyConfig.ready ? await this.currencyConfig.ready() : true;
    }
}
exports.default = NodeBundlr;
//# sourceMappingURL=bundlr.js.map