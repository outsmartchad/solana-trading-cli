import { PublicKey } from '@solana/web3.js'
import BN, { isBN } from 'bn.js'

import {
  Blob,
  Layout,
  UInt,
  Structure as _Structure,
  Union as _Union,
  offset as _offset,
  seq as _seq,
  u32 as _u32,
  u8 as _u8,
  union as _union,
  bits,
  blob,
} from './buffer-layout'

export * from './buffer-layout'
export { blob }

export class BNLayout<P extends string = ''> extends Layout<BN, P> {
  blob: Layout<Buffer>
  signed: boolean

  constructor(span: number, signed: boolean, property?: P) {
    //@ts-expect-error type wrong for super()'s type different from extends, but it desn't matter
    super(span, property)
    this.blob = blob(span)
    this.signed = signed
  }

  /** @override */
  decode(b: Buffer, offset = 0) {
    const num = new BN(this.blob.decode(b, offset), 10, 'le')
    if (this.signed) {
      return num.fromTwos(this.span * 8).clone()
    }
    return num
  }

  /** @override */
  encode(src: BN, b: Buffer, offset = 0) {
    if (typeof src === 'number') src = new BN(src) // src will pass a number accidently in union
    if (this.signed) {
      src = src.toTwos(this.span * 8)
    }
    return this.blob.encode(src.toArrayLike(Buffer, 'le', this.span), b, offset)
  }
}

export class WideBits<P extends string = ''> extends Layout<Record<string, boolean>, P> {
  _lower: any
  _upper: any
  // TODO: unknown
  constructor(property?: P) {
    //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
    super(8, property)
    this._lower = bits(_u32(), false)
    this._upper = bits(_u32(), false)
  }

  addBoolean(property: string) {
    if (this._lower.fields.length < 32) {
      this._lower.addBoolean(property)
    } else {
      this._upper.addBoolean(property)
    }
  }

  decode(b: Buffer, offset = 0): Record<string, boolean> {
    const lowerDecoded = this._lower.decode(b, offset)
    const upperDecoded = this._upper.decode(b, offset + this._lower.span)
    return { ...lowerDecoded, ...upperDecoded }
  }

  encode(src: any /* TEMP */, b: Buffer, offset = 0) {
    return this._lower.encode(src, b, offset) + this._upper.encode(src, b, offset + this._lower.span)
  }
}

export function u8<P extends string = ''>(property?: P): UInt<number, P> {
  return new UInt(1, property)
}

export function u32<P extends string = ''>(property?: P): UInt<number, P> {
  return new UInt(4, property)
}

export function u64<P extends string = ''>(property?: P): BNLayout<P> {
  return new BNLayout(8, false, property)
}

export function u128<P extends string = ''>(property?: P): BNLayout<P> {
  return new BNLayout(16, false, property)
}

export function i8<P extends string = ''>(property?: P): BNLayout<P> {
  return new BNLayout(1, true, property)
}

export function i64<P extends string = ''>(property?: P): BNLayout<P> {
  return new BNLayout(8, true, property)
}

export function i128<P extends string = ''>(property?: P): BNLayout<P> {
  return new BNLayout(16, true, property)
}

export class WrappedLayout<T, U, P extends string = ''> extends Layout<U, P> {
  layout: Layout<T>
  decoder: (data: T) => U
  encoder: (src: U) => T

  constructor(layout: Layout<T>, decoder: (data: T) => U, encoder: (src: U) => T, property?: P) {
    //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
    super(layout.span, property)
    this.layout = layout
    this.decoder = decoder
    this.encoder = encoder
  }

  decode(b: Buffer, offset?: number): U {
    return this.decoder(this.layout.decode(b, offset))
  }

  encode(src: U, b: Buffer, offset?: number): number {
    return this.layout.encode(this.encoder(src), b, offset)
  }

  getSpan(b: Buffer, offset?: number): number {
    return this.layout.getSpan(b, offset)
  }
}

export function publicKey<P extends string = ''>(property?: P): Layout<PublicKey, P> {
  return new WrappedLayout(
    blob(32),
    (b: Buffer) => new PublicKey(b),
    (key: PublicKey) => key.toBuffer(),
    property,
  )
}

export class OptionLayout<T, P> extends Layout<T | null, P> {
  layout: Layout<T>
  discriminator: Layout<number>

  constructor(layout: Layout<T>, property?: P) {
    //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
    super(-1, property)
    this.layout = layout
    this.discriminator = _u8()
  }

  encode(src: T | null, b: Buffer, offset = 0): number {
    if (src === null || src === undefined) {
      return this.discriminator.encode(0, b, offset)
    }
    this.discriminator.encode(1, b, offset)
    return this.layout.encode(src, b, offset + 1) + 1
  }

  decode(b: Buffer, offset = 0): T | null {
    const discriminator = this.discriminator.decode(b, offset)
    if (discriminator === 0) {
      return null
    } else if (discriminator === 1) {
      return this.layout.decode(b, offset + 1)
    }
    throw new Error('Invalid option ' + this.property)
  }

  getSpan(b: Buffer, offset = 0): number {
    const discriminator = this.discriminator.decode(b, offset)
    if (discriminator === 0) {
      return 1
    } else if (discriminator === 1) {
      return this.layout.getSpan(b, offset + 1) + 1
    }
    throw new Error('Invalid option ' + this.property)
  }
}

export function option<T, P extends string = ''>(layout: Layout<T>, property?: P): Layout<T | null, P> {
  return new OptionLayout<T, P>(layout, property)
}

export function bool<P extends string = ''>(property?: P): Layout<boolean, P> {
  return new WrappedLayout(_u8(), decodeBool, encodeBool, property)
}

export function decodeBool(value: number): boolean {
  if (value === 0) {
    return false
  } else if (value === 1) {
    return true
  }
  throw new Error('Invalid bool: ' + value)
}

export function encodeBool(value: boolean): number {
  return value ? 1 : 0
}

export function vec<T, P extends string = ''>(elementLayout: Layout<T>, property?: P): Layout<T[], P> {
  const length = _u32('length')
  const layout: Layout<{ values: T[] }> = struct([
    length,
    seq(elementLayout, _offset(length, -length.span), 'values'),
  ]) as any // Something I don't know
  return new WrappedLayout(
    layout,
    ({ values }) => values,
    (values) => ({ values }),
    property,
  )
}

export function tagged<T, P extends string = ''>(tag: BN, layout: Layout<T>, property?: P): Layout<T, P> {
  const wrappedLayout: Layout<{ tag: BN; data: T }> = struct([u64('tag'), layout.replicate('data')]) as any // Something I don't know

  function decodeTag({ tag: receivedTag, data }: { tag: BN; data: T }) {
    if (!receivedTag.eq(tag)) {
      throw new Error('Invalid tag, expected: ' + tag.toString('hex') + ', got: ' + receivedTag.toString('hex'))
    }
    return data
  }

  return new WrappedLayout(wrappedLayout, decodeTag, (data) => ({ tag, data }), property)
}

export function vecU8<P extends string = ''>(property?: P): Layout<Buffer, P> {
  const length = _u32('length')
  const layout: Layout<{ data: Buffer }> = struct([length, blob(_offset(length, -length.span), 'data')]) as any // Something I don't know
  return new WrappedLayout(
    layout,
    ({ data }) => data,
    (data) => ({ data }),
    property,
  )
}

export function str<P extends string = ''>(property?: P): Layout<string, P> {
  return new WrappedLayout(
    vecU8(),
    (data) => data.toString('utf-8'),
    (s) => Buffer.from(s, 'utf-8'),
    property,
  )
}

export interface EnumLayout<T, P extends string = ''> extends Layout<T, P> {
  registry: Record<string, Layout<any>>
}

export function rustEnum<T, P extends string = ''>(variants: Layout<any>[], property?: P): EnumLayout<T, P> {
  const unionLayout = _union(_u8(), property)
  variants.forEach((variant, index) => unionLayout.addVariant(index, variant, variant.property))
  return unionLayout as any // ?why use UnionLayout? This must be a fault
}

export function array<T, P extends string = ''>(
  elementLayout: Layout<T>,
  length: number,
  property?: P,
): Layout<T[], P> {
  const layout = struct([seq(elementLayout, length, 'values')]) as any as Layout<{ values: T[] }> // Something I don't know
  return new WrappedLayout(
    layout,
    ({ values }) => values,
    (values) => ({ values }),
    property,
  )
}

export class Structure<T, P, D extends { [key: string]: any } = any> extends _Structure<T, P, D> {
  /** @override */
  decode(b: Buffer, offset?: number) {
    return super.decode(b, offset)
  }
}

export function struct<T, P extends string = ''>(
  fields: T,
  property?: P,
  decodePrefixes?: boolean,
): T extends Layout<infer Value, infer Property>[]
  ? Structure<
      Value,
      P,
      {
        [K in Exclude<Extract<Property, string>, ''>]: Extract<T[number], Layout<any, K>> extends Layout<infer V, any>
          ? V
          : any
      }
    >
  : any {
  //@ts-expect-error this type is not quite satisfied the define, but, never no need to worry about.
  return new Structure(fields, property, decodePrefixes)
}

export type GetLayoutSchemaFromStructure<T extends Structure<any, any, any>> = T extends Structure<any, any, infer S>
  ? S
  : any
export type GetStructureFromLayoutSchema<S extends { [key: string]: any } = any> = Structure<any, any, S>

export class Union<Schema extends { [key: string]: any } = any> extends _Union<Schema> {
  encodeInstruction(instruction: any): Buffer {
    const instructionMaxSpan = Math.max(...Object.values(this.registry).map((r) => r.span))
    const b = Buffer.alloc(instructionMaxSpan)
    return b.slice(0, this.encode(instruction, b))
  }

  decodeInstruction(instruction: any) {
    return this.decode(instruction)
  }
}
export function union<UnionSchema extends { [key: string]: any } = any>(
  discr: any,
  defaultLayout?: any,
  property?: string,
): Union<UnionSchema> {
  return new Union(discr, defaultLayout, property)
}

class Zeros extends Blob {
  decode(b: Buffer, offset: number) {
    const slice = super.decode(b, offset)
    if (!slice.every((v) => v === 0)) {
      throw new Error('nonzero padding bytes')
    }
    return slice
  }
}

export function zeros(length: number) {
  return new Zeros(length)
}

export function seq<T, P extends string = '', AnotherP extends string = ''>(
  elementLayout: Layout<T, P>,
  count: number | BN | Layout<BN | number, P>,
  property?: AnotherP,
): Layout<T[], AnotherP> {
  let parsedCount: number
  const superCount =
    typeof count === 'number'
      ? count
      : isBN(count)
      ? count.toNumber()
      : new Proxy(count as unknown as Layout<number> /* pretend to be Layout<number> */, {
          get(target, property) {
            if (!parsedCount) {
              // get count in targetLayout. note that count may be BN
              const countProperty = Reflect.get(target, 'count')

              // let targetLayout's  property:count be a number
              parsedCount = isBN(countProperty) ? countProperty.toNumber() : countProperty

              // record the count
              Reflect.set(target, 'count', parsedCount)
            }
            return Reflect.get(target, property)
          },
          set(target, property, value) {
            if (property === 'count') {
              parsedCount = value
            }
            return Reflect.set(target, property, value)
          },
        })

  // @ts-expect-error force type
  return _seq(elementLayout, superCount, property)
}
