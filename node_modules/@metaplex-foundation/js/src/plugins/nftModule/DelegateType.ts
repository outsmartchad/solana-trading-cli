import {
  DelegateArgs,
  TokenDelegateRole,
  MetadataDelegateRole,
} from '@metaplex-foundation/mpl-token-metadata';
import { DelegateRoleRequiredDataError } from './errors';
import { UnreachableCaseError } from '@/errors';

export type TokenDelegateType =
  | 'StandardV1'
  | 'TransferV1'
  | 'LockedTransferV1'
  | 'SaleV1'
  | 'UtilityV1'
  | 'StakingV1';
export type MetadataDelegateType =
  // | 'AuthorityItemV1'
  | 'CollectionV1'
  // | 'UseV1'
  | 'DataV1'
  | 'ProgrammableConfigV1';

const tokenDelegateRoleMap: Record<TokenDelegateType, TokenDelegateRole> = {
  StandardV1: TokenDelegateRole.Standard,
  TransferV1: TokenDelegateRole.Transfer,
  LockedTransferV1: TokenDelegateRole.LockedTransfer,
  SaleV1: TokenDelegateRole.Sale,
  UtilityV1: TokenDelegateRole.Utility,
  StakingV1: TokenDelegateRole.Staking,
};

const metadataDelegateRoleMap: Record<
  MetadataDelegateType,
  MetadataDelegateRole
> = {
  // AuthorityItemV1: MetadataDelegateRole.AuthorityItem,
  CollectionV1: MetadataDelegateRole.Collection,
  // UseV1: MetadataDelegateRole.Use,
  DataV1: MetadataDelegateRole.Data,
  ProgrammableConfigV1: MetadataDelegateRole.ProgrammableConfig,
};

const metadataDelegateSeedMap: Record<MetadataDelegateRole, string> = {
  [MetadataDelegateRole.AuthorityItem]: 'authority_item_delegate',
  [MetadataDelegateRole.Collection]: 'collection_delegate',
  [MetadataDelegateRole.Use]: 'use_delegate',
  [MetadataDelegateRole.Data]: 'data_delegate',
  [MetadataDelegateRole.ProgrammableConfig]: 'programmable_config_delegate',
  [MetadataDelegateRole.DataItem]: 'data_item_delegate',
  [MetadataDelegateRole.CollectionItem]: 'collection_item_delegate',
  [MetadataDelegateRole.ProgrammableConfigItem]: 'prog_config_item_delegate',
};

const delegateCustomDataMap: Record<
  TokenDelegateType | MetadataDelegateType,
  boolean
> = {
  // Metadata.
  // AuthorityItemV1: false,
  CollectionV1: false,
  // UseV1: false,
  DataV1: false,
  ProgrammableConfigV1: false,
  // Token
  StandardV1: true,
  TransferV1: true,
  SaleV1: true,
  UtilityV1: true,
  StakingV1: true,
  LockedTransferV1: true,
};

export const getTokenDelegateRole = (
  type: TokenDelegateType
): TokenDelegateRole => {
  const role = tokenDelegateRoleMap[type];
  if (!role) throw new UnreachableCaseError(type as never);
  return role;
};

export const getMetadataDelegateRole = (
  type: MetadataDelegateType
): MetadataDelegateRole => {
  const role = metadataDelegateRoleMap[type];
  if (!role) throw new UnreachableCaseError(type as never);
  return role;
};

export const getMetadataDelegateRoleSeed = (
  type: MetadataDelegateType
): string => {
  return metadataDelegateSeedMap[getMetadataDelegateRole(type)];
};

export const getDefaultDelegateArgs = (
  type: TokenDelegateType | MetadataDelegateType
): Omit<DelegateArgs, 'authorizationData'> => {
  const hasCustomData = delegateCustomDataMap[type];
  if (hasCustomData === undefined)
    throw new UnreachableCaseError(type as never);
  if (hasCustomData) throw new DelegateRoleRequiredDataError(type);
  return { __kind: type } as DelegateArgs;
};
