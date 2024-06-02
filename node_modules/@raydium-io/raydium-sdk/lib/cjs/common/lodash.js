"use strict";
/**
 * https://youmightnotneed.com/lodash/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniq = exports.xor = exports.intersection = exports.chunkArray = void 0;
function chunkArray(arr, chunkSize = 1, cache = []) {
    const tmp = [...arr];
    if (chunkSize <= 0)
        return cache;
    while (tmp.length)
        cache.push(tmp.splice(0, chunkSize));
    return cache;
}
exports.chunkArray = chunkArray;
function intersection(arr, ...args) {
    return arr.filter((item) => args.every((arr) => arr.includes(item)));
}
exports.intersection = intersection;
function xor(arr, ...args) {
    return arr.filter((item) => args.every((arr) => !arr.includes(item)));
}
exports.xor = xor;
function uniq(arr) {
    return [...new Set(arr)];
}
exports.uniq = uniq;
//# sourceMappingURL=lodash.js.map