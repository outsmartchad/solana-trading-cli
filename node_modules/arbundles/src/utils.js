"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBrowser = exports.arraybufferEqual = exports.byteArrayToLong = exports.longTo32ByteArray = exports.longTo16ByteArray = exports.shortTo2ByteArray = exports.longTo8ByteArray = void 0;
function longTo8ByteArray(long) {
    // we want to represent the input as a 8-bytes array
    const byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let index = 0; index < byteArray.length; index++) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return Uint8Array.from(byteArray);
}
exports.longTo8ByteArray = longTo8ByteArray;
function shortTo2ByteArray(long) {
    if (long > (2 ^ (32 - 1)))
        throw new Error("Short too long");
    // we want to represent the input as a 8-bytes array
    const byteArray = [0, 0];
    for (let index = 0; index < byteArray.length; index++) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return Uint8Array.from(byteArray);
}
exports.shortTo2ByteArray = shortTo2ByteArray;
function longTo16ByteArray(long) {
    // we want to represent the input as a 8-bytes array
    const byteArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let index = 0; index < byteArray.length; index++) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return byteArray;
}
exports.longTo16ByteArray = longTo16ByteArray;
function longTo32ByteArray(long) {
    // we want to represent the input as a 8-bytes array
    const byteArray = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
    ];
    for (let index = 0; index < byteArray.length; index++) {
        const byte = long & 0xff;
        byteArray[index] = byte;
        long = (long - byte) / 256;
    }
    return Uint8Array.from(byteArray);
}
exports.longTo32ByteArray = longTo32ByteArray;
function byteArrayToLong(byteArray) {
    let value = 0;
    for (let i = byteArray.length - 1; i >= 0; i--) {
        value = value * 256 + byteArray[i];
    }
    return value;
}
exports.byteArrayToLong = byteArrayToLong;
function arraybufferEqual(buf1, buf2) {
    const _buf1 = buf1.buffer;
    const _buf2 = buf2.buffer;
    if (_buf1 === _buf2) {
        return true;
    }
    if (_buf1.byteLength !== _buf2.byteLength) {
        return false;
    }
    const view1 = new DataView(_buf1);
    const view2 = new DataView(_buf2);
    let i = _buf1.byteLength;
    while (i--) {
        if (view1.getUint8(i) !== view2.getUint8(i)) {
            return false;
        }
    }
    return true;
}
exports.arraybufferEqual = arraybufferEqual;
exports.isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
//# sourceMappingURL=utils.js.map