import type { WalletWithFeatures } from '@wallet-standard/base';
import type { StandardConnectFeature } from './connect.js';
import type { StandardDisconnectFeature } from './disconnect.js';
import type { StandardEventsFeature } from './events.js';
/**
 * Type alias for some or all {@link "@wallet-standard/base".Wallet.features} implemented within the reserved `standard`
 * namespace.
 *
 * @group Features
 */
export declare type StandardFeatures = StandardConnectFeature | StandardDisconnectFeature | StandardEventsFeature;
/**
 * Type alias for a {@link "@wallet-standard/base".Wallet} that implements some or all {@link StandardFeatures}.
 *
 * @group Features
 */
export declare type WalletWithStandardFeatures = WalletWithFeatures<StandardFeatures>;
export * from './connect.js';
export * from './disconnect.js';
export * from './events.js';
//# sourceMappingURL=index.d.ts.map