/**
 * Connect to NEAR using the provided configuration.
 *
 * {@link ConnectConfig.networkId} and {@link ConnectConfig.nodeUrl} are required.
 *
 * To sign transactions you can also pass: {@link ConnectConfig.keyStore}
 *
 * Both are passed they are prioritize in that order.
 *
 * @see {@link ConnectConfig}
 * @example
 * ```js
 * async function initNear() {
 *   const near = await connect({
 *      networkId: 'testnet',
 *      nodeUrl: 'https://rpc.testnet.near.org'
 *   })
 * }
 * ```
 *
 * @module browserConnect
 */
import { Near, NearConfig } from "./near";
export interface ConnectConfig extends NearConfig {
    /** @hidden */
    keyPath?: string;
}
/**
 * Initialize connection to Near network.
 */
export declare function connect(config: ConnectConfig): Promise<Near>;
