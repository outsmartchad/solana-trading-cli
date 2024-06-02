import { PublicKey } from '@solana/web3.js';
import { PublicKeyish } from '../common';
/**
 * A currency is any fungible financial instrument on Solana, including SOL and all SPL tokens.
 *
 * The only instance of the base class `Currency` is SOL.
 */
export declare class Currency {
    readonly symbol?: string;
    readonly name?: string;
    readonly decimals: number;
    /**
     * The only instance of the base class `Currency`.
     */
    static readonly SOL: Currency;
    /**
     * Constructs an instance of the base class `Currency`. The only instance of the base class `Currency` is `Currency.SOL`.
     * @param decimals - decimals of the currency
     * @param symbol - symbol of the currency
     * @param name - name of the currency
     */
    constructor(decimals: number, symbol?: string, name?: string);
}
export declare function inspectCurrency(): void;
/**
 * Represents an SPL token with a unique address and some metadata.
 */
export declare class Token extends Currency {
    readonly programId: PublicKey;
    readonly mint: PublicKey;
    /**
     * The only instance of the base class `Token`.
     */
    static readonly WSOL: Token;
    constructor(programId: PublicKeyish, mint: PublicKeyish, decimals: number, symbol?: string, name?: string);
    /**
     * Returns true if the two tokens are equivalent, i.e. have the same mint address.
     * @param other - other token to compare
     */
    equals(other: Token): boolean;
}
export declare function inspectToken(): void;
/**
 * Compares two currencies for equality
 */
export declare function currencyEquals(currencyA: Currency, currencyB: Currency): boolean;
//# sourceMappingURL=currency.d.ts.map