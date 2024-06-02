/**
 * A generic definition of an AbortSignal that should be compatible with
 * the native AbortSignal interface as well its polyfills.
 *
 * This allows the end-user to prematurely abort
 * a (potentially long-running) request.
 *
 * @category Utils
 */
export interface GenericAbortSignal {
  readonly aborted: boolean;
  onabort?: ((...args: any) => any) | null;
  addEventListener?: (...args: any) => any;
  removeEventListener?: (...args: any) => any;
}
