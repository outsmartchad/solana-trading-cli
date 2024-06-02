import { InterfaceImplementationMissingError } from './errors';
import { HttpRequest } from './HttpRequest';
import { HttpResponse } from './HttpResponse';

/**
 * Defines the interface for an HTTP client.
 *
 * @category Context and Interfaces
 */
export interface HttpInterface {
  /** Sends a HTTP request and returns its response. */
  send: <ResponseData, RequestData = any>(
    request: HttpRequest<RequestData>
  ) => Promise<HttpResponse<ResponseData>>;
}

/**
 * An implementation of the {@link HttpInterface} that throws an error when called.
 * @category Http
 */
export function createNullHttp(): HttpInterface {
  const errorHandler = () => {
    throw new InterfaceImplementationMissingError('HttpInterface', 'http');
  };
  return { send: errorHandler };
}
