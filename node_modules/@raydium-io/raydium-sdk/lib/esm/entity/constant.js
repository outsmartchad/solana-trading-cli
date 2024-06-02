import BN from 'bn.js';
export var Rounding;
(function (Rounding) {
    Rounding[Rounding["ROUND_DOWN"] = 0] = "ROUND_DOWN";
    Rounding[Rounding["ROUND_HALF_UP"] = 1] = "ROUND_HALF_UP";
    Rounding[Rounding["ROUND_UP"] = 2] = "ROUND_UP";
})(Rounding || (Rounding = {}));
export const ZERO = new BN(0);
export const ONE = new BN(1);
export const TWO = new BN(2);
export const THREE = new BN(3);
export const FIVE = new BN(5);
export const TEN = new BN(10);
export const _100 = new BN(100);
export const _1000 = new BN(1000);
export const _10000 = new BN(10000);
//# sourceMappingURL=constant.js.map