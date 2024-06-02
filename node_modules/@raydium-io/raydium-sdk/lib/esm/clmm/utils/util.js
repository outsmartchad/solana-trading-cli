export function u16ToBytes(num) {
    const arr = new ArrayBuffer(2);
    const view = new DataView(arr);
    view.setUint16(0, num, false);
    return new Uint8Array(arr);
}
export function i16ToBytes(num) {
    const arr = new ArrayBuffer(2);
    const view = new DataView(arr);
    view.setInt16(0, num, false);
    return new Uint8Array(arr);
}
export function u32ToBytes(num) {
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setUint32(0, num, false);
    return new Uint8Array(arr);
}
export function i32ToBytes(num) {
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setInt32(0, num, false);
    return new Uint8Array(arr);
}
export function leadingZeros(bitNum, data) {
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
export function trailingZeros(bitNum, data) {
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
export function isZero(bitNum, data) {
    for (let i = 0; i < bitNum; i++) {
        if (data.testn(i))
            return false;
    }
    return true;
}
export function mostSignificantBit(bitNum, data) {
    if (isZero(bitNum, data))
        return null;
    else
        return leadingZeros(bitNum, data);
}
export function leastSignificantBit(bitNum, data) {
    if (isZero(bitNum, data))
        return null;
    else
        return trailingZeros(bitNum, data);
}
//# sourceMappingURL=util.js.map