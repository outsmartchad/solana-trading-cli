import { PublicKey } from '@solana/web3.js'

import { SerumVersion } from './type'

/* ================= program public keys ================= */
export const _SERUM_PROGRAM_ID_V3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'
export const SERUM_PROGRAM_ID_V3 = new PublicKey(_SERUM_PROGRAM_ID_V3)

// serum program id string => serum version
export const SERUM_PROGRAMID_TO_VERSION: {
  [key: string]: SerumVersion
} = {
  [_SERUM_PROGRAM_ID_V3]: 3,
}

// serum version => serum program id
export const SERUM_VERSION_TO_PROGRAMID: { [key in SerumVersion]?: PublicKey } & {
  [K: number]: PublicKey
} = {
  3: SERUM_PROGRAM_ID_V3,
}
