import { LpTokenInfo, SplTokenInfo } from './type';
/**
 * Token list
 */
export declare class TokenList {
    private tokenList;
    constructor(tokenList: (SplTokenInfo | LpTokenInfo)[]);
    /**
     * Filter token by mint of token list.
     *
     * @param mint - Token's mint address
     */
    filterByMint: (mint: string) => (SplTokenInfo | LpTokenInfo)[];
    /**
     * Filter unique token by mint of token list, must and can only have one result.
     */
    filterUniqueByMint: <T extends "all" | "spl" | "lp">(mint: string, tokenType?: "all" | T | "spl" | "lp") => T extends "all" ? SplTokenInfo | LpTokenInfo : T extends "spl" ? SplTokenInfo : LpTokenInfo;
    /**
     * Get list of token list
     */
    getList: () => (SplTokenInfo | LpTokenInfo)[];
}
