import { IdentitySigner } from '@/types';

export type IdentityDriver = IdentitySigner & {
  secretKey?: Uint8Array;
};
