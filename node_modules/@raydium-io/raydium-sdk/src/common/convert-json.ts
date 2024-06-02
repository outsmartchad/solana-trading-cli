import { PublicKey } from '@solana/web3.js'
import { BN } from 'bn.js'

import { Currency, CurrencyAmount, Fraction, Percent, Price, TokenAmount } from '../entity'

import { validateAndParsePublicKey } from './pubkey'

type Primitive = boolean | number | string | null | undefined | PublicKey

/**
 *
 * @example
 * ```typescript
 * interface A {
 *   keyA: string;
 *   keyB: string;
 *   map: {
 *     hello: string;
 *     i: number;
 *   };
 *   list: (string | number)[];
 *   keyC: number;
 * }
 *
 * type WrappedA = ReplaceType<A, string, boolean> // {
 *   keyA: boolean;
 *   keyB: boolean;
 *   map: {
 *     hello: boolean;
 *     i: number;
 *   };
 *   list: (number | boolean)[];
 *   keyC: number;
 * }
 * ```
 */
export type ReplaceType<Old, From, To> = {
  [T in keyof Old]: Old[T] extends From // to avoid case: Old[T] is an Object,
    ? Exclude<Old[T], From> | To // when match,  directly replace
    : Old[T] extends Primitive // judge whether need recursively replace
    ? From extends Old[T] // it's an Object
      ? Exclude<Old[T], From> | To // directly replace
      : Old[T] // stay same
    : ReplaceType<Old[T], From, To> // recursively replace
}

function notInnerObject(v: unknown): v is Record<string, any> {
  return (
    typeof v === 'object' &&
    v !== null &&
    ![TokenAmount, PublicKey, Fraction, BN, Currency, CurrencyAmount, Price, Percent].some(
      (o) => typeof o === 'object' && v instanceof o,
    )
  )
}

export function jsonInfo2PoolKeys<T>(jsonInfo: T): ReplaceType<T, string, PublicKey> {
  // @ts-expect-error no need type for inner code
  return typeof jsonInfo === 'string'
    ? validateAndParsePublicKey(jsonInfo)
    : Array.isArray(jsonInfo)
    ? jsonInfo.map((k) => jsonInfo2PoolKeys(k))
    : notInnerObject(jsonInfo)
    ? Object.fromEntries(Object.entries(jsonInfo).map(([k, v]) => [k, jsonInfo2PoolKeys(v)]))
    : jsonInfo
}

export function poolKeys2JsonInfo<T>(jsonInfo: T): ReplaceType<T, PublicKey, string> {
  // @ts-expect-error no need type for inner code
  return jsonInfo instanceof PublicKey
    ? jsonInfo.toBase58()
    : Array.isArray(jsonInfo)
    ? jsonInfo.map((k) => poolKeys2JsonInfo(k))
    : notInnerObject(jsonInfo)
    ? Object.fromEntries(Object.entries(jsonInfo).map(([k, v]) => [k, poolKeys2JsonInfo(v)]))
    : jsonInfo
}
