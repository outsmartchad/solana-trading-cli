"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletWindowClosedError = exports.WalletWindowBlockedError = exports.WalletTimeoutError = exports.WalletSignInError = exports.WalletSignMessageError = exports.WalletSignTransactionError = exports.WalletSendTransactionError = exports.WalletNotConnectedError = exports.WalletKeypairError = exports.WalletPublicKeyError = exports.WalletAccountError = exports.WalletDisconnectionError = exports.WalletDisconnectedError = exports.WalletConnectionError = exports.WalletConfigError = exports.WalletLoadError = exports.WalletNotReadyError = exports.WalletError = void 0;
class WalletError extends Error {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(message, error) {
        super(message);
        this.error = error;
    }
}
exports.WalletError = WalletError;
class WalletNotReadyError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletNotReadyError';
    }
}
exports.WalletNotReadyError = WalletNotReadyError;
class WalletLoadError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletLoadError';
    }
}
exports.WalletLoadError = WalletLoadError;
class WalletConfigError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletConfigError';
    }
}
exports.WalletConfigError = WalletConfigError;
class WalletConnectionError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletConnectionError';
    }
}
exports.WalletConnectionError = WalletConnectionError;
class WalletDisconnectedError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletDisconnectedError';
    }
}
exports.WalletDisconnectedError = WalletDisconnectedError;
class WalletDisconnectionError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletDisconnectionError';
    }
}
exports.WalletDisconnectionError = WalletDisconnectionError;
class WalletAccountError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletAccountError';
    }
}
exports.WalletAccountError = WalletAccountError;
class WalletPublicKeyError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletPublicKeyError';
    }
}
exports.WalletPublicKeyError = WalletPublicKeyError;
class WalletKeypairError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletKeypairError';
    }
}
exports.WalletKeypairError = WalletKeypairError;
class WalletNotConnectedError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletNotConnectedError';
    }
}
exports.WalletNotConnectedError = WalletNotConnectedError;
class WalletSendTransactionError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletSendTransactionError';
    }
}
exports.WalletSendTransactionError = WalletSendTransactionError;
class WalletSignTransactionError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletSignTransactionError';
    }
}
exports.WalletSignTransactionError = WalletSignTransactionError;
class WalletSignMessageError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletSignMessageError';
    }
}
exports.WalletSignMessageError = WalletSignMessageError;
class WalletSignInError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletSignInError';
    }
}
exports.WalletSignInError = WalletSignInError;
class WalletTimeoutError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletTimeoutError';
    }
}
exports.WalletTimeoutError = WalletTimeoutError;
class WalletWindowBlockedError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletWindowBlockedError';
    }
}
exports.WalletWindowBlockedError = WalletWindowBlockedError;
class WalletWindowClosedError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletWindowClosedError';
    }
}
exports.WalletWindowClosedError = WalletWindowClosedError;
//# sourceMappingURL=errors.js.map