import { JsonFileMetaData } from '../common';
import { LiquidityVersion } from '../liquidity';
export interface NativeTokenInfo {
    readonly symbol: string;
    readonly name: string;
    readonly decimals: number;
}
export type ExtensionKey = 'coingeckoId' | 'website' | 'whitepaper';
export type Extensions = {
    [key in ExtensionKey]?: string;
};
export interface SplTokenInfo extends NativeTokenInfo {
    readonly mint: string;
    readonly extensions: Extensions;
}
export type SplTokens = {
    [T in string]: SplTokenInfo;
};
export interface LpTokenInfo extends NativeTokenInfo {
    readonly mint: string;
    readonly base: SplTokenInfo;
    readonly quote: SplTokenInfo;
    readonly version: LiquidityVersion;
}
export type LpTokens = {
    [T in string]: LpTokenInfo;
};
export interface SplTokenJsonInfo {
    readonly symbol: string;
    readonly name: string;
    readonly mint: string;
    readonly decimals: number;
    readonly extensions: Extensions;
}
export interface LpTokenJsonInfo {
    readonly symbol: string;
    readonly name: string;
    readonly mint: string;
    readonly base: string;
    readonly quote: string;
    readonly decimals: number;
    readonly version: LiquidityVersion;
}
export type SplTokensJsonInfo = {
    [T in string]: SplTokenJsonInfo;
};
export type LpTokensJsonInfo = {
    [T in string]: LpTokenJsonInfo;
};
export interface TokensJsonFile extends JsonFileMetaData {
    readonly spl: SplTokensJsonInfo;
    readonly lp: LpTokensJsonInfo;
}
