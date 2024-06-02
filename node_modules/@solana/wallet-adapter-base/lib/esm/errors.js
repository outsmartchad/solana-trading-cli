export class WalletError extends Error {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(message, error) {
        super(message);
        this.error = error;
    }
}
export class WalletNotReadyError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletNotReadyError';
    }
}
export class WalletLoadError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletLoadError';
    }
}
export class WalletConfigError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletConfigError';
    }
}
export class WalletConnectionError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletConnectionError';
    }
}
export class WalletDisconnectedError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletDisconnectedError';
    }
}
export class WalletDisconnectionError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletDisconnectionError';
    }
}
export class WalletAccountError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletAccountError';
    }
}
export class WalletPublicKeyError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletPublicKeyError';
    }
}
export class WalletKeypairError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletKeypairError';
    }
}
export class WalletNotConnectedError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletNotConnectedError';
    }
}
export class WalletSendTransactionError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletSendTransactionError';
    }
}
export class WalletSignTransactionError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletSignTransactionError';
    }
}
export class WalletSignMessageError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletSignMessageError';
    }
}
export class WalletSignInError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletSignInError';
    }
}
export class WalletTimeoutError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletTimeoutError';
    }
}
export class WalletWindowBlockedError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletWindowBlockedError';
    }
}
export class WalletWindowClosedError extends WalletError {
    constructor() {
        super(...arguments);
        this.name = 'WalletWindowClosedError';
    }
}
//# sourceMappingURL=errors.js.map