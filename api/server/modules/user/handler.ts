import type { AuthenticatedUser } from '../../shared/auth.js';
import { json, readBody, type ApiRequest, type ApiResponse } from '../../shared/http.js';
import { profileFor, profileResponse } from './service.js';

export async function handleUser(req: ApiRequest, res: ApiResponse, path: string, auth: AuthenticatedUser) {
  if (path !== '/profile' || (req.method !== 'GET' && req.method !== 'POST')) return false;
  const profile = await profileFor(auth, req.method === 'GET' ? {} : await readBody(req));
  return json(res, 200, profileResponse(profile));
}
