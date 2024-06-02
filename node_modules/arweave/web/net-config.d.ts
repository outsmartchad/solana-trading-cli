export interface NetConfig {
    protocol: string;
    host: string;
    port?: number;
}
export declare const getDefaultConfig: (protocol: string, host: string) => NetConfig;
