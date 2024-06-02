/// <reference types="node" />
export interface Layout<T = any, P = ''> {
    span: number;
    property?: P;
    decode(b: Buffer, offset?: number): T;
    encode(src: T, b: Buffer, offset?: number): number;
    getSpan(b: Buffer, offset?: number): number;
    replicate<AP extends string>(name: AP): Layout<T, AP>;
}
export interface LayoutConstructor {
    new <T, P>(): Layout<T, P>;
    new <T, P>(span?: T, property?: P): Layout<T, P>;
    readonly prototype: Layout;
}
export declare const Layout: LayoutConstructor;
export interface Structure<T = any, P = '', DecodeSchema extends {
    [key: string]: any;
} = any> extends Layout<DecodeSchema, P> {
    span: number;
    decode(b: Buffer, offset?: number): DecodeSchema;
    layoutFor<AP extends string>(property: AP): Layout<DecodeSchema[AP]>;
    offsetOf<AP extends string>(property: AP): number;
}
interface StructureConstructor {
    new <T = any, P = '', DecodeSchema extends {
        [key: string]: any;
    } = any>(): Structure<T, P, DecodeSchema>;
    new <T = any, P = '', DecodeSchema extends {
        [key: string]: any;
    } = any>(fields: T, property?: P, decodePrefixes?: boolean): Structure<T, P, DecodeSchema>;
}
export declare const Structure: StructureConstructor;
export interface Union<UnionSchema extends {
    [key: string]: any;
} = any> extends Layout {
    registry: object;
    decode(b: Buffer, offset?: number): Partial<UnionSchema>;
    addVariant(variant: number, layout: Structure<any, any, Partial<UnionSchema>> | Layout<any, keyof UnionSchema>, property?: string): any;
}
interface UnionConstructor {
    new <UnionSchema extends {
        [key: string]: any;
    } = any>(): Union<UnionSchema>;
    new <UnionSchema extends {
        [key: string]: any;
    } = any>(discr: Layout<any, any>, defaultLayout: Layout<any, any>, property?: string): Union<UnionSchema>;
}
export declare const Union: UnionConstructor;
export type BitStructure<T = unknown, P = ''> = Layout<T, P>;
interface BitStructureConstructor {
    new (...params: any[]): BitStructure;
}
export declare const BitStructure: BitStructureConstructor;
export type UInt<T = any, P = ''> = Layout<T, P>;
interface UIntConstructor {
    new <T, P>(span?: T, property?: P): UInt<T, P>;
}
export declare const UInt: UIntConstructor;
export type Blob<P extends string = ''> = Layout<Buffer, P>;
interface BlobConstructor {
    new (...params: ConstructorParameters<LayoutConstructor>): Blob;
}
export declare const Blob: BlobConstructor;
export declare const greedy: <P extends string = "">(elementSpan?: number, property?: P | undefined) => Layout<number, P>;
export declare const u8: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u16: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u24: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u32: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u40: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u48: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const nu64: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u16be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u24be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u32be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u40be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const u48be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const nu64be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s8: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s16: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s24: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s32: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s40: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s48: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const ns64: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s16be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s24be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s32be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s40be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const s48be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const ns64be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const f32: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const f32be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const f64: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const f64be: <P extends string = "">(property?: P | undefined) => Layout<number, P>;
export declare const struct: <T, P extends string = "">(fields: T, property?: P | undefined, decodePrefixes?: boolean) => T extends Layout<infer Value, infer Property>[] ? Structure<Value, P, { [K in Exclude<Extract<Property, string>, "">]: Extract<T[number], Layout<any, K>> extends Layout<infer V, any> ? V : any; }> : any;
export declare const seq: <T, P>(elementLayout: Layout<T, string>, count: number | Layout<number, string>, property?: P | undefined) => Layout<T[], "">;
export declare const union: <UnionSchema extends {
    [key: string]: any;
} = any>(discr: Layout<any, any>, defaultLayout?: any, property?: string) => Union<UnionSchema>;
export declare const unionLayoutDiscriminator: <P extends string = "">(layout: Layout<any, P>, property?: P | undefined) => any;
export declare const blob: <P extends string = "">(length: number | Layout<number, P>, property?: P | undefined) => Blob<P>;
export declare const cstr: <P extends string = "">(property?: P | undefined) => Layout<string, P>;
export declare const utf8: <P extends string = "">(maxSpan: number, property?: P | undefined) => Layout<string, P>;
export declare const bits: <T, P extends string = "">(word: Layout<T, "">, msb?: boolean, property?: P | undefined) => BitStructure<T, P>;
export declare const offset: <T, P extends string = "">(layout: Layout<T, P>, offset?: number, property?: P | undefined) => Layout<T, P>;
export type GetStructureSchema<T extends Structure> = T extends Structure<any, any, infer S> ? S : unknown;
export {};
//# sourceMappingURL=buffer-layout.d.ts.map