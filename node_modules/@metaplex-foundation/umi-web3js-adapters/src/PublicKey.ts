import { PublicKey } from '@metaplex-foundation/umi';
import { PublicKey as Web3JsPublicKey } from '@solana/web3.js';

export function fromWeb3JsPublicKey(publicKey: Web3JsPublicKey): PublicKey {
  return publicKey.toBase58() as PublicKey;
}

export function toWeb3JsPublicKey(publicKey: PublicKey): Web3JsPublicKey {
  return new Web3JsPublicKey(publicKey);
}
