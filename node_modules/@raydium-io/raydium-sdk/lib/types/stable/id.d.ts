import { PublicKey } from '@solana/web3.js';
import { SerumVersion } from '../serum';
import { StableVersion } from './type';
export declare const _STABLE_PROGRAM_ID_V1 = "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h";
export declare const STABLE_PROGRAM_ID_V1: PublicKey;
export declare const STABLE_PROGRAMID_TO_VERSION: {
    [key: string]: StableVersion;
};
export declare const LIQUIDITY_VERSION_TO_SERUM_VERSION: {
    [key in StableVersion]?: SerumVersion;
} & {
    [K: number]: SerumVersion;
};
//# sourceMappingURL=id.d.ts.map