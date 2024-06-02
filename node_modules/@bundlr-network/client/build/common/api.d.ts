/// <reference types="node" />
import { AxiosResponse, AxiosRequestConfig, AxiosInstance } from "axios";
export interface ApiConfig {
    host?: string;
    protocol?: string;
    port?: string | number;
    timeout?: number;
    logging?: boolean;
    logger?: Function;
}
export default class Api {
    readonly METHOD_GET = "GET";
    readonly METHOD_POST = "POST";
    config: ApiConfig;
    constructor(config: ApiConfig);
    applyConfig(config: ApiConfig): void;
    getConfig(): ApiConfig;
    private mergeDefaults;
    get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(endpoint: string, body: Buffer | string | object, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    request(): AxiosInstance;
}
