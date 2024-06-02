import { Logger } from '../common'

import { LpTokenInfo, SplTokenInfo } from './type'

const logger = Logger.from('token/util')

/**
 * Token list
 */
export class TokenList {
  constructor(private tokenList: (SplTokenInfo | LpTokenInfo)[]) {}

  /**
   * Filter token by mint of token list.
   *
   * @param mint - Token's mint address
   */
  filterByMint = (mint: string) => {
    return this.tokenList.filter((token) => token.mint === mint)
  }

  /**
   * Filter unique token by mint of token list, must and can only have one result.
   */
  filterUniqueByMint = <T extends 'all' | 'spl' | 'lp'>(mint: string, tokenType: T | 'all' | 'spl' | 'lp' = 'all') => {
    const result = this.tokenList.filter((token) => token.mint === mint)

    if (result.length === 0) {
      return logger.throwArgumentError(`No token found`, 'mint', mint)
    } else if (result.length > 1) {
      return logger.throwArgumentError(`Multiple tokens found: ${result.length}`, 'mint', mint)
    }

    const token = result[0]

    if (tokenType === 'spl' && 'version' in token) {
      return logger.throwArgumentError('invalid SPL token mint', 'mint', mint)
    } else if (tokenType === 'lp' && !('version' in token)) {
      return logger.throwArgumentError('invalid LP token mint', 'mint', mint)
    }

    return token as T extends 'all' ? SplTokenInfo | LpTokenInfo : T extends 'spl' ? SplTokenInfo : LpTokenInfo
  }

  /**
   * Get list of token list
   */
  getList = () => {
    return this.tokenList
  }
}
