import BN from 'bn.js';
export declare const NEGATIVE_ONE: BN;
export declare const Q64: BN;
export declare const Q128: BN;
export declare const MaxU64: BN;
export declare const U64Resolution = 64;
export declare const MaxUint128: BN;
export declare const MIN_TICK = -443636;
export declare const MAX_TICK: number;
export declare const MIN_SQRT_PRICE_X64: BN;
export declare const MAX_SQRT_PRICE_X64: BN;
export declare const BIT_PRECISION = 16;
export declare const LOG_B_2_X32 = "59543866431248";
export declare const LOG_B_P_ERR_MARGIN_LOWER_X64 = "184467440737095516";
export declare const LOG_B_P_ERR_MARGIN_UPPER_X64 = "15793534762490258745";
export declare const FEE_RATE_DENOMINATOR: BN;
export declare enum Fee {
    rate_500 = 500,//  500 / 10e6 = 0.0005
    rate_3000 = 3000,// 3000/ 10e6 = 0.003
    rate_10000 = 10000
}
export declare const TICK_SPACINGS: {
    [amount in Fee]: number;
};
export declare const U64_IGNORE_RANGE: BN;
//# sourceMappingURL=constants.d.ts.map