/**
 * Defines a scalar enum as a type from its constructor.
 *
 * @example
 * ```ts
 * enum Direction { Left, Right };
 * type DirectionType = ScalarEnum<Direction>;
 * ```
 *
 * @category Utils
 */
export type ScalarEnum<T> =
  | { [key: number | string]: string | number | T }
  | number
  | T;

/**
 * Defines a data enum using discriminated union types.
 *
 * @example
 * ```ts
 * type WebPageEvent =
 *   | { __kind: 'pageview', url: string }
 *   | { __kind: 'click', x: number, y: number };
 * ```
 *
 * @category Utils
 */
export type DataEnum = { __kind: string };

/**
 * Extracts a variant from a data enum.
 *
 * @example
 * ```ts
 * type WebPageEvent =
 *   | { __kind: 'pageview', url: string }
 *   | { __kind: 'click', x: number, y: number };
 * type ClickEvent = GetDataEnumKind<WebPageEvent, 'click'>;
 * // -> { __kind: 'click', x: number, y: number }
 * ```
 *
 * @category Utils
 */
export type GetDataEnumKind<
  T extends DataEnum,
  K extends T['__kind']
> = Extract<T, { __kind: K }>;

/**
 * Extracts a variant from a data enum without its discriminator.
 *
 * @example
 * ```ts
 * type WebPageEvent =
 *   | { __kind: 'pageview', url: string }
 *   | { __kind: 'click', x: number, y: number };
 * type ClickEvent = GetDataEnumKindContent<WebPageEvent, 'click'>;
 * // -> { x: number, y: number }
 * ```
 *
 * @category Utils
 */
export type GetDataEnumKindContent<
  T extends DataEnum,
  K extends T['__kind']
> = Omit<Extract<T, { __kind: K }>, '__kind'>;
