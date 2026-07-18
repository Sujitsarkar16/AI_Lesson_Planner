let accessToken: string | null = null;

export const setApiAccessToken = (token: string | null) => {
  accessToken = token;
};

const requestHeaders = (headers?: HeadersInit, hasBody = false) => {
  const result = new Headers(headers);
  if (accessToken) result.set('Authorization', `Bearer ${accessToken}`);
  if (hasBody) result.set('Content-Type', 'application/json');
  return result;
};

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: requestHeaders(options.headers, Boolean(options.body)),
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data as T;
};

export async function* apiRequestStream(path: string, body: unknown): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: requestHeaders(undefined, true),
    body: JSON.stringify(body),
    credentials: 'include'
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed.');
  }
  if (!response.body) throw new Error('Generation response did not include a stream.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) yield chunk;
    }
    const finalChunk = decoder.decode();
    if (finalChunk) yield finalChunk;
  } finally {
    reader.releaseLock();
  }
}
