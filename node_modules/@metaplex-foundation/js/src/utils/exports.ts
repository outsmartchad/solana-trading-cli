/**
 * This method is necessary to import certain packages on both ESM and CJS modules.
 * Without this, we get a different structure on each module. For instance:
 * - CJS: { default: [Getter], WebBundlr: [Getter] }
 * - ESM: { default: { default: [Getter], WebBundlr: [Getter] } }
 * This method fixes this by ensure there is not double default in the imported package.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function _removeDoubleDefault<T>(pkg: T): T {
  if (
    pkg &&
    typeof pkg === 'object' &&
    'default' in pkg &&
    'default' in (pkg as any).default
  ) {
    return (pkg as any).default;
  }

  return pkg;
}
