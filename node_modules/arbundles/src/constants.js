"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIG_CONFIG = exports.SignatureConfig = void 0;
var SignatureConfig;
(function (SignatureConfig) {
    SignatureConfig[SignatureConfig["ARWEAVE"] = 1] = "ARWEAVE";
    SignatureConfig[SignatureConfig["ED25519"] = 2] = "ED25519";
    SignatureConfig[SignatureConfig["ETHEREUM"] = 3] = "ETHEREUM";
    SignatureConfig[SignatureConfig["SOLANA"] = 4] = "SOLANA";
})(SignatureConfig = exports.SignatureConfig || (exports.SignatureConfig = {}));
exports.SIG_CONFIG = {
    [SignatureConfig.ARWEAVE]: {
        sigLength: 512,
        pubLength: 512,
        sigName: "arweave",
    },
    [SignatureConfig.ED25519]: {
        sigLength: 64,
        pubLength: 32,
        sigName: "ed25519",
    },
    [SignatureConfig.ETHEREUM]: {
        sigLength: 65,
        pubLength: 65,
        sigName: "ethereum",
    },
    [SignatureConfig.SOLANA]: {
        sigLength: 64,
        pubLength: 32,
        sigName: "solana",
    },
};
//# sourceMappingURL=constants.js.map