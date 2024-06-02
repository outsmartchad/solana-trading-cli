import BN from 'bn.js'

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export const ZERO = new BN(0)
export const ONE = new BN(1)
export const TWO = new BN(2)
export const THREE = new BN(3)
export const FIVE = new BN(5)
export const TEN = new BN(10)
export const _100 = new BN(100)
export const _1000 = new BN(1000)
export const _10000 = new BN(10000)
