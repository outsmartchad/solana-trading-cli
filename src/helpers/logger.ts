/**
 * Structured logger — zero dependencies, tagged console output.
 *
 * Usage:
 *   import { log } from "./helpers/logger";
 *   log.info("connected");   // [info] connected
 *   log.debug("payload", x); // only prints when DEBUG=1 or OUTSMART_DEBUG=1
 */

function isDebugEnabled(): boolean {
  return process.env.DEBUG === "1" || process.env.OUTSMART_DEBUG === "1";
}

export const log = {
  info(msg: string): void {
    console.log(`[info] ${msg}`);
  },
  warn(msg: string): void {
    console.error(`[warn] ${msg}`);
  },
  error(msg: string): void {
    console.error(`[error] ${msg}`);
  },
  debug(msg: string): void {
    if (isDebugEnabled()) {
      console.log(`[debug] ${msg}`);
    }
  },
  success(msg: string): void {
    console.log(`[ok] ${msg}`);
  },
};

/**
 * Backward-compatible alias — existing code imports `{ logger }` and calls
 * `logger.info(...)`. This keeps those call-sites working without changes.
 */
export const logger = log;
