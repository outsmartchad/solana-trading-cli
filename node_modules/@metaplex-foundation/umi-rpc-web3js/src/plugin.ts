import { UmiPlugin } from '@metaplex-foundation/umi';
import type { Connection as Web3JsConnection } from '@solana/web3.js';
import { createWeb3JsRpc, Web3JsRpcOptions } from './createWeb3JsRpc';

export function web3JsRpc(
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): UmiPlugin;
export function web3JsRpc(connection: Web3JsConnection): UmiPlugin;
export function web3JsRpc(
  endpointOrConnection: string | Web3JsConnection,
  rpcOptions?: Web3JsRpcOptions
): UmiPlugin {
  return {
    install(umi) {
      umi.rpc =
        typeof endpointOrConnection === 'string'
          ? createWeb3JsRpc(umi, endpointOrConnection, rpcOptions)
          : createWeb3JsRpc(umi, endpointOrConnection);
    },
  };
}
