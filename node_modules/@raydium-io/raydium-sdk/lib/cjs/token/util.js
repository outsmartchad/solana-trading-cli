"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenList = void 0;
const common_1 = require("../common");
const logger = common_1.Logger.from('token/util');
/**
 * Token list
 */
class TokenList {
    constructor(tokenList) {
        this.tokenList = tokenList;
        /**
         * Filter token by mint of token list.
         *
         * @param mint - Token's mint address
         */
        this.filterByMint = (mint) => {
            return this.tokenList.filter((token) => token.mint === mint);
        };
        /**
         * Filter unique token by mint of token list, must and can only have one result.
         */
        this.filterUniqueByMint = (mint, tokenType = 'all') => {
            const result = this.tokenList.filter((token) => token.mint === mint);
            if (result.length === 0) {
                return logger.throwArgumentError(`No token found`, 'mint', mint);
            }
            else if (result.length > 1) {
                return logger.throwArgumentError(`Multiple tokens found: ${result.length}`, 'mint', mint);
            }
            const token = result[0];
            if (tokenType === 'spl' && 'version' in token) {
                return logger.throwArgumentError('invalid SPL token mint', 'mint', mint);
            }
            else if (tokenType === 'lp' && !('version' in token)) {
                return logger.throwArgumentError('invalid LP token mint', 'mint', mint);
            }
            return token;
        };
        /**
         * Get list of token list
         */
        this.getList = () => {
            return this.tokenList;
        };
    }
}
exports.TokenList = TokenList;
//# sourceMappingURL=util.js.map