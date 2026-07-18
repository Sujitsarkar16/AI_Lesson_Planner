export class ApiRequestError extends Error {
  constructor(public readonly status: number, message: string, public readonly details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** @deprecated Use ApiRequestError. */
export class CalendarPlanApiError extends ApiRequestError {
  readonly diagnostics: unknown[];
  constructor(status: number, message: string, diagnostics: unknown[] = []) {
    super(status, message, { diagnostics });
    this.name = 'CalendarPlanApiError';
    this.diagnostics = diagnostics;
  }
}

let accessToken: string | null = null;
export const setApiAccessToken = (token: string | null) => { accessToken = token; };

const requestHeaders = (headers?: HeadersInit, hasBody = false) => {
  const result = new Headers(headers);
  if (accessToken) result.set('Authorization', `Bearer ${accessToken}`);
  if (hasBody && !result.has('Content-Type')) result.set('Content-Type', 'application/json');
  return result;
};

const request = (path: string, options: RequestInit = {}) => fetch(`/api${path}`, {
  ...options,
  headers: requestHeaders(options.headers, Boolean(options.body)),
  credentials: 'include'
});

export const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await request(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (path.startsWith('/curriculum/calendar-plans')) throw new CalendarPlanApiError(response.status, data.error || 'Request failed.', data.diagnostics || []);
    throw new ApiRequestError(response.status, data.error || 'Request failed.', data);
  }
  return data as T;
};

export const apiDownload = async (path: string): Promise<{ blob: Blob; filename?: string }> => {
  const response = await request(path);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiRequestError(response.status, data.error || 'Download failed.', data);
  }
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return { blob: await response.blob(), filename };
};
