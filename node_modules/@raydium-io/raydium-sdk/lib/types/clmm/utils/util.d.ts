import BN from 'bn.js';
export declare function u16ToBytes(num: number): Uint8Array;
export declare function i16ToBytes(num: number): Uint8Array;
export declare function u32ToBytes(num: number): Uint8Array;
export declare function i32ToBytes(num: number): Uint8Array;
export declare function leadingZeros(bitNum: number, data: BN): number;
export declare function trailingZeros(bitNum: number, data: BN): number;
export declare function isZero(bitNum: number, data: BN): boolean;
export declare function mostSignificantBit(bitNum: number, data: BN): number | null;
export declare function leastSignificantBit(bitNum: number, data: BN): number | null;
//# sourceMappingURL=util.d.ts.map