import BN from 'bn.js';
export type BigNumberish = BN | string | number | bigint;
export declare function parseBigNumberish(value: BigNumberish): BN;
export declare function tenExponentiate(shift: BigNumberish): BN;
export declare function divCeil(a: BN, b: BN): BN;
