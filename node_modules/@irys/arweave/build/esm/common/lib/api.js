import Axios from "axios";
import AsyncRetry from "async-retry";
import Arweave from "../arweave.js";
export default class Api {
    _instance;
    cookieMap = new Map();
    config;
    constructor(config) {
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
    async requestInterceptor(request) {
        const cookies = this.cookieMap.get(new URL(request.baseURL ?? "").host);
        if (cookies)
            request.headers.cookie = cookies;
        return request;
    }
    async responseInterceptor(response) {
        const setCookie = response.headers?.["set-cookie"];
        if (setCookie)
            this.cookieMap.set(response.request.host, setCookie);
        return response;
    }
    mergeDefaults(config) {
        config.headers ??= {};
        if (config.network && !Object.keys(config.headers).includes("x-network"))
            config.headers["x-network"] = config.network;
        return {
            url: config.url,
            timeout: config.timeout ?? 20000,
            logging: config.logging ?? false,
            logger: config.logger ?? console.log,
            headers: { ...config.headers, "x-irys-arweave-version": Arweave.VERSION },
            withCredentials: config.withCredentials ?? false,
            retry: { retries: 3, maxTimeout: 5_000 },
        };
    }
    async get(path, config) {
        try {
            return await this.request(path, { ...config, method: "GET" });
        }
        catch (error) {
            if (error.response?.status)
                return error.response;
            throw error;
        }
    }
    async post(path, body, config) {
        try {
            return await this.request(path, { data: body, ...config, method: "POST" });
        }
        catch (error) {
            if (error.response?.status)
                return error.response;
            throw error;
        }
    }
    get instance() {
        if (this._instance)
            return this._instance;
        const instance = Axios.create({
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
    async request(path, config) {
        const instance = this.instance;
        const url = config?.url ?? new URL(path, this.config.url).toString();
        return AsyncRetry((_) => instance({ ...config, url }), {
            ...this.config.retry,
            ...config?.retry,
        });
    }
}
//# sourceMappingURL=api.js.map