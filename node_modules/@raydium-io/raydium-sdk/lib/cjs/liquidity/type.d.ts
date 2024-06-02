import { JsonFileMetaData } from '../common';
import { LpTokenInfo } from '../token';
export type LiquidityVersion = 4 | 5;
export interface LiquidityPoolBaseInfo {
    readonly id: string;
    readonly lp: LpTokenInfo;
}
export interface LiquidityPoolJsonInfo {
    readonly id: string;
    readonly baseMint: string;
    readonly quoteMint: string;
    readonly lpMint: string;
    readonly baseDecimals: number;
    readonly quoteDecimals: number;
    readonly lpDecimals: number;
    readonly version: number;
    readonly programId: string;
    readonly authority: string;
    readonly baseVault: string;
    readonly quoteVault: string;
    readonly lpVault: string;
    readonly openOrders: string;
    readonly targetOrders: string;
    readonly withdrawQueue: string;
    readonly marketVersion: number;
    readonly marketProgramId: string;
    readonly marketId: string;
    readonly marketAuthority: string;
    readonly marketBaseVault: string;
    readonly marketQuoteVault: string;
    readonly marketBids: string;
    readonly marketAsks: string;
    readonly marketEventQueue: string;
}
export interface LiquidityPoolsJsonFile extends JsonFileMetaData {
    readonly official: LiquidityPoolJsonInfo[];
    readonly unOfficial: LiquidityPoolJsonInfo[];
}
