"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leastSignificantBit = exports.mostSignificantBit = exports.isZero = exports.trailingZeros = exports.leadingZeros = exports.i32ToBytes = exports.u32ToBytes = exports.i16ToBytes = exports.u16ToBytes = void 0;
function u16ToBytes(num) {
    const arr = new ArrayBuffer(2);
    const view = new DataView(arr);
    view.setUint16(0, num, false);
    return new Uint8Array(arr);
}
exports.u16ToBytes = u16ToBytes;
function i16ToBytes(num) {
    const arr = new ArrayBuffer(2);
    const view = new DataView(arr);
    view.setInt16(0, num, false);
    return new Uint8Array(arr);
}
exports.i16ToBytes = i16ToBytes;
function u32ToBytes(num) {
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setUint32(0, num, false);
    return new Uint8Array(arr);
}
exports.u32ToBytes = u32ToBytes;
function i32ToBytes(num) {
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setInt32(0, num, false);
    return new Uint8Array(arr);
}
exports.i32ToBytes = i32ToBytes;
function leadingZeros(bitNum, data) {
    let i = 0;
    for (let j = bitNum - 1; j >= 0; j--) {
        if (!data.testn(j)) {
            i++;
        }
        else {
            break;
        }
    }
    return i;
}
exports.leadingZeros = leadingZeros;
function trailingZeros(bitNum, data) {
    let i = 0;
    for (let j = 0; j < bitNum; j++) {
        if (!data.testn(j)) {
            i++;
        }
        else {
            break;
        }
    }
    return i;
}
exports.trailingZeros = trailingZeros;
function isZero(bitNum, data) {
    for (let i = 0; i < bitNum; i++) {
        if (data.testn(i))
            return false;
    }
    return true;
}
exports.isZero = isZero;
function mostSignificantBit(bitNum, data) {
    if (isZero(bitNum, data))
        return null;
    else
        return leadingZeros(bitNum, data);
}
exports.mostSignificantBit = mostSignificantBit;
function leastSignificantBit(bitNum, data) {
    if (isZero(bitNum, data))
        return null;
    else
        return trailingZeros(bitNum, data);
}
exports.leastSignificantBit = leastSignificantBit;
//# sourceMappingURL=util.js.map