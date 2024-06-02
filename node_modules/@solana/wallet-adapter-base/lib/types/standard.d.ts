import { type SolanaSignAndSendTransactionFeature, type SolanaSignInFeature, type SolanaSignMessageFeature, type SolanaSignTransactionFeature } from '@solana/wallet-standard-features';
import type { Wallet as StandardWallet, WalletWithFeatures as StandardWalletWithFeatures } from '@wallet-standard/base';
import { type StandardConnectFeature, type StandardDisconnectFeature, type StandardEventsFeature } from '@wallet-standard/features';
import type { WalletAdapter, WalletAdapterProps } from './adapter.js';
export declare type WalletAdapterCompatibleStandardWallet = StandardWalletWithFeatures<StandardConnectFeature & StandardEventsFeature & (SolanaSignAndSendTransactionFeature | SolanaSignTransactionFeature) & (StandardDisconnectFeature | SolanaSignMessageFeature | SolanaSignInFeature | object)>;
export interface StandardWalletAdapterProps<Name extends string = string> extends WalletAdapterProps<Name> {
    wallet: WalletAdapterCompatibleStandardWallet;
    standard: true;
}
export declare type StandardWalletAdapter<Name extends string = string> = WalletAdapter<Name> & StandardWalletAdapterProps<Name>;
export declare function isWalletAdapterCompatibleStandardWallet(wallet: StandardWallet): wallet is WalletAdapterCompatibleStandardWallet;
//# sourceMappingURL=standard.d.ts.map