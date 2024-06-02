"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
/**
 * Connect to NEAR using the provided configuration.
 *
 * {@link ConnectConfig.networkId} and {@link ConnectConfig.nodeUrl} are required.
 *
 * To sign transactions you can also pass:
 * 1. {@link ConnectConfig.keyStore}
 * 2. {@link ConnectConfig.keyPath}
 *
 * If all three are passed they are prioritize in that order.
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
 * @module connect
 */
const unencrypted_file_system_keystore_1 = require("./key_stores/unencrypted_file_system_keystore");
const key_stores_1 = require("./key_stores");
const near_1 = require("./near");
const setup_node_fetch_1 = __importDefault(require("./utils/setup-node-fetch"));
const utils_1 = require("./utils");
global.fetch = setup_node_fetch_1.default;
/**
 * Initialize connection to Near network.
 */
async function connect(config) {
    // Try to find extra key in `KeyPath` if provided.
    if (config.keyPath && (config.keyStore || config.deps && config.deps.keyStore)) {
        try {
            const accountKeyFile = await unencrypted_file_system_keystore_1.readKeyFile(config.keyPath);
            if (accountKeyFile[0]) {
                // TODO: Only load key if network ID matches
                const keyPair = accountKeyFile[1];
                const keyPathStore = new key_stores_1.InMemoryKeyStore();
                await keyPathStore.setKey(config.networkId, accountKeyFile[0], keyPair);
                if (!config.masterAccount) {
                    config.masterAccount = accountKeyFile[0];
                }
                config.keyStore = new key_stores_1.MergeKeyStore([
                    keyPathStore,
                    (config.keyStore || config.deps.keyStore)
                ], { writeKeyStoreIndex: 1 });
                if (!process.env["NEAR_NO_LOGS"]) {
                    console.log(`Loaded master account ${accountKeyFile[0]} key from ${config.keyPath} with public key = ${keyPair.getPublicKey()}`);
                }
            }
        }
        catch (error) {
            utils_1.logWarning(`Failed to load master account key from ${config.keyPath}: ${error}`);
        }
    }
    return new near_1.Near(config);
}
exports.connect = connect;
