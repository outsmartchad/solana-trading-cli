"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWalletAdapterCompatibleStandardWallet = void 0;
const wallet_standard_features_1 = require("@solana/wallet-standard-features");
const features_1 = require("@wallet-standard/features");
function isWalletAdapterCompatibleStandardWallet(wallet) {
    return (features_1.StandardConnect in wallet.features &&
        features_1.StandardEvents in wallet.features &&
        (wallet_standard_features_1.SolanaSignAndSendTransaction in wallet.features || wallet_standard_features_1.SolanaSignTransaction in wallet.features));
}
exports.isWalletAdapterCompatibleStandardWallet = isWalletAdapterCompatibleStandardWallet;
//# sourceMappingURL=standard.js.map