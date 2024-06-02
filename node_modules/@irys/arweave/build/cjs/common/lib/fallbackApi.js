"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackApi = void 0;
const api_1 = __importDefault(require("./api"));
const isApiConfig = (o) => typeof o !== "string" && "url" in o;
const defaultFallbackConfig = {
    maxAttempts: 15,
    randomlySelect: true,
};
class FallbackApi {
    constructor({ gateways, miners, opts, }) {
        var _a;
        this.minerInstances = [];
        this.gatewayInstances = [];
        this.globalConfig = (_a = opts === null || opts === void 0 ? void 0 : opts.globalConfig) !== null && _a !== void 0 ? _a : {};
        if (miners)
            this.addMiners(miners);
        if (gateways)
            this.addGateways(gateways);
        // this.gatewayInstance = this.minerInstances[0];
    }
    addPeersFrom(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const peers = (yield this.get("", { url: new URL("/peers", url).toString() })).data;
            this.addMiners(peers.slice(0, options === null || options === void 0 ? void 0 : options.limit).map((p) => `http://${p}`));
        });
    }
    addMiners(hosts) {
        hosts.forEach((h) => this.minerInstances.push(new api_1.default(isApiConfig(h) ? h : Object.assign({ url: new URL(h) }, this.globalConfig))));
    }
    addGateways(hosts) {
        hosts.forEach((h) => this.gatewayInstances.push(new api_1.default(isApiConfig(h) ? h : Object.assign({ url: new URL(h) }, this.globalConfig))));
    }
    get(path, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(path, Object.assign(Object.assign({}, config), { method: "GET" }));
        });
    }
    post(path, body, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request(path, Object.assign(Object.assign({ data: body }, config), { method: "POST" }));
        });
    }
    request(path, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const fallbackConfig = Object.assign(Object.assign({}, defaultFallbackConfig), config === null || config === void 0 ? void 0 : config.fallback);
            let attempts = 0;
            const errors = [];
            const instances = (config === null || config === void 0 ? void 0 : config.gatewayOnly) ? this.gatewayInstances : this.gatewayInstances.concat(this.minerInstances);
            const maxAttempts = Math.min(Math.max(fallbackConfig === null || fallbackConfig === void 0 ? void 0 : fallbackConfig.maxAttempts, 1), instances.length);
            const onFallback = fallbackConfig === null || fallbackConfig === void 0 ? void 0 : fallbackConfig.onFallback;
            if (instances.length === 0)
                throw new Error(`Unable to run request due to 0 configured gateways/miners.`);
            while (attempts++ < maxAttempts) {
                const apiInstance = instances.at((fallbackConfig === null || fallbackConfig === void 0 ? void 0 : fallbackConfig.randomlySelect) ? Math.floor(Math.random() * instances.length) : attempts - 1);
                if (!apiInstance)
                    continue;
                try {
                    return yield apiInstance.request(path, Object.assign({}, config));
                }
                catch (e) {
                    onFallback === null || onFallback === void 0 ? void 0 : onFallback(e, apiInstance);
                    errors.push(e);
                    if (attempts >= maxAttempts)
                        throw e;
                }
            }
            throw new Error("unreachable");
        });
    }
}
exports.FallbackApi = FallbackApi;
exports.default = FallbackApi;
//# sourceMappingURL=fallbackApi.js.map