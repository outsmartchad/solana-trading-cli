import { BaseWalletAdapter, } from './adapter.js';
import { WalletSendTransactionError, WalletSignTransactionError } from './errors.js';
import { isVersionedTransaction } from './transaction.js';
export class BaseSignerWalletAdapter extends BaseWalletAdapter {
    async sendTransaction(transaction, connection, options = {}) {
        let emit = true;
        try {
            if (isVersionedTransaction(transaction)) {
                if (!this.supportedTransactionVersions)
                    throw new WalletSendTransactionError(`Sending versioned transactions isn't supported by this wallet`);
                if (!this.supportedTransactionVersions.has(transaction.version))
                    throw new WalletSendTransactionError(`Sending transaction version ${transaction.version} isn't supported by this wallet`);
                try {
                    transaction = await this.signTransaction(transaction);
                    const rawTransaction = transaction.serialize();
                    return await connection.sendRawTransaction(rawTransaction, options);
                }
                catch (error) {
                    // If the error was thrown by `signTransaction`, rethrow it and don't emit a duplicate event
                    if (error instanceof WalletSignTransactionError) {
                        emit = false;
                        throw error;
                    }
                    throw new WalletSendTransactionError(error?.message, error);
                }
            }
            else {
                try {
                    const { signers, ...sendOptions } = options;
                    transaction = await this.prepareTransaction(transaction, connection, sendOptions);
                    signers?.length && transaction.partialSign(...signers);
                    transaction = await this.signTransaction(transaction);
                    const rawTransaction = transaction.serialize();
                    return await connection.sendRawTransaction(rawTransaction, sendOptions);
                }
                catch (error) {
                    // If the error was thrown by `signTransaction`, rethrow it and don't emit a duplicate event
                    if (error instanceof WalletSignTransactionError) {
                        emit = false;
                        throw error;
                    }
                    throw new WalletSendTransactionError(error?.message, error);
                }
            }
        }
        catch (error) {
            if (emit) {
                this.emit('error', error);
            }
            throw error;
        }
    }
    async signAllTransactions(transactions) {
        for (const transaction of transactions) {
            if (isVersionedTransaction(transaction)) {
                if (!this.supportedTransactionVersions)
                    throw new WalletSignTransactionError(`Signing versioned transactions isn't supported by this wallet`);
                if (!this.supportedTransactionVersions.has(transaction.version))
                    throw new WalletSignTransactionError(`Signing transaction version ${transaction.version} isn't supported by this wallet`);
            }
        }
        const signedTransactions = [];
        for (const transaction of transactions) {
            signedTransactions.push(await this.signTransaction(transaction));
        }
        return signedTransactions;
    }
}
export class BaseMessageSignerWalletAdapter extends BaseSignerWalletAdapter {
}
export class BaseSignInMessageSignerWalletAdapter extends BaseMessageSignerWalletAdapter {
}
//# sourceMappingURL=signer.js.map