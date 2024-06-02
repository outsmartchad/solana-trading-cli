import { SendTransactionError, TransactionError } from '@solana/web3.js';
import { MetaplexError } from './MetaplexError';
import type { ConfirmTransactionResponse } from '@/plugins/rpcModule';

/** @group Errors */
export class RpcError extends MetaplexError {
  readonly name: string = 'RpcError';
  constructor(message: string, cause?: Error) {
    super(message, 'rpc', undefined, cause);
  }
}

/** @group Errors */
export class FailedToSendTransactionError extends RpcError {
  readonly name: string = 'FailedToSendTransactionError';
  constructor(cause: Error) {
    const message =
      'The transaction could not be sent successfully to the network. ' +
      'Please check the underlying error below for more details.';
    super(message, cause);
    if (this.errorLogs.length > 0) {
      this.message =
        this.message +
        `\nProgram Logs:\n${this.errorLogs
          .map((log) => '| ' + log)
          .join('\n')}\n`;
    }
  }

  public asSendTransactionError(): SendTransactionError {
    return this.cause as SendTransactionError;
  }

  public get error() {
    return this.asSendTransactionError().message;
  }

  public get errorLogs() {
    return this.asSendTransactionError().logs ?? [];
  }
}

/** @group Errors */
export class FailedToConfirmTransactionError extends RpcError {
  readonly name: string = 'FailedToConfirmTransactionError';
  constructor(cause: Error) {
    const message =
      'The transaction could not be confirmed. ' +
      'Please check the underlying error below for more details.';
    super(message, cause);
  }
}

/** @group Errors */
export class FailedToConfirmTransactionWithResponseError extends FailedToConfirmTransactionError {
  readonly name: string = 'FailedToConfirmTransactionWithResponseError';
  readonly response: ConfirmTransactionResponse;

  constructor(response: ConfirmTransactionResponse) {
    const getMessage = (error: TransactionError | null): string => {
      if (!error) return 'Unknown error';
      if (typeof error === 'string') return error;
      try {
        return JSON.stringify(error);
      } catch (error) {
        return 'Unknown error';
      }
    };

    super(new Error(getMessage(response.value.err)));
    this.response = response;
  }

  public get error(): TransactionError {
    return this.response.value.err ?? 'Unknown error';
  }
}
