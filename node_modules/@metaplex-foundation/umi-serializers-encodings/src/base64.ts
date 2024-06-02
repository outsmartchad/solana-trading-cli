import {
  mapSerializer,
  type Serializer,
} from '@metaplex-foundation/umi-serializers-core';
import { baseXReslice } from './baseXReslice';

/**
 * A string serializer that uses base64 encoding.
 * @category Serializers
 */
export const base64: Serializer<string> = mapSerializer(
  baseXReslice(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    6
  ),
  (value) => value.replace(/=/g, ''),
  (value) => value.padEnd(Math.ceil(value.length / 4) * 4, '=')
);
