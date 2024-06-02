/**
 * A namespaced identifier in the format `${namespace}:${reference}`.
 *
 * Used by {@link IdentifierArray} and {@link IdentifierRecord}.
 *
 * @group Identifier
 */
export type IdentifierString = `${string}:${string}`;

/**
 * A read-only array of namespaced identifiers in the format `${namespace}:${reference}`.
 *
 * Used by {@link Wallet.chains | Wallet::chains}, {@link WalletAccount.chains | WalletAccount::chains}, and
 * {@link WalletAccount.features | WalletAccount::features}.
 *
 * @group Identifier
 */
export type IdentifierArray = readonly IdentifierString[];

/**
 * A read-only object with keys of namespaced identifiers in the format `${namespace}:${reference}`.
 *
 * Used by {@link Wallet.features | Wallet::features}.
 *
 * @group Identifier
 */
export type IdentifierRecord<T> = Readonly<Record<IdentifierString, T>>;
