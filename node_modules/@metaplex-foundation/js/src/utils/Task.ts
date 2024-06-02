import EventEmitterPackage from 'eventemitter3';
import type EventEmitter from 'eventemitter3';
import { Disposable, DisposableScope } from './Disposable';
import { TaskIsAlreadyRunningError } from '@/errors';

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'successful'
  | 'failed'
  | 'canceled';

export type TaskCallback<T, I extends any[]> = (
  scope: DisposableScope,
  ...inputs: I
) => T | Promise<T>;

export type TaskOptions = {
  signal?: AbortSignal;
  force?: boolean;
};

export class Task<T, I extends any[] = []> {
  protected callback: TaskCallback<T, I>;
  protected children: Task<any, any[]>[];
  protected context: object;
  protected status: TaskStatus = 'pending';
  protected result: T | undefined = undefined;
  protected error: unknown = undefined;
  protected eventEmitter: EventEmitter;

  constructor(
    callback: TaskCallback<T, I>,
    children: Task<any, any[]>[] = [],
    context: object = {}
  ) {
    this.callback = callback;
    this.children = children;
    this.context = context;
    this.eventEmitter = new EventEmitterPackage.EventEmitter();
  }

  async run(options: TaskOptions = {}, ...inputs: I): Promise<T> {
    if (this.isRunning()) {
      throw new TaskIsAlreadyRunningError();
    }

    if (this.isPending() || (options.force ?? false)) {
      return this.forceRun(options, ...inputs);
    }

    if (this.isSuccessful()) {
      return this.getResult() as T;
    }

    throw this.getError();
  }

  protected async forceRun(
    options: TaskOptions = {},
    ...inputs: I
  ): Promise<T> {
    const disposable = new Disposable(
      options.signal ?? new AbortController().signal
    );

    disposable.onCancel((cancelError) => {
      this.setStatus('canceled');
      this.error = cancelError;
    });

    return disposable.run(async (scope: DisposableScope) => {
      const { isCanceled, throwIfCanceled } = scope;

      try {
        // Start loading.
        this.setStatus('running');
        this.result = undefined;
        this.error = undefined;
        this.result = await Promise.resolve(this.callback(scope, ...inputs));
        throwIfCanceled();
        this.setStatus('successful');

        // Return the loaded result.
        return this.result;
      } catch (newError) {
        // Capture the error and reset the result.
        this.error = newError;
        this.result = undefined;
        this.setStatus(isCanceled() ? 'canceled' : 'failed');

        // Re-throw the error.
        throw this.error;
      }
    });
  }

  loadWith(preloadedResult: T) {
    this.setStatus('successful');
    this.result = preloadedResult;
    this.error = undefined;

    return this;
  }

  reset() {
    this.setStatus('pending');
    this.result = undefined;
    this.error = undefined;

    return this;
  }

  setChildren(children: Task<any, any[]>[]) {
    this.children = children;

    return this;
  }

  getChildren(): Task<any, any[]>[] {
    return this.children;
  }

  getDescendants(): Task<any, any[]>[] {
    return this.children.flatMap((child) => [child, ...child.getDescendants()]);
  }

  setContext(context: object) {
    this.context = context;

    return this;
  }

  getContext<C extends object = object>(): C {
    return this.context as C;
  }

  getStatus(): TaskStatus {
    return this.status;
  }

  getResult(): T | undefined {
    return this.result;
  }

  getError(): unknown {
    return this.error;
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isRunning(): boolean {
    return this.status === 'running';
  }

  isCompleted(): boolean {
    return this.status !== 'pending' && this.status !== 'running';
  }

  isSuccessful(): boolean {
    return this.status === 'successful';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  isCanceled(): boolean {
    return this.status === 'canceled';
  }

  onStatusChange(callback: (status: TaskStatus) => unknown) {
    this.eventEmitter.on('statusChange', callback);

    return this;
  }

  onStatusChangeTo(status: TaskStatus, callback: () => unknown) {
    return this.onStatusChange((newStatus) =>
      status === newStatus ? callback() : undefined
    );
  }

  onSuccess(callback: () => unknown) {
    return this.onStatusChangeTo('successful', callback);
  }

  onFailure(callback: () => unknown) {
    return this.onStatusChangeTo('failed', callback);
  }

  onCancel(callback: () => unknown) {
    return this.onStatusChangeTo('canceled', callback);
  }

  protected setStatus(newStatus: TaskStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.eventEmitter.emit('statusChange', newStatus);
  }
}
