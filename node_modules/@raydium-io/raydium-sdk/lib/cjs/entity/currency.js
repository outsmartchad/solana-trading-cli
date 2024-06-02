"use strict";
/* eslint-disable @typescript-eslint/ban-ts-comment */
Object.defineProperty(exports, "__esModule", { value: true });
exports.currencyEquals = exports.inspectToken = exports.Token = exports.inspectCurrency = exports.Currency = void 0;
const common_1 = require("../common");
const token_1 = require("../token");
/**
 * A currency is any fungible financial instrument on Solana, including SOL and all SPL tokens.
 *
 * The only instance of the base class `Currency` is SOL.
 */
class Currency {
    /**
     * Constructs an instance of the base class `Currency`. The only instance of the base class `Currency` is `Currency.SOL`.
     * @param decimals - decimals of the currency
     * @param symbol - symbol of the currency
     * @param name - name of the currency
     */
    constructor(decimals, symbol = 'UNKNOWN', name = 'UNKNOWN') {
        this.decimals = decimals;
        this.symbol = symbol;
        this.name = name;
    }
}
exports.Currency = Currency;
/**
 * The only instance of the base class `Currency`.
 */
Currency.SOL = new Currency(token_1.SOL.decimals, token_1.SOL.symbol, token_1.SOL.name);
function inspectCurrency() {
    // @ts-ignore
    Currency.prototype.inspect = function () {
        return `<Currency: decimals=${this.decimals}, name=${this.name}, symbol=${this.symbol}>`;
    };
}
exports.inspectCurrency = inspectCurrency;
/**
 * Represents an SPL token with a unique address and some metadata.
 */
class Token extends Currency {
    constructor(programId, mint, decimals, symbol = 'UNKNOWN', name = 'UNKNOWN') {
        super(decimals, symbol, name);
        this.programId = (0, common_1.validateAndParsePublicKey)(programId);
        this.mint = (0, common_1.validateAndParsePublicKey)(mint);
    }
    /**
     * Returns true if the two tokens are equivalent, i.e. have the same mint address.
     * @param other - other token to compare
     */
    equals(other) {
        // short circuit on reference equality
        if (this === other) {
            return true;
        }
        return this.mint.equals(other.mint);
    }
}
exports.Token = Token;
/**
 * The only instance of the base class `Token`.
 */
Token.WSOL = new Token(common_1.TOKEN_PROGRAM_ID, token_1.WSOL.mint, token_1.WSOL.decimals, token_1.SOL.symbol, token_1.SOL.name);
function inspectToken() {
    // @ts-ignore
    Token.prototype.inspect = function () {
        return `<Token: mint=${this.mint.toBase58()}, decimals=${this.decimals}, name=${this.name}, symbol=${this.symbol}>`;
    };
}
exports.inspectToken = inspectToken;
/**
 * Compares two currencies for equality
 */
function currencyEquals(currencyA, currencyB) {
    if (currencyA instanceof Token && currencyB instanceof Token) {
        return currencyA.equals(currencyB);
    }
    else if (currencyA instanceof Token || currencyB instanceof Token) {
        return false;
    }
    else {
        return currencyA === currencyB;
    }
}
exports.currencyEquals = currencyEquals;
//# sourceMappingURL=currency.js.map