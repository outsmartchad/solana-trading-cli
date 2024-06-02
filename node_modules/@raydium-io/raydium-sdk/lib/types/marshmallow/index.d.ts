/// <reference types="node" />
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Blob, Layout, UInt, Structure as _Structure, Union as _Union, blob } from './buffer-layout';
export * from './buffer-layout';
export { blob };
export declare class BNLayout<P extends string = ''> extends Layout<BN, P> {
    blob: Layout<Buffer>;
    signed: boolean;
    constructor(span: number, signed: boolean, property?: P);
    /** @override */
    decode(b: Buffer, offset?: number): BN;
    /** @override */
    encode(src: BN, b: Buffer, offset?: number): number;
}
export declare class WideBits<P extends string = ''> extends Layout<Record<string, boolean>, P> {
    _lower: any;
    _upper: any;
    constructor(property?: P);
    addBoolean(property: string): void;
    decode(b: Buffer, offset?: number): Record<string, boolean>;
    encode(src: any, b: Buffer, offset?: number): any;
}
export declare function u8<P extends string = ''>(property?: P): UInt<number, P>;
export declare function u32<P extends string = ''>(property?: P): UInt<number, P>;
export declare function u64<P extends string = ''>(property?: P): BNLayout<P>;
export declare function u128<P extends string = ''>(property?: P): BNLayout<P>;
export declare function i8<P extends string = ''>(property?: P): BNLayout<P>;
export declare function i64<P extends string = ''>(property?: P): BNLayout<P>;
export declare function i128<P extends string = ''>(property?: P): BNLayout<P>;
export declare class WrappedLayout<T, U, P extends string = ''> extends Layout<U, P> {
    layout: Layout<T>;
    decoder: (data: T) => U;
    encoder: (src: U) => T;
    constructor(layout: Layout<T>, decoder: (data: T) => U, encoder: (src: U) => T, property?: P);
    decode(b: Buffer, offset?: number): U;
    encode(src: U, b: Buffer, offset?: number): number;
    getSpan(b: Buffer, offset?: number): number;
}
export declare function publicKey<P extends string = ''>(property?: P): Layout<PublicKey, P>;
export declare class OptionLayout<T, P> extends Layout<T | null, P> {
    layout: Layout<T>;
    discriminator: Layout<number>;
    constructor(layout: Layout<T>, property?: P);
    encode(src: T | null, b: Buffer, offset?: number): number;
    decode(b: Buffer, offset?: number): T | null;
    getSpan(b: Buffer, offset?: number): number;
}
export declare function option<T, P extends string = ''>(layout: Layout<T>, property?: P): Layout<T | null, P>;
export declare function bool<P extends string = ''>(property?: P): Layout<boolean, P>;
export declare function decodeBool(value: number): boolean;
export declare function encodeBool(value: boolean): number;
export declare function vec<T, P extends string = ''>(elementLayout: Layout<T>, property?: P): Layout<T[], P>;
export declare function tagged<T, P extends string = ''>(tag: BN, layout: Layout<T>, property?: P): Layout<T, P>;
export declare function vecU8<P extends string = ''>(property?: P): Layout<Buffer, P>;
export declare function str<P extends string = ''>(property?: P): Layout<string, P>;
export interface EnumLayout<T, P extends string = ''> extends Layout<T, P> {
    registry: Record<string, Layout<any>>;
}
export declare function rustEnum<T, P extends string = ''>(variants: Layout<any>[], property?: P): EnumLayout<T, P>;
export declare function array<T, P extends string = ''>(elementLayout: Layout<T>, length: number, property?: P): Layout<T[], P>;
export declare class Structure<T, P, D extends {
    [key: string]: any;
} = any> extends _Structure<T, P, D> {
    /** @override */
    decode(b: Buffer, offset?: number): D;
}
export declare function struct<T, P extends string = ''>(fields: T, property?: P, decodePrefixes?: boolean): T extends Layout<infer Value, infer Property>[] ? Structure<Value, P, {
    [K in Exclude<Extract<Property, string>, ''>]: Extract<T[number], Layout<any, K>> extends Layout<infer V, any> ? V : any;
}> : any;
export type GetLayoutSchemaFromStructure<T extends Structure<any, any, any>> = T extends Structure<any, any, infer S> ? S : any;
export type GetStructureFromLayoutSchema<S extends {
    [key: string]: any;
} = any> = Structure<any, any, S>;
export declare class Union<Schema extends {
    [key: string]: any;
} = any> extends _Union<Schema> {
    encodeInstruction(instruction: any): Buffer;
    decodeInstruction(instruction: any): Partial<Schema>;
}
export declare function union<UnionSchema extends {
    [key: string]: any;
} = any>(discr: any, defaultLayout?: any, property?: string): Union<UnionSchema>;
declare class Zeros extends Blob {
    decode(b: Buffer, offset: number): Buffer;
}
export declare function zeros(length: number): Zeros;
export declare function seq<T, P extends string = '', AnotherP extends string = ''>(elementLayout: Layout<T, P>, count: number | BN | Layout<BN | number, P>, property?: AnotherP): Layout<T[], AnotherP>;
//# sourceMappingURL=index.d.ts.map