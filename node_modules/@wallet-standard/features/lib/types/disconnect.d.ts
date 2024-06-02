/** Name of the feature. */
export declare const StandardDisconnect = "standard:disconnect";
/**
 * @deprecated Use {@link StandardDisconnect} instead.
 *
 * @group Deprecated
 */
export declare const Disconnect = "standard:disconnect";
/**
 * `standard:disconnect` is a {@link "@wallet-standard/base".Wallet.features | feature} that may be implemented by a
 * {@link "@wallet-standard/base".Wallet} to allow the app to perform any cleanup work.
 *
 * This feature may or may not be used by the app and the Wallet should not depend on it being used.
 * If this feature is used by the app, the Wallet should perform any cleanup work, but should not revoke authorization
 * to use accounts previously granted through the {@link ConnectFeature}.
 *
 * @group Disconnect
 */
export declare type StandardDisconnectFeature = {
    /** Name of the feature. */
    readonly [StandardDisconnect]: {
        /** Version of the feature implemented by the Wallet. */
        readonly version: StandardDisconnectVersion;
        /** Method to call to use the feature. */
        readonly disconnect: StandardDisconnectMethod;
    };
};
/**
 * @deprecated Use {@link StandardDisconnectFeature} instead.
 *
 * @group Deprecated
 */
export declare type DisconnectFeature = StandardDisconnectFeature;
/**
 * Version of the {@link StandardDisconnectFeature} implemented by a Wallet.
 *
 * @group Disconnect
 */
export declare type StandardDisconnectVersion = '1.0.0';
/**
 * @deprecated Use {@link StandardDisconnectVersion} instead.
 *
 * @group Deprecated
 */
export declare type DisconnectVersion = StandardDisconnectVersion;
/**
 * Method to call to use the {@link StandardDisconnectFeature}.
 *
 * @group Disconnect
 */
export declare type StandardDisconnectMethod = () => Promise<void>;
/**
 * @deprecated Use {@link StandardDisconnectMethod} instead.
 *
 * @group Deprecated
 */
export declare type DisconnectMethod = StandardDisconnectMethod;
//# sourceMappingURL=disconnect.d.ts.map