import { NativeTokenInfo, SplTokenInfo } from './type'

export const SOL: NativeTokenInfo = {
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
}

export const WSOL: SplTokenInfo = {
  symbol: 'WSOL',
  name: 'Wrapped SOL',
  mint: 'So11111111111111111111111111111111111111112',
  decimals: 9,
  extensions: {
    coingeckoId: 'solana',
  },
}
