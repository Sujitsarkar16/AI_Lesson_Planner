import type { AuthenticatedUser } from '../../shared/auth.js';
import { json, readBody, type ApiRequest, type ApiResponse } from '../../shared/http.js';
import { consumeGenerationQuota, profileFor, profileResponse, usageLimit } from './service.js';

export async function handleUser(req: ApiRequest, res: ApiResponse, path: string, auth: AuthenticatedUser) {
  const body = req.method === 'GET' ? {} : await readBody(req);
  const profile = await profileFor(auth, body);

  if (path === '/profile' && (req.method === 'GET' || req.method === 'POST')) return json(res, 200, profileResponse(profile));
  if (path === '/usage/check' && req.method === 'POST') return json(res, 200, await usageLimit(profile));
  if (path === '/usage/increment' && req.method === 'POST') {
    if (!(await consumeGenerationQuota(profile))) return json(res, 429, await usageLimit(profile));
    return json(res, 200, { success: true });
  }
  return false;
}
