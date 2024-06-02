export function maxSerializerSizes(sizes: (number | null)[]): number | null {
  return sizes.reduce(
    (all, size) => (all === null || size === null ? null : Math.max(all, size)),
    0 as number | null
  );
}
