import {
  HttpInterface,
  HttpRequest,
  HttpResponse,
} from '@metaplex-foundation/umi';
import fetch, { BodyInit, RequestInit } from 'node-fetch';

export function createFetchHttp(): HttpInterface {
  return {
    send: async <ResponseData, RequestData = any>(
      request: HttpRequest<RequestData>
    ): Promise<HttpResponse<ResponseData>> => {
      const headers = request.headers
        ? Object.entries(request.headers).reduce(
            (acc, [name, headers]) => ({
              ...acc,
              [name.toLowerCase()]: (Array.isArray(headers)
                ? headers.join(', ')
                : headers
              ).toLowerCase(),
            }),
            {} as Record<string, string>
          )
        : {};

      const isJsonRequest =
        headers['content-type']?.includes('application/json') ?? false;

      let body: BodyInit | undefined;
      if (isJsonRequest && request.data) {
        body = JSON.stringify(request.data);
      } else {
        body = request.data as BodyInit | undefined;
      }

      const requestInit: RequestInit = {
        method: request.method,
        body,
        headers,
        follow: request.maxRedirects,
        signal: request.signal as any,
        timeout: request.timeout,
      };

      const response = await fetch(request.url, requestInit);
      const isJsonResponse =
        response.headers.get('content-type')?.includes('application/json') ??
        false;

      const bodyAsText = await response.text();
      const bodyAsJson = isJsonResponse ? JSON.parse(bodyAsText) : undefined;

      return {
        data: bodyAsJson ?? bodyAsText,
        body: bodyAsText,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    },
  };
}
