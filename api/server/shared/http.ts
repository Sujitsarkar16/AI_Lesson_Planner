import type { IncomingMessage, ServerResponse } from 'node:http';

export type ApiRequest = IncomingMessage;
export type ApiResponse = ServerResponse;

export const json = (res: ApiResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
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
