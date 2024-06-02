/**
 * https://youmightnotneed.com/lodash/
 */
export function chunkArray(arr, chunkSize = 1, cache = []) {
    const tmp = [...arr];
    if (chunkSize <= 0)
        return cache;
    while (tmp.length)
        cache.push(tmp.splice(0, chunkSize));
    return cache;
}
export function intersection(arr, ...args) {
    return arr.filter((item) => args.every((arr) => arr.includes(item)));
}
export function xor(arr, ...args) {
    return arr.filter((item) => args.every((arr) => !arr.includes(item)));
}
export function uniq(arr) {
    return [...new Set(arr)];
}
//# sourceMappingURL=lodash.js.map