import { PublicKey } from '@solana/web3.js';
import { SerumVersion } from './type';
export declare const _SERUM_PROGRAM_ID_V3 = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
export declare const SERUM_PROGRAM_ID_V3: PublicKey;
export declare const SERUM_PROGRAMID_TO_VERSION: {
    [key: string]: SerumVersion;
};
export declare const SERUM_VERSION_TO_PROGRAMID: {
    [key in SerumVersion]?: PublicKey;
} & {
    [K: number]: PublicKey;
};
