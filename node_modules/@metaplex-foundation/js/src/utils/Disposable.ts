import EventEmitterPackage from 'eventemitter3';
import type EventEmitter from 'eventemitter3';

export type DisposableScope = {
  signal: AbortSignal | undefined;
  isCanceled: () => boolean;
  getCancelationError: () => unknown;
  throwIfCanceled: () => void;
};

export class Disposable {
  protected eventEmitter: EventEmitter;
  protected signal: AbortSignal;
  protected cancelationError: unknown = null;
  protected abortListener: (error: unknown) => void;

  constructor(signal: AbortSignal) {
    this.signal = signal;
    this.eventEmitter = new EventEmitterPackage.EventEmitter();
    this.abortListener = (error: unknown) => {
      this.cancelationError = error;
      this.eventEmitter.emit('cancel', error);
      this.close();
    };
    this.signal.addEventListener('abort', this.abortListener);
  }

  async run<T>(
    callback: (scope: DisposableScope) => T,
    thenCloseDisposable = true
  ) {
    try {
      return await Promise.resolve(callback(this.getScope()));
    } finally {
      if (thenCloseDisposable) {
        this.close();
      }
    }
  }

  getScope(): DisposableScope {
    return {
      signal: this.signal,
      isCanceled: () => this.isCanceled(),
      getCancelationError: () => this.cancelationError,
      throwIfCanceled: () => {
        if (this.isCanceled()) {
          throw this.getCancelationError();
        }
      },
    };
  }

  isCanceled() {
    return this.signal.aborted;
  }

  getCancelationError() {
    return this.cancelationError;
  }

  onCancel(callback: (reason: unknown) => unknown): Disposable {
    this.eventEmitter.on('cancel', callback);

    return this;
  }

  close() {
    this.signal.removeEventListener('abort', this.abortListener);
    this.eventEmitter.removeAllListeners();
  }
}
