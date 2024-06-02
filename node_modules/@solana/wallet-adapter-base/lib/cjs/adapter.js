"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIosAndRedirectable = exports.scopePollingDetectionStrategy = exports.BaseWalletAdapter = exports.WalletReadyState = exports.EventEmitter = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
exports.EventEmitter = eventemitter3_1.default;
const errors_js_1 = require("./errors.js");
/**
 * A wallet's readiness describes a series of states that the wallet can be in,
 * depending on what kind of wallet it is. An installable wallet (eg. a browser
 * extension like Phantom) might be `Installed` if we've found the Phantom API
 * in the global scope, or `NotDetected` otherwise. A loadable, zero-install
 * runtime (eg. Torus Wallet) might simply signal that it's `Loadable`. Use this
 * metadata to personalize the wallet list for each user (eg. to show their
 * installed wallets first).
 */
var WalletReadyState;
(function (WalletReadyState) {
    /**
     * User-installable wallets can typically be detected by scanning for an API
     * that they've injected into the global context. If such an API is present,
     * we consider the wallet to have been installed.
     */
    WalletReadyState["Installed"] = "Installed";
    WalletReadyState["NotDetected"] = "NotDetected";
    /**
     * Loadable wallets are always available to you. Since you can load them at
     * any time, it's meaningless to say that they have been detected.
     */
    WalletReadyState["Loadable"] = "Loadable";
    /**
     * If a wallet is not supported on a given platform (eg. server-rendering, or
     * mobile) then it will stay in the `Unsupported` state.
     */
    WalletReadyState["Unsupported"] = "Unsupported";
})(WalletReadyState = exports.WalletReadyState || (exports.WalletReadyState = {}));
class BaseWalletAdapter extends eventemitter3_1.default {
    get connected() {
        return !!this.publicKey;
    }
    autoConnect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
        });
    }
    prepareTransaction(transaction, connection, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const publicKey = this.publicKey;
            if (!publicKey)
                throw new errors_js_1.WalletNotConnectedError();
            transaction.feePayer = transaction.feePayer || publicKey;
            transaction.recentBlockhash =
                transaction.recentBlockhash ||
                    (yield connection.getLatestBlockhash({
                        commitment: options.preflightCommitment,
                        minContextSlot: options.minContextSlot,
                    })).blockhash;
            return transaction;
        });
    }
}
exports.BaseWalletAdapter = BaseWalletAdapter;
function scopePollingDetectionStrategy(detect) {
    // Early return when server-side rendering
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return;
    const disposers = [];
    function detectAndDispose() {
        const detected = detect();
        if (detected) {
            for (const dispose of disposers) {
                dispose();
            }
        }
    }
    // Strategy #1: Try detecting every second.
    const interval = 
    // TODO: #334 Replace with idle callback strategy.
    setInterval(detectAndDispose, 1000);
    disposers.push(() => clearInterval(interval));
    // Strategy #2: Detect as soon as the DOM becomes 'ready'/'interactive'.
    if (
    // Implies that `DOMContentLoaded` has not yet fired.
    document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', detectAndDispose, { once: true });
        disposers.push(() => document.removeEventListener('DOMContentLoaded', detectAndDispose));
    }
    // Strategy #3: Detect after the `window` has fully loaded.
    if (
    // If the `complete` state has been reached, we're too late.
    document.readyState !== 'complete') {
        window.addEventListener('load', detectAndDispose, { once: true });
        disposers.push(() => window.removeEventListener('load', detectAndDispose));
    }
    // Strategy #4: Detect synchronously, now.
    detectAndDispose();
}
exports.scopePollingDetectionStrategy = scopePollingDetectionStrategy;
/**
 * Users on iOS can be redirected into a wallet's in-app browser automatically,
 * if that wallet has a universal link configured to do so
 * But should not be redirected from within a webview, eg. if they're already
 * inside a wallet's browser
 * This function can be used to identify users who are on iOS and can be redirected
 *
 * @returns true if the user can be redirected
 */
function isIosAndRedirectable() {
    // SSR: return false
    if (!navigator)
        return false;
    const userAgent = navigator.userAgent.toLowerCase();
    // if on iOS the user agent will contain either iPhone or iPad
    // caveat: if requesting desktop site then this won't work
    const isIos = userAgent.includes('iphone') || userAgent.includes('ipad');
    // if in a webview then it will not include Safari
    // note that other iOS browsers also include Safari
    // so we will redirect only if Safari is also included
    const isSafari = userAgent.includes('safari');
    return isIos && isSafari;
}
exports.isIosAndRedirectable = isIosAndRedirectable;
//# sourceMappingURL=adapter.js.map