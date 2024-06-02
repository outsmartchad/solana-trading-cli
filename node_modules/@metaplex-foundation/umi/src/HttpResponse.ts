import type { HttpResponseHeaders } from './HttpHeaders';

/**
 * Defines a HTTP Response with custom data.
 * @category Http
 */
export type HttpResponse<D = any> = {
  data: D;
  body: string;
  ok: boolean;
  status: number;
  statusText: string;
  headers: HttpResponseHeaders;
};
