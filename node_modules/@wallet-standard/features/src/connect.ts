import type { WalletAccount } from '@wallet-standard/base';

/** Name of the feature. */
export const StandardConnect = 'standard:connect';
/**
 * @deprecated Use {@link StandardConnect} instead.
 *
 * @group Deprecated
 */
export const Connect = StandardConnect;

/**
 * `standard:connect` is a {@link "@wallet-standard/base".Wallet.features | feature} that may be implemented by a
 * {@link "@wallet-standard/base".Wallet} to allow the app to obtain authorization to use
 * {@link "@wallet-standard/base".Wallet.accounts}.
 *
 * @group Connect
 */
export type StandardConnectFeature = {
    /** Name of the feature. */
    readonly [StandardConnect]: {
        /** Version of the feature implemented by the Wallet. */
        readonly version: StandardConnectVersion;
        /** Method to call to use the feature. */
        readonly connect: StandardConnectMethod;
    };
};
/**
 * @deprecated Use {@link StandardConnectFeature} instead.
 *
 * @group Deprecated
 */
export type ConnectFeature = StandardConnectFeature;

/**
 * Version of the {@link StandardConnectFeature} implemented by a {@link "@wallet-standard/base".Wallet}.
 *
 * @group Connect
 */
export type StandardConnectVersion = '1.0.0';
/**
 * @deprecated Use {@link StandardConnectVersion} instead.
 *
 * @group Deprecated
 */
export type ConnectVersion = StandardConnectVersion;

/**
 * Method to call to use the {@link StandardConnectFeature}.
 *
 * @group Connect
 */
export type StandardConnectMethod = (input?: StandardConnectInput) => Promise<StandardConnectOutput>;
/**
 * @deprecated Use {@link StandardConnectMethod} instead.
 *
 * @group Deprecated
 */
export type ConnectMethod = StandardConnectMethod;

/**
 * Input for the {@link StandardConnectMethod}.
 *
 * @group Connect
 */
export interface StandardConnectInput {
    /**
     * By default, using the {@link StandardConnectFeature} should prompt the user to request authorization to accounts.
     * Set the `silent` flag to `true` to request accounts that have already been authorized without prompting.
     *
     * This flag may or may not be used by the Wallet and the app should not depend on it being used.
     * If this flag is used by the Wallet, the Wallet should not prompt the user, and should return only the accounts
     * that the app is authorized to use.
     */
    readonly silent?: boolean;
}
/**
 * @deprecated Use {@link StandardConnectInput} instead.
 *
 * @group Deprecated
 */
export type ConnectInput = StandardConnectInput;

/**
 * Output of the {@link StandardConnectMethod}.
 *
 * @group Connect
 */
export interface StandardConnectOutput {
    /** List of accounts in the {@link "@wallet-standard/base".Wallet} that the app has been authorized to use. */
    readonly accounts: readonly WalletAccount[];
}
/**
 * @deprecated Use {@link StandardConnectOutput} instead.
 *
 * @group Deprecated
 */
export type ConnectOutput = StandardConnectOutput;
