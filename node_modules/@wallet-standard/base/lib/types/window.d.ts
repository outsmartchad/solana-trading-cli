import type { Wallet } from './wallet.js';
/**
 * Global `window` type for dispatching and listening for {@link WindowAppReadyEvent} and {@link WindowRegisterWalletEvent}.
 *
 * ```ts
 * import { WalletEventsWindow } from '@wallet-standard/base';
 *
 * declare const window: WalletEventsWindow;
 * // OR
 * (window as WalletEventsWindow)
 * ```
 *
 * @group Window
 */
export interface WalletEventsWindow extends Omit<Window, 'addEventListener' | 'dispatchEvent'> {
    /** Add a listener for {@link WindowAppReadyEvent}. */
    addEventListener(type: WindowAppReadyEventType, listener: (event: WindowAppReadyEvent) => void): void;
    /** Add a listener for {@link WindowRegisterWalletEvent}. */
    addEventListener(type: WindowRegisterWalletEventType, listener: (event: WindowRegisterWalletEvent) => void): void;
    /** Dispatch a {@link WindowAppReadyEvent}. */
    dispatchEvent(event: WindowAppReadyEvent): void;
    /** Dispatch a {@link WindowRegisterWalletEvent}. */
    dispatchEvent(event: WindowRegisterWalletEvent): void;
}
/**
 * Type of {@link WindowAppReadyEvent}.
 *
 * @group App Ready Event
 */
export declare type WindowAppReadyEventType = 'wallet-standard:app-ready';
/** Interface that will be provided to {@link Wallet | Wallets} by the app when the app calls the
 * {@link WindowRegisterWalletEventCallback} provided by Wallets.
 *
 * Wallets must call the {@link WindowAppReadyEventAPI.register | register} method to register themselves.
 *
 * @group App Ready Event
 */
export interface WindowAppReadyEventAPI {
    /**
     * Register a {@link Wallet} with the app.
     *
     * @return
     * `unregister` function to programmatically unregister the Wallet.
     *
     * Wallets generally do not need to, and should not, call this.
     */
    register(wallet: Wallet): () => void;
}
/**
 * Event that will be dispatched by the app on the `window` when the app is ready to register {@link Wallet | Wallets}.
 *
 * Wallets must listen for this event, and {@link WindowAppReadyEventAPI.register register} themselves when the event is
 * dispatched.
 *
 * @group App Ready Event
 */
export declare type WindowAppReadyEvent = UnstoppableCustomEvent<WindowAppReadyEventType, WindowAppReadyEventAPI>;
/**
 * Type of {@link WindowRegisterWalletEvent}.
 *
 * @group Register Wallet Event
 */
export declare type WindowRegisterWalletEventType = 'wallet-standard:register-wallet';
/**
 * Callback function provided by {@link Wallet | Wallets} to be called by the app when the app is ready to register
 * Wallets.
 *
 * @group Register Wallet Event
 */
export declare type WindowRegisterWalletEventCallback = (api: WindowAppReadyEventAPI) => void;
/**
 * Event that will be dispatched on the `window` by each {@link Wallet | Wallet} when the Wallet is ready to be
 * registered by the app.
 *
 * The app must listen for this event, and register Wallets when the event is dispatched.
 *
 * @group Register Wallet Event
 */
export declare type WindowRegisterWalletEvent = UnstoppableCustomEvent<WindowRegisterWalletEventType, WindowRegisterWalletEventCallback>;
/**
 * @deprecated Use {@link WalletEventsWindow} instead.
 *
 * @group Deprecated
 */
export interface DEPRECATED_WalletsWindow extends Window {
    navigator: DEPRECATED_WalletsNavigator;
}
/**
 * @deprecated Use {@link WalletEventsWindow} instead.
 *
 * @group Deprecated
 */
export interface DEPRECATED_WalletsNavigator extends Navigator {
    wallets?: DEPRECATED_Wallets;
}
/**
 * @deprecated Use {@link WalletEventsWindow} instead.
 *
 * @group Deprecated
 */
export interface DEPRECATED_Wallets {
    push(...callbacks: DEPRECATED_WalletsCallback[]): void;
}
/**
 * @deprecated Use {@link WalletEventsWindow} instead.
 *
 * @group Deprecated
 */
export declare type DEPRECATED_WalletsCallback = (wallets: {
    register(...wallets: Wallet[]): () => void;
}) => void;
/**
 * @internal
 *
 * A custom event that cannot have its default behavior prevented or its propagation stopped.
 *
 * This is an internal type, extended by {@link WindowAppReadyEvent} and {@link WindowRegisterWalletEvent}.
 *
 * [`window.CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent) is not used because
 * Node.js doesn't have it, but this interface is compatible with it.
 *
 * @group Internal
 */
export interface UnstoppableCustomEvent<T extends string, D> extends Event {
    /** Type of the event. */
    readonly type: T;
    /** Data attached to the event. */
    readonly detail: D;
    /** @deprecated Does nothing and throws an error if called. */
    preventDefault(): never;
    /** @deprecated Does nothing and throws an error if called. */
    stopImmediatePropagation(): never;
    /** @deprecated Does nothing and throws an error if called. */
    stopPropagation(): never;
}
//# sourceMappingURL=window.d.ts.map