import type { Metaplex } from '@/Metaplex';
import {
  OperationConstructor,
  Operation,
  KeyOfOperation,
  InputOfOperation,
  OutputOfOperation,
  OperationHandler,
  OperationOptions,
  OperationScope,
} from '@/types';
import { Disposable, DisposableScope } from '@/utils';
import { OperationHandlerMissingError } from '@/errors';

/**
 * @group Modules
 */
export class OperationClient {
  /**
   * Maps the name of an operation with its operation handler.
   * Whilst the types on the Map are relatively loose, we ensure
   * operations match with their handlers when registering them.
   */
  protected operationHandlers: Map<
    string,
    OperationHandler<any, any, any, any>
  > = new Map();
  constructor(protected readonly metaplex: Metaplex) {}

  register<
    T extends Operation<K, I, O>,
    K extends string = KeyOfOperation<T>,
    I = InputOfOperation<T>,
    O = OutputOfOperation<T>
  >(
    operationConstructor: OperationConstructor<T, K, I, O>,
    operationHandler: OperationHandler<T, K, I, O>
  ) {
    this.operationHandlers.set(operationConstructor.key, operationHandler);

    return this;
  }

  get<
    T extends Operation<K, I, O>,
    K extends string = KeyOfOperation<T>,
    I = InputOfOperation<T>,
    O = OutputOfOperation<T>
  >(operation: T): OperationHandler<T, K, I, O> {
    const operationHandler = this.operationHandlers.get(operation.key) as
      | OperationHandler<T, K, I, O>
      | undefined;

    if (!operationHandler) {
      throw new OperationHandlerMissingError(operation.key);
    }

    return operationHandler;
  }

  async execute<
    T extends Operation<K, I, O>,
    K extends string = KeyOfOperation<T>,
    I = InputOfOperation<T>,
    O = OutputOfOperation<T>
  >(operation: T, options: OperationOptions = {}): Promise<O> {
    const operationHandler = this.get<T, K, I, O>(operation);
    const signal = options.signal ?? new AbortController().signal;

    return new Disposable(signal).run((scope) =>
      operationHandler.handle(
        operation,
        this.metaplex,
        this.getOperationScope(options, scope)
      )
    );
  }

  protected getOperationScope(
    options: OperationOptions,
    scope: DisposableScope
  ): OperationScope {
    if (!!options.commitment && !options.confirmOptions) {
      options.confirmOptions = { commitment: options.commitment };
    }

    const payer = options.payer ?? this.metaplex.rpc().getDefaultFeePayer();

    return { ...options, ...scope, payer };
  }
}
