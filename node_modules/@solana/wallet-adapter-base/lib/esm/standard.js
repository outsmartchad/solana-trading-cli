import { SolanaSignAndSendTransaction, SolanaSignTransaction, } from '@solana/wallet-standard-features';
import { StandardConnect, StandardEvents, } from '@wallet-standard/features';
export function isWalletAdapterCompatibleStandardWallet(wallet) {
    return (StandardConnect in wallet.features &&
        StandardEvents in wallet.features &&
        (SolanaSignAndSendTransaction in wallet.features || SolanaSignTransaction in wallet.features));
}
//# sourceMappingURL=standard.js.map