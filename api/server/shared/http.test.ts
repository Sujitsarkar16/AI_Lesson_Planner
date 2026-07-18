import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { readRawBody, RequestBodyTooLargeError } from './http.js';

const postRawBody = async (body: Uint8Array, maxBytes = 1_000_000) => new Promise<{ status: number; body: string }>((resolve, reject) => {
  const server = createServer(async (request, response) => {
    try {
      response.end((await readRawBody(request, maxBytes)).toString('base64'));
    } catch (error) {
      response.statusCode = error instanceof RequestBodyTooLargeError ? 413 : 500;
      response.end();
    }
  });
  server.once('error', reject);
  server.listen(0, '127.0.0.1', async () => {
    try {
      const { port } = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${port}`, { method: 'POST', body });
      resolve({ status: response.status, body: await response.text() });
    } catch (error) {
      reject(error);
    } finally {
      server.close();
    }
  });
});

test('readRawBody preserves the original bytes', async () => {
  const bytes = Buffer.from([0, 255, ...Buffer.from('stripe')]);
  const result = await postRawBody(bytes);
  assert.equal(result.status, 200);
  assert.equal(result.body, bytes.toString('base64'));
});

test('readRawBody rejects bodies above its configured limit', async () => {
  const result = await postRawBody(Buffer.from('1234'), 3);
  assert.equal(result.status, 413);
});
