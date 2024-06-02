import type { IdentifierArray, IdentifierRecord, IdentifierString } from './identifier.js';

/**
 * Version of the Wallet Standard implemented by a {@link Wallet}.
 *
 * Used by {@link Wallet.version | Wallet::version}.
 *
 * Note that this is _NOT_ a version of the Wallet, but a version of the Wallet Standard itself that the Wallet
 * supports.
 *
 * This may be used by the app to determine compatibility and feature detect.
 *
 * @group Wallet
 */
export type WalletVersion = '1.0.0';

/**
 * A data URI containing a base64-encoded SVG, WebP, PNG, or GIF image.
 *
 * Used by {@link Wallet.icon | Wallet::icon} and {@link WalletAccount.icon | WalletAccount::icon}.
 *
 * @group Wallet
 */
export type WalletIcon = `data:image/${'svg+xml' | 'webp' | 'png' | 'gif'};base64,${string}`;

/**
 * Interface of a **Wallet**, also referred to as a **Standard Wallet**.
 *
 * A Standard Wallet implements and adheres to the Wallet Standard.
 *
 * @group Wallet
 */
export interface Wallet {
    /**
     * {@link WalletVersion | Version} of the Wallet Standard implemented by the Wallet.
     *
     * Must be read-only, static, and canonically defined by the Wallet Standard.
     */
    readonly version: WalletVersion;

    /**
     * Name of the Wallet. This may be displayed by the app.
     *
     * Must be read-only, static, descriptive, unique, and canonically defined by the wallet extension or application.
     */
    readonly name: string;

    /**
     * {@link WalletIcon | Icon} of the Wallet. This may be displayed by the app.
     *
     * Must be read-only, static, and canonically defined by the wallet extension or application.
     */
    readonly icon: WalletIcon;

    /**
     * Chains supported by the Wallet.
     *
     * A **chain** is an {@link IdentifierString} which identifies a blockchain in a canonical, human-readable format.
     * [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md) chain IDs are compatible with this,
     * but are not required to be used.
     *
     * Each blockchain should define its own **chains** by extension of the Wallet Standard, using its own namespace.
     * The `standard` and `experimental` namespaces are reserved by the Wallet Standard.
     *
     * The {@link "@wallet-standard/features".EventsFeature | `standard:events` feature} should be used to notify the
     * app if the value changes.
     */
    readonly chains: IdentifierArray;

    /**
     * Features supported by the Wallet.
     *
     * A **feature name** is an {@link IdentifierString} which identifies a **feature** in a canonical, human-readable
     * format.
     *
     * Each blockchain should define its own features by extension of the Wallet Standard.
     *
     * The `standard` and `experimental` namespaces are reserved by the Wallet Standard.
     *
     * A **feature** may have any type. It may be a single method or value, or a collection of them.
     *
     * A **conventional feature** has the following structure:
     *
     * ```ts
     *  export type ExperimentalEncryptFeature = {
     *      // Name of the feature.
     *      'experimental:encrypt': {
     *          // Version of the feature.
     *          version: '1.0.0';
     *          // Properties of the feature.
     *          ciphers: readonly 'x25519-xsalsa20-poly1305'[];
     *          // Methods of the feature.
     *          encrypt (data: Uint8Array): Promise<Uint8Array>;
     *      };
     *  };
     * ```
     *
     * The {@link "@wallet-standard/features".EventsFeature | `standard:events` feature} should be used to notify the
     * app if the value changes.
     */
    readonly features: IdentifierRecord<unknown>;

    /**
     * {@link WalletAccount | Accounts} that the app is authorized to use.
     *
     * This can be set by the Wallet so the app can use authorized accounts on the initial page load.
     *
     * The {@link "@wallet-standard/features".ConnectFeature | `standard:connect` feature} should be used to obtain
     * authorization to the accounts.
     *
     * The {@link "@wallet-standard/features".EventsFeature | `standard:events` feature} should be used to notify the
     * app if the value changes.
     */
    readonly accounts: readonly WalletAccount[];
}

/**
 * Interface of a **WalletAccount**, also referred to as an **Account**.
 *
 * An account is a _read-only data object_ that is provided from the Wallet to the app, authorizing the app to use it.
 *
 * The app can use an account to display and query information from a chain.
 *
 * The app can also act using an account by passing it to {@link Wallet.features | features} of the Wallet.
 *
 * Wallets may use or extend {@link "@wallet-standard/wallet".ReadonlyWalletAccount} which implements this interface.
 *
 * @group Wallet
 */
export interface WalletAccount {
    /** Address of the account, corresponding with a public key. */
    readonly address: string;

    /** Public key of the account, corresponding with a secret key to use. */
    readonly publicKey: Uint8Array;

    /**
     * Chains supported by the account.
     *
     * This must be a subset of the {@link Wallet.chains | chains} of the Wallet.
     */
    readonly chains: IdentifierArray;

    /**
     * Feature names supported by the account.
     *
     * This must be a subset of the names of {@link Wallet.features | features} of the Wallet.
     */
    readonly features: IdentifierArray;

    /** Optional user-friendly descriptive label or name for the account. This may be displayed by the app. */
    readonly label?: string;

    /** Optional user-friendly icon for the account. This may be displayed by the app. */
    readonly icon?: WalletIcon;
}

/**
 * Helper type for defining a {@link Wallet} with a union or intersection of {@link Wallet.features | features}.
 *
 * @group Wallet
 */
export type WalletWithFeatures<Features extends Wallet['features']> = Omit<Wallet, 'features'> & {
    features: Features;
};
