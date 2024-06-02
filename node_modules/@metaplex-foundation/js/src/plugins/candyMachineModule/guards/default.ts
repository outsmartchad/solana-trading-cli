import { AddressGateGuardSettings } from './addressGate';
import {
  AllowListGuardRouteSettings,
  AllowListGuardSettings,
} from './allowList';
import { BotTaxGuardSettings } from './botTax';
import {
  CandyGuardsMintSettings,
  CandyGuardsRouteSettings,
  CandyGuardsSettings,
} from './core';
import { EndDateGuardSettings } from './endDate';
import {
  GatekeeperGuardMintSettings,
  GatekeeperGuardSettings,
} from './gatekeeper';
import { MintLimitGuardSettings } from './mintLimit';
import { NftBurnGuardMintSettings, NftBurnGuardSettings } from './nftBurn';
import { NftGateGuardMintSettings, NftGateGuardSettings } from './nftGate';
import {
  NftPaymentGuardMintSettings,
  NftPaymentGuardSettings,
} from './nftPayment';
import { ProgramGateGuardSettings } from './programGate';
import { RedeemedAmountGuardSettings } from './redeemedAmount';
import { SolPaymentGuardSettings } from './solPayment';
import { StartDateGuardSettings } from './startDate';
import {
  ThirdPartySignerGuardMintSettings,
  ThirdPartySignerGuardSettings,
} from './thirdPartySigner';
import { TokenBurnGuardSettings } from './tokenBurn';
import { TokenGateGuardSettings } from './tokenGate';
import { TokenPaymentGuardSettings } from './tokenPayment';
import {
  FreezeSolPaymentGuardRouteSettings,
  FreezeSolPaymentGuardSettings,
} from './freezeSolPayment';
import {
  FreezeTokenPaymentGuardRouteSettings,
  FreezeTokenPaymentGuardSettings,
} from './freezeTokenPayment';
import { Option } from '@/utils';

/**
 * The settings for all default Candy Machine guards.
 */
export type DefaultCandyGuardSettings = CandyGuardsSettings & {
  botTax: Option<BotTaxGuardSettings>;
  solPayment: Option<SolPaymentGuardSettings>;
  tokenPayment: Option<TokenPaymentGuardSettings>;
  startDate: Option<StartDateGuardSettings>;
  thirdPartySigner: Option<ThirdPartySignerGuardSettings>;
  tokenGate: Option<TokenGateGuardSettings>;
  gatekeeper: Option<GatekeeperGuardSettings>;
  endDate: Option<EndDateGuardSettings>;
  allowList: Option<AllowListGuardSettings>;
  mintLimit: Option<MintLimitGuardSettings>;
  nftPayment: Option<NftPaymentGuardSettings>;
  redeemedAmount: Option<RedeemedAmountGuardSettings>;
  addressGate: Option<AddressGateGuardSettings>;
  nftGate: Option<NftGateGuardSettings>;
  nftBurn: Option<NftBurnGuardSettings>;
  tokenBurn: Option<TokenBurnGuardSettings>;
  freezeSolPayment: Option<FreezeSolPaymentGuardSettings>;
  freezeTokenPayment: Option<FreezeTokenPaymentGuardSettings>;
  programGate: Option<ProgramGateGuardSettings>;
};

/**
 * The mint settings for all default Candy Machine guards.
 */
export type DefaultCandyGuardMintSettings = CandyGuardsMintSettings & {
  // botTax: no mint settings
  // solPayment: no mint settings
  // tokenPayment: no mint settings
  // startDate: no mint settings
  thirdPartySigner: Option<ThirdPartySignerGuardMintSettings>;
  // tokenGate: no mint settings
  gatekeeper: Option<GatekeeperGuardMintSettings>;
  // endDate: no mint settings
  // allowList: no mint settings
  // mintLimit: no mint settings
  nftPayment: Option<NftPaymentGuardMintSettings>;
  // redeemedAmount: no mint settings
  // addressGate: no mint settings
  nftGate: Option<NftGateGuardMintSettings>;
  nftBurn: Option<NftBurnGuardMintSettings>;
  // tokenBurn: no mint settings
  // freezeSolPayment: no mint settings
  // freezeTokenPayment: no mint settings
  // programGate: no mint settings
};

/**
 * The mint settings for all default Candy Machine guards.
 */
export type DefaultCandyGuardRouteSettings = CandyGuardsRouteSettings & {
  // botTax: no route settings
  // solPayment: no route settings
  // tokenPayment: no route settings
  // startDate: no route settings
  // thirdPartySigner: no route settings
  // tokenGate: no route settings
  // gatekeeper: no route settings
  // endDate: no route settings
  allowList: AllowListGuardRouteSettings;
  // mintLimit: no route settings
  // nftPayment: no route settings
  // redeemedAmount: no route settings
  // addressGate: no route settings
  // nftGate: no route settings
  // nftBurn: no route settings
  // tokenBurn: no route settings
  freezeSolPayment: FreezeSolPaymentGuardRouteSettings;
  freezeTokenPayment: FreezeTokenPaymentGuardRouteSettings;
  // programGate: no route settings
};

/** @internal */
export const defaultCandyGuardNames: string[] = [
  'botTax',
  'solPayment',
  'tokenPayment',
  'startDate',
  'thirdPartySigner',
  'tokenGate',
  'gatekeeper',
  'endDate',
  'allowList',
  'mintLimit',
  'nftPayment',
  'redeemedAmount',
  'addressGate',
  'nftGate',
  'nftBurn',
  'tokenBurn',
  'freezeSolPayment',
  'freezeTokenPayment',
  'programGate',
];

/** @internal */
export const emptyDefaultCandyGuardSettings: {
  [key in keyof DefaultCandyGuardSettings]: null;
} = defaultCandyGuardNames.reduce((acc, name) => {
  acc[name] = null;
  return acc;
}, {} as { [key in keyof DefaultCandyGuardSettings]: null });
