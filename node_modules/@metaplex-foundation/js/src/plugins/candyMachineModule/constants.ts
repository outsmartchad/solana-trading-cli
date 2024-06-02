export const MAX_NAME_LENGTH = 32;
export const MAX_SYMBOL_LENGTH = 10;
export const MAX_URI_LENGTH = 200;
export const MAX_CREATOR_LIMIT = 5;
export const MAX_CREATOR_LEN = 32 + 1 + 1;
export const CONFIG_LINE_SIZE = 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH;

export const CANDY_MACHINE_HIDDEN_SECTION =
  8 + // discriminator
  8 + // features
  32 + // authority
  32 + // mint authority
  32 + // collection mint
  8 + // items redeemed
  8 + // items available (config data)
  4 +
  MAX_SYMBOL_LENGTH + // u32 + max symbol length
  2 + // seller fee basis points
  8 + // max supply
  1 + // is mutable
  4 +
  MAX_CREATOR_LIMIT * MAX_CREATOR_LEN + // u32 + creators vec
  1 + // option (config lines settings)
  4 +
  MAX_NAME_LENGTH + // u32 + max name length
  4 + // name length
  4 +
  MAX_URI_LENGTH + // u32 + max uri length
  4 + // uri length
  1 + // is sequential
  1 + // option (hidden setting)
  4 +
  MAX_NAME_LENGTH + // u32 + max name length
  4 +
  MAX_URI_LENGTH + // u32 + max uri length
  32; // hash

export const CANDY_GUARD_LABEL_SIZE = 6;
export const CANDY_GUARD_DATA =
  8 + // discriminator
  32 + // base
  1 + // bump
  32; // authority
