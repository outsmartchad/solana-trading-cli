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
const axios_1 = __importDefault(require("axios"));
const async_retry_1 = __importDefault(require("async-retry"));
const arweave_1 = __importDefault(require("../arweave"));
class Api {
    constructor(config) {
        this.cookieMap = new Map();
        if (config)
            this.applyConfig(config);
    }
    applyConfig(config) {
        this.config = this.mergeDefaults(config);
        this._instance = undefined;
    }
    getConfig() {
        return this.config;
    }
    requestInterceptor(request) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const cookies = this.cookieMap.get(new URL((_a = request.baseURL) !== null && _a !== void 0 ? _a : "").host);
            if (cookies)
                request.headers.cookie = cookies;
            return request;
        });
    }
    responseInterceptor(response) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const setCookie = (_a = response.headers) === null || _a === void 0 ? void 0 : _a["set-cookie"];
            if (setCookie)
                this.cookieMap.set(response.request.host, setCookie);
            return response;
        });
    }
    mergeDefaults(config) {
        var _a, _b, _c, _d, _e;
        (_a = config.headers) !== null && _a !== void 0 ? _a : (config.headers = {});
        if (config.network && !Object.keys(config.headers).includes("x-network"))
            config.headers["x-network"] = config.network;
        return {
            url: config.url,
            timeout: (_b = config.timeout) !== null && _b !== void 0 ? _b : 20000,
            logging: (_c = config.logging) !== null && _c !== void 0 ? _c : false,
            logger: (_d = config.logger) !== null && _d !== void 0 ? _d : console.log,
            headers: Object.assign(Object.assign({}, config.headers), { "x-irys-arweave-version": arweave_1.default.VERSION }),
            withCredentials: (_e = config.withCredentials) !== null && _e !== void 0 ? _e : false,
            retry: { retries: 3, maxTimeout: 5000 },
        };
    }
    get(path, config) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.request(path, Object.assign(Object.assign({}, config), { method: "GET" }));
            }
            catch (error) {
                if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status)
                    return error.response;
                throw error;
            }
        });
    }
    post(path, body, config) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.request(path, Object.assign(Object.assign({ data: body }, config), { method: "POST" }));
            }
            catch (error) {
                if ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status)
                    return error.response;
                throw error;
            }
        });
    }
    get instance() {
        if (this._instance)
            return this._instance;
        const instance = axios_1.default.create({
            baseURL: this.config.url.toString(),
            timeout: this.config.timeout,
            maxContentLength: 1024 * 1024 * 512,
            headers: this.config.headers,
            withCredentials: this.config.withCredentials,
        });
        if (this.config.withCredentials) {
            instance.interceptors.request.use(this.requestInterceptor.bind(this));
            instance.interceptors.response.use(this.responseInterceptor.bind(this));
        }
        if (this.config.logging) {
            instance.interceptors.request.use((request) => {
                this.config.logger(`Requesting: ${request.baseURL}/${request.url}`);
                return request;
            });
            instance.interceptors.response.use((response) => {
                this.config.logger(`Response: ${response.config.url} - ${response.status}`);
                return response;
            });
        }
        return (this._instance = instance);
    }
    request(path, config) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const instance = this.instance;
            const url = (_a = config === null || config === void 0 ? void 0 : config.url) !== null && _a !== void 0 ? _a : new URL(path, this.config.url).toString();
            return (0, async_retry_1.default)((_) => instance(Object.assign(Object.assign({}, config), { url })), Object.assign(Object.assign({}, this.config.retry), config === null || config === void 0 ? void 0 : config.retry));
        });
    }
}
exports.default = Api;
//# sourceMappingURL=api.js.map