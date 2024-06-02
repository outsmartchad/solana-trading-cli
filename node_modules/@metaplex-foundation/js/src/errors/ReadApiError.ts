import { MetaplexError } from './MetaplexError';

/** @group Errors */
export class ReadApiError extends MetaplexError {
  readonly name: string = 'ReadApiError';
  constructor(message: string, cause?: Error) {
    super(message, 'rpc', undefined, cause);
  }
}
