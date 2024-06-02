import { fromByteArray, toByteArray } from "base64-js";
import BigNumber from "bignumber.js";
export function concatBuffers(buffers) {
    let totalLength = 0;
    for (const b of buffers)
        totalLength += b.byteLength;
    const temp = new Uint8Array(totalLength);
    let offset = 0;
    temp.set(new Uint8Array(buffers[0]), offset);
    offset += buffers[0].byteLength;
    for (let i = 1; i < buffers.length; i++) {
        temp.set(new Uint8Array(buffers[i]), offset);
        offset += buffers[i].byteLength;
    }
    return temp;
}
export function b64UrlToString(b64UrlString) {
    const buffer = b64UrlToBuffer(b64UrlString);
    return bufferToString(buffer);
}
export function bufferToString(buffer) {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}
export function stringToBuffer(string) {
    return new TextEncoder().encode(string);
}
export function stringToB64Url(string) {
    return bufferTob64Url(stringToBuffer(string));
}
export function b64UrlToBuffer(b64UrlString) {
    return new Uint8Array(toByteArray(b64UrlDecode(b64UrlString)));
}
export function bufferTob64(buffer) {
    return fromByteArray(new Uint8Array(buffer));
}
export function bufferTob64Url(buffer) {
    return b64UrlEncode(bufferTob64(buffer));
}
export function b64UrlEncode(b64UrlString) {
    return b64UrlString.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
}
export function b64UrlDecode(b64UrlString) {
    b64UrlString = b64UrlString.replace(/\-/g, "+").replace(/\_/g, "/");
    let padding;
    b64UrlString.length % 4 == 0 ? (padding = 0) : (padding = 4 - (b64UrlString.length % 4));
    return b64UrlString.concat("=".repeat(padding));
}
export function winstonToAr(winston) {
    return new BigNumber(winston).shiftedBy(-12);
}
export function arToWinston(ar) {
    return new BigNumber(ar).shiftedBy(12);
}
//# sourceMappingURL=utils.js.map