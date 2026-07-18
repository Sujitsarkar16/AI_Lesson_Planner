import type { IncomingMessage, ServerResponse } from 'node:http';

export type ApiRequest = IncomingMessage;
export type ApiResponse = ServerResponse;

export const json = (res: ApiResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

export class RequestBodyTooLargeError extends Error {
  constructor(public readonly limit: number) {
    super('Request body exceeds the allowed size.');
  }
}

export const readRawBody = async (req: ApiRequest, maxBytes = 1_000_000): Promise<Buffer> => {
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    req.resume();
    throw new RequestBodyTooLargeError(maxBytes);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const fail = (error: Error) => {
      cleanup();
      req.resume();
      reject(error);
    };
    const onData = (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > maxBytes) return fail(new RequestBodyTooLargeError(maxBytes));
      chunks.push(bytes);
    };
    const onEnd = () => { cleanup(); resolve(Buffer.concat(chunks)); };
    const onError = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
    };
    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', onError);
  });
};

export const readBody = async (req: ApiRequest): Promise<Record<string, any>> => new Promise((resolve, reject) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    if (!body) return resolve({});
    try { resolve(JSON.parse(body)); } catch { reject(new Error('Request body must be valid JSON.')); }
  });
  req.on('error', reject);
});
