import {
  bits as _bits,
  BitStructure as _BitStructure,
  blob as _blob,
  Blob as _Blob,
  cstr as _cstr,
  f32 as _f32,
  f32be as _f32be,
  f64 as _f64,
  f64be as _f64be,
  greedy as _greedy,
  Layout as _Layout,
  ns64 as _ns64,
  ns64be as _ns64be,
  nu64 as _nu64,
  nu64be as _nu64be,
  offset as _offset,
  s16 as _s16,
  s16be as _s16be,
  s24 as _s24,
  s24be as _s24be,
  s32 as _s32,
  s32be as _s32be,
  s40 as _s40,
  s40be as _s40be,
  s48 as _s48,
  s48be as _s48be,
  s8 as _s8,
  seq as _seq,
  struct as _struct,
  Structure as _Structure,
  u16 as _u16,
  u16be as _u16be,
  u24 as _u24,
  u24be as _u24be,
  u32 as _u32,
  u32be as _u32be,
  u40 as _u40,
  u40be as _u40be,
  u48 as _u48,
  u48be as _u48be,
  u8 as _u8,
  UInt as _UInt,
  union as _union,
  Union as _Union,
  unionLayoutDiscriminator as _unionLayoutDiscriminator,
  utf8 as _utf8,
} from '@solana/buffer-layout'

//#region ------------------- Layout -------------------
export interface Layout<T = any, P = ''> {
  span: number
  property?: P
  decode(b: Buffer, offset?: number): T
  encode(src: T, b: Buffer, offset?: number): number
  getSpan(b: Buffer, offset?: number): number
  replicate<AP extends string>(name: AP): Layout<T, AP>
}
export interface LayoutConstructor {
  new <T, P>(): Layout<T, P> // for class extends syntex
  new <T, P>(span?: T, property?: P): Layout<T, P>
  readonly prototype: Layout
}
export const Layout = _Layout as unknown as LayoutConstructor
//#endregion

//#region ------------------- Structure -------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Structure<T = any, P = '', DecodeSchema extends { [key: string]: any } = any>
  extends Layout<DecodeSchema, P> {
  span: number
  decode(b: Buffer, offset?: number): DecodeSchema
  layoutFor<AP extends string>(property: AP): Layout<DecodeSchema[AP]>
  offsetOf<AP extends string>(property: AP): number
}
interface StructureConstructor {
  new <T = any, P = '', DecodeSchema extends { [key: string]: any } = any>(): Structure<T, P, DecodeSchema>
  new <T = any, P = '', DecodeSchema extends { [key: string]: any } = any>(
    fields: T,
    property?: P,
    decodePrefixes?: boolean,
  ): Structure<T, P, DecodeSchema>
}
export const Structure = _Structure as unknown as StructureConstructor
//#endregion

//#region ------------------- Union -------------------
export interface Union<UnionSchema extends { [key: string]: any } = any> extends Layout {
  registry: object
  decode(b: Buffer, offset?: number): Partial<UnionSchema>
  addVariant(
    variant: number,
    layout: Structure<any, any, Partial<UnionSchema>> | Layout<any, keyof UnionSchema>,
    property?: string,
  ): any /* TEMP: code in Layout.js 1809 */
}
interface UnionConstructor {
  new <UnionSchema extends { [key: string]: any } = any>(): Union<UnionSchema>
  new <UnionSchema extends { [key: string]: any } = any>(
    discr: Layout<any, any>,
    defaultLayout: Layout<any, any>,
    property?: string,
  ): Union<UnionSchema>
}
export const Union = _Union as unknown as UnionConstructor
//#endregion

//#region ------------------- BitStructure -------------------
export type BitStructure<T = unknown /* TEMP */, P = ''> = Layout<T, P>
interface BitStructureConstructor {
  new (...params: any[]): BitStructure
}
export const BitStructure = _BitStructure as BitStructureConstructor
//#endregion

//#region ------------------- UInt -------------------
export type UInt<T = any, P = ''> = Layout<T, P>
interface UIntConstructor {
  new <T, P>(span?: T, property?: P): UInt<T, P>
}
export const UInt = _UInt as UIntConstructor
//#endregion

//#region ------------------- Blob -------------------
export type Blob<P extends string = ''> = Layout<Buffer, P>
interface BlobConstructor {
  new (...params: ConstructorParameters<LayoutConstructor>): Blob
}
export const Blob = _Blob as unknown as BlobConstructor
//#endregion

export const greedy = _greedy as <P extends string = ''>(elementSpan?: number, property?: P) => Layout<number, P>
export const u8 = _u8 as <P extends string = ''>(property?: P) => Layout<number, P>
export const u16 = _u16 as <P extends string = ''>(property?: P) => Layout<number, P>
export const u24 = _u24 as <P extends string = ''>(property?: P) => Layout<number, P>
export const u32 = _u32 as <P extends string = ''>(property?: P) => Layout<number, P>
export const u40 = _u40 as <P extends string = ''>(property?: P) => Layout<number, P>
export const u48 = _u48 as <P extends string = ''>(property?: P) => Layout<number, P>
export const nu64 = _nu64 as <P extends string = ''>(property?: P) => Layout<number, P>
export const u16be = _u16be as <P extends string = ''>(property?: P) => Layout<number, P>
export const u24be = _u24be as <P extends string = ''>(property?: P) => Layout<number, P>
export const u32be = _u32be as <P extends string = ''>(property?: P) => Layout<number, P>
export const u40be = _u40be as <P extends string = ''>(property?: P) => Layout<number, P>
export const u48be = _u48be as <P extends string = ''>(property?: P) => Layout<number, P>
export const nu64be = _nu64be as <P extends string = ''>(property?: P) => Layout<number, P>
export const s8 = _s8 as <P extends string = ''>(property?: P) => Layout<number, P>
export const s16 = _s16 as <P extends string = ''>(property?: P) => Layout<number, P>
export const s24 = _s24 as <P extends string = ''>(property?: P) => Layout<number, P>
export const s32 = _s32 as <P extends string = ''>(property?: P) => Layout<number, P>
export const s40 = _s40 as <P extends string = ''>(property?: P) => Layout<number, P>
export const s48 = _s48 as <P extends string = ''>(property?: P) => Layout<number, P>
export const ns64 = _ns64 as <P extends string = ''>(property?: P) => Layout<number, P>
export const s16be = _s16be as <P extends string = ''>(property?: P) => Layout<number, P>
export const s24be = _s24be as <P extends string = ''>(property?: P) => Layout<number, P>
export const s32be = _s32be as <P extends string = ''>(property?: P) => Layout<number, P>
export const s40be = _s40be as <P extends string = ''>(property?: P) => Layout<number, P>
export const s48be = _s48be as <P extends string = ''>(property?: P) => Layout<number, P>
export const ns64be = _ns64be as <P extends string = ''>(property?: P) => Layout<number, P>
export const f32 = _f32 as <P extends string = ''>(property?: P) => Layout<number, P>
export const f32be = _f32be as <P extends string = ''>(property?: P) => Layout<number, P>
export const f64 = _f64 as <P extends string = ''>(property?: P) => Layout<number, P>
export const f64be = _f64be as <P extends string = ''>(property?: P) => Layout<number, P>
export const struct = _struct as <T, P extends string = ''>(
  fields: T,
  property?: P,
  decodePrefixes?: boolean,
) => T extends Layout<infer Value, infer Property>[]
  ? Structure<
      Value,
      P,
      {
        [K in Exclude<Extract<Property, string>, ''>]: Extract<T[number], Layout<any, K>> extends Layout<infer V, any>
          ? V
          : any
      }
    >
  : any

export const seq = _seq as unknown as <T, P>(
  elementLayout: Layout<T, string>,
  count: number | Layout<number, string>,
  property?: P,
) => Layout<T[]>
export const union = _union as <UnionSchema extends { [key: string]: any } = any>(
  discr: Layout<any, any>,
  defaultLayout?: any,
  property?: string,
) => Union<UnionSchema>
export const unionLayoutDiscriminator = _unionLayoutDiscriminator as <P extends string = ''>(
  layout: Layout<any, P>,
  property?: P,
) => any
export const blob = _blob as unknown as <P extends string = ''>(
  length: number | Layout<number, P>,
  property?: P,
) => Blob<P>
export const cstr = _cstr as <P extends string = ''>(property?: P) => Layout<string, P>
export const utf8 = _utf8 as <P extends string = ''>(maxSpan: number, property?: P) => Layout<string, P>
export const bits = _bits as unknown as <T, P extends string = ''>(
  word: Layout<T>,
  msb?: boolean,
  property?: P,
) => BitStructure<T, P> // TODO: not quite sure
export const offset = _offset as unknown as <T, P extends string = ''>(
  layout: Layout<T, P>,
  offset?: number,
  property?: P,
) => Layout<T, P>

export type GetStructureSchema<T extends Structure> = T extends Structure<any, any, infer S> ? S : unknown
