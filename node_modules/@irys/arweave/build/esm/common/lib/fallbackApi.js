import Api from "./api.js";
const isApiConfig = (o) => typeof o !== "string" && "url" in o;
const defaultFallbackConfig = {
    maxAttempts: 15,
    randomlySelect: true,
};
export class FallbackApi {
    minerInstances = [];
    globalConfig;
    gatewayInstances = [];
    constructor({ gateways, miners, opts, }) {
        this.globalConfig = opts?.globalConfig ?? {};
        if (miners)
            this.addMiners(miners);
        if (gateways)
            this.addGateways(gateways);
        // this.gatewayInstance = this.minerInstances[0];
    }
    async addPeersFrom(url, options) {
        const peers = (await this.get("", { url: new URL("/peers", url).toString() })).data;
        this.addMiners(peers.slice(0, options?.limit).map((p) => `http://${p}`));
    }
    addMiners(hosts) {
        hosts.forEach((h) => this.minerInstances.push(new Api(isApiConfig(h) ? h : { url: new URL(h), ...this.globalConfig })));
    }
    addGateways(hosts) {
        hosts.forEach((h) => this.gatewayInstances.push(new Api(isApiConfig(h) ? h : { url: new URL(h), ...this.globalConfig })));
    }
    async get(path, config) {
        return this.request(path, { ...config, method: "GET" });
    }
    async post(path, body, config) {
        return this.request(path, { data: body, ...config, method: "POST" });
    }
    async request(path, config) {
        const fallbackConfig = { ...defaultFallbackConfig, ...config?.fallback };
        let attempts = 0;
        const errors = [];
        const instances = config?.gatewayOnly ? this.gatewayInstances : this.gatewayInstances.concat(this.minerInstances);
        const maxAttempts = Math.min(Math.max(fallbackConfig?.maxAttempts, 1), instances.length);
        const onFallback = fallbackConfig?.onFallback;
        if (instances.length === 0)
            throw new Error(`Unable to run request due to 0 configured gateways/miners.`);
        while (attempts++ < maxAttempts) {
            const apiInstance = instances.at(fallbackConfig?.randomlySelect ? Math.floor(Math.random() * instances.length) : attempts - 1);
            if (!apiInstance)
                continue;
            try {
                return await apiInstance.request(path, { ...config });
            }
            catch (e) {
                onFallback?.(e, apiInstance);
                errors.push(e);
                if (attempts >= maxAttempts)
                    throw e;
            }
        }
        throw new Error("unreachable");
    }
}
export default FallbackApi;
//# sourceMappingURL=fallbackApi.js.map