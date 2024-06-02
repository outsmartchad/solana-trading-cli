import { Context, createNullContext } from './Context';
import type { UmiPlugin } from './UmiPlugin';

/**
 * A Umi context object that uses all of the interfaces provided by Umi.
 * Once created, the end-user can pass this object to any function that
 * requires some or all of these interfaces.
 *
 * It implements the {@link Context} interface and adds a `use` method
 * that allows plugins to be installed.
 *
 * @category Context and Interfaces
 */
export interface Umi extends Context {
  /** Installs a Umi plugin. */
  use(plugin: UmiPlugin): Umi;
}

/**
 * Creates a Umi instance using only Null implementations of the interfaces.
 * The `use` method can then be used to install plugins and replace the
 * Null implementations with real implementations.
 *
 * @category Context and Interfaces
 */
export const createUmi = (): Umi => ({
  ...createNullContext(),
  use(plugin: UmiPlugin) {
    plugin.install(this);
    return this;
  },
});
