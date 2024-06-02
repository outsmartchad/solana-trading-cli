/// <reference types="node" />
import type { AxiosError, AxiosResponse } from "axios";
import type { ApiConfig, ApiRequestConfig } from "./api.js";
import Api from "./api.js";
type FallbackApiRequestConfig = {
    fallback?: {
        maxAttempts?: number;
        onFallback?: (err: AxiosError, host: Api) => Promise<void> | void;
        randomlySelect?: boolean;
    };
    gatewayOnly?: boolean;
} & ApiRequestConfig;
export declare class FallbackApi {
    minerInstances: Api[];
    globalConfig: Omit<ApiConfig, "url">;
    gatewayInstances: Api[];
    constructor({ gateways, miners, opts, }: {
        gateways?: ApiConfig[] | URL[] | string[];
        miners?: ApiConfig[] | URL[] | string[];
        opts?: {
            globalConfig?: Omit<ApiConfig, "url">;
        };
    });
    addPeersFrom(url: string | URL, options?: {
        limit?: number;
    }): Promise<void>;
    addMiners(hosts: (URL | string | ApiConfig)[]): void;
    addGateways(hosts: (URL | string | ApiConfig)[]): void;
    get<T = any>(path: string, config?: FallbackApiRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(path: string, body: Buffer | string | object | null, config?: FallbackApiRequestConfig): Promise<AxiosResponse<T>>;
    request<T = any>(path: string, config?: FallbackApiRequestConfig): Promise<AxiosResponse<T>>;
}
export default FallbackApi;
