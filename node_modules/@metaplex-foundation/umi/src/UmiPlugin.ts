import type { Umi } from './Umi';

/**
 * Defines a Umi plugin.
 *
 * It contains an `install` method that takes a {@link Umi} instance
 * and extends it with new functionality.
 *
 * @category Context and Interfaces
 */
export type UmiPlugin = {
  install(umi: Umi): void;
};
