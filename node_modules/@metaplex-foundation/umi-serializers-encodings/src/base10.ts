import type { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { baseX } from './baseX';

/**
 * A string serializer that uses base10 encoding.
 * @category Serializers
 */
export const base10: Serializer<string> = baseX('0123456789');
