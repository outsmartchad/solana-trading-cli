import { DelegateArgs } from '@metaplex-foundation/mpl-token-metadata';
import { MetadataDelegateType, TokenDelegateType } from './DelegateType';
import { Metaplex } from '@/index';
import { isSigner, Program, PublicKey, Signer } from '@/types';

type SplitTypeAndData<
  T extends { __kind: any },
  U extends T['__kind'] = any
> = T extends {
  __kind: U;
}
  ? { type: T['__kind']; data?: Omit<T, '__kind' | 'authorizationData'> }
  : never;

export type MetadataDelegateInputWithData<
  T extends PublicKey | Signer = PublicKey
> = {
  delegate: T;
  updateAuthority: PublicKey;
} & SplitTypeAndData<DelegateArgs, MetadataDelegateType>;

export type TokenDelegateInputWithData<
  T extends PublicKey | Signer = PublicKey
> = {
  delegate: T;
  owner: PublicKey;
  token?: PublicKey;
} & SplitTypeAndData<DelegateArgs, TokenDelegateType>;

export type MetadataDelegateInput<T extends PublicKey | Signer = PublicKey> =
  Omit<MetadataDelegateInputWithData<T>, 'data'>;

export type TokenDelegateInput<T extends PublicKey | Signer = PublicKey> = Omit<
  TokenDelegateInputWithData<T>,
  'data'
>;

export type DelegateInputSigner = DelegateInput<Signer>;
export type DelegateInput<T extends PublicKey | Signer = PublicKey> =
  | MetadataDelegateInput<T>
  | TokenDelegateInput<T>;

export type DelegateInputWithDataSigner = DelegateInputWithData<Signer>;
export type DelegateInputWithData<T extends PublicKey | Signer = PublicKey> =
  | MetadataDelegateInputWithData<T>
  | TokenDelegateInputWithData<T>;

export const parseTokenMetadataDelegateInput = <
  T extends PublicKey | Signer = PublicKey
>(
  metaplex: Metaplex,
  mint: PublicKey,
  input: DelegateInput<T>,
  programs?: Program[]
): {
  delegate: T;
  approver: PublicKey;
  delegateRecord: PublicKey;
  tokenAccount?: PublicKey;
  isTokenDelegate: boolean;
} => {
  if ('updateAuthority' in input) {
    return {
      isTokenDelegate: false,
      delegate: input.delegate,
      approver: input.updateAuthority,
      delegateRecord: metaplex
        .nfts()
        .pdas()
        .metadataDelegateRecord({
          mint,
          type: input.type,
          updateAuthority: input.updateAuthority,
          delegate: isSigner(input.delegate)
            ? input.delegate.publicKey
            : input.delegate,
          programs,
        }),
    };
  }

  const tokenAccount =
    input.token ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint,
      owner: input.owner,
      programs,
    });
  return {
    isTokenDelegate: true,
    delegate: input.delegate,
    approver: input.owner,
    delegateRecord: metaplex.nfts().pdas().tokenRecord({
      mint,
      token: tokenAccount,
      programs,
    }),
    tokenAccount,
  };
};
