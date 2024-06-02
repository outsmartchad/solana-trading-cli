import { NumberSerializer } from '@metaplex-foundation/umi-serializers-numbers';

/**
 * Represents all the size options for array-like serializers
 * — i.e. `array`, `map` and `set`.
 *
 * It can be one of the following:
 * - a {@link NumberSerializer} that prefixes its content with its size.
 * - a fixed number of items.
 * - or `'remainder'` to infer the number of items by dividing
 *   the rest of the buffer by the fixed size of its item.
 *   Note that this option is only available for fixed-size items.
 *
 * @category Serializers
 */
export type ArrayLikeSerializerSize = NumberSerializer | number | 'remainder';
