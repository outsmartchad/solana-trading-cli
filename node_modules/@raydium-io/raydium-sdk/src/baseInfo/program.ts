import { PublicKey } from '@solana/web3.js'

export type ProgramId = {
  SERUM_MARKET: PublicKey
  OPENBOOK_MARKET: PublicKey

  UTIL1216: PublicKey

  FarmV3: PublicKey
  FarmV5: PublicKey
  FarmV6: PublicKey

  AmmV4: PublicKey
  AmmStable: PublicKey

  CLMM: PublicKey

  Router: PublicKey
}

export const MAINNET_PROGRAM_ID: ProgramId = {
  SERUM_MARKET: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
  OPENBOOK_MARKET: new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),

  UTIL1216: new PublicKey('CLaimxFqjHzgTJtAGHU47NPhg6qrc5sCnpC4tBLyABQS'),

  FarmV3: new PublicKey('EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q'),
  FarmV5: new PublicKey('9KEPoZmtHUrBbhWN1v1KWLMkkvwY6WLtAVUCPRtRjP4z'),
  FarmV6: new PublicKey('FarmqiPv5eAj3j1GMdMCMUGXqPUvmquZtMy86QH6rzhG'),

  AmmV4: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
  AmmStable: new PublicKey('5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h'),

  CLMM: new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'),

  Router: new PublicKey('routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS'),
}

export const DEVNET_PROGRAM_ID: ProgramId = {
  SERUM_MARKET: PublicKey.default,
  OPENBOOK_MARKET: new PublicKey('EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj'),

  UTIL1216: PublicKey.default,

  FarmV3: new PublicKey('85BFyr98MbCUU9MVTEgzx1nbhWACbJqLzho6zd6DZcWL'),
  FarmV5: new PublicKey('EcLzTrNg9V7qhcdyXDe2qjtPkiGzDM2UbdRaeaadU5r2'),
  FarmV6: new PublicKey('Farm2hJLcqPtPg8M4rR6DMrsRNc5TPm5Cs4bVQrMe2T7'),

  AmmV4: new PublicKey('HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8'),
  AmmStable: new PublicKey('DDg4VmQaJV9ogWce7LpcjBA9bv22wRp5uaTPa5pGjijF'),

  CLMM: new PublicKey('devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH'),

  Router: new PublicKey('BVChZ3XFEwTMUk1o9i3HAf91H6mFxSwa5X2wFAWhYPhU'),
}
