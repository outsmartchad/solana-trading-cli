import { PublicKey } from '@solana/web3.js';
type Primitive = boolean | number | string | null | undefined | PublicKey;
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
    [T in keyof Old]: Old[T] extends From ? Exclude<Old[T], From> | To : Old[T] extends Primitive ? From extends Old[T] ? Exclude<Old[T], From> | To : Old[T] : ReplaceType<Old[T], From, To>;
};
export declare function jsonInfo2PoolKeys<T>(jsonInfo: T): ReplaceType<T, string, PublicKey>;
export declare function poolKeys2JsonInfo<T>(jsonInfo: T): ReplaceType<T, PublicKey, string>;
export {};
