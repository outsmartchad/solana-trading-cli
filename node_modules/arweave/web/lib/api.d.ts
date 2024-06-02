export interface ApiConfig {
    host?: string;
    protocol?: string;
    port?: string | number;
    timeout?: number;
    logging?: boolean;
    logger?: Function;
    network?: string;
}
export interface ResponseWithData<T = any> extends Response {
    data: T;
}
export interface RequestInitWithAxios extends RequestInit {
    responseType?: "arraybuffer" | "json" | "text" | "webstream";
}
export default class Api {
    readonly METHOD_GET = "GET";
    readonly METHOD_POST = "POST";
    config: ApiConfig;
    constructor(config: ApiConfig);
    applyConfig(config: ApiConfig): void;
    getConfig(): ApiConfig;
    private mergeDefaults;
    get<T = any>(endpoint: string, config?: RequestInitWithAxios): Promise<ResponseWithData<T>>;
    post<T = any>(endpoint: string, body: any, config?: RequestInitWithAxios): Promise<ResponseWithData<T>>;
    request<T = unknown>(endpoint: string, init?: RequestInitWithAxios): Promise<ResponseWithData<T>>;
}
