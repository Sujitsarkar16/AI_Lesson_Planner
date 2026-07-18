import { requireAuth } from './server/shared/auth.js';
import { getServerConfiguration } from './server/shared/config.js';
import { json, readRawBody, RequestBodyTooLargeError, type ApiRequest, type ApiResponse } from './server/shared/http.js';
import { handleCurriculum } from './server/modules/curriculum/handler.js';
import { handleDocuments } from './server/modules/documents/handler.js';
import { handleGeneration } from './server/modules/generation/handler.js';
import { handleStudent } from './server/modules/student/handler.js';
import { handleUser } from './server/modules/user/handler.js';
import { handleBilling, handleStripeWebhook } from './server/modules/billing/handler.js';
import { getDatabase } from './server/shared/database.js';
import { RateLimitStorageError, rateLimit } from './server/modules/billing/core.js';
import { profileFor } from './server/modules/user/service.js';

const indexedPaths = ['/', '/product', '/schools', '/pricing', '/trust-ai'];

const siteOrigin = (req: ApiRequest) => {
  const configuredOrigin = getServerConfiguration().publicAppOrigin;
  if (configuredOrigin) return configuredOrigin;
  const header = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const host = (Array.isArray(header) ? header[0] : header).split(',')[0].trim();
  const safeHost = /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? host : 'localhost:3000';
  const forwardedProtocol = req.headers['x-forwarded-proto'];
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol) === 'https' || process.env.VERCEL ? 'https' : 'http';
  return `${protocol}://${safeHost}`;
};

const sendText = (res: ApiResponse, contentType: string, body: string) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.end(body);
};

const handleSeoFile = (req: ApiRequest, res: ApiResponse, path: string) => {
  const origin = siteOrigin(req);
  if (path === '/robots.txt') return sendText(res, 'text/plain; charset=utf-8', `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  if (path === '/sitemap.xml') {
    const urls = indexedPaths.map((pathname) => `  <url><loc>${origin}${pathname}</loc></url>`).join('\n');
    return sendText(res, 'application/xml; charset=utf-8', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  }
  return false;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const rawPath = url.pathname || '/';
    if (rawPath === '/robots.txt' || rawPath === '/sitemap.xml') return handleSeoFile(req, res, rawPath);
    const path = rawPath.replace(/^\/api/, '') || '/';
    if (path === '/webhooks/stripe' && req.method === 'POST') {
      try {
        return handleStripeWebhook(req, res, await readRawBody(req));
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) return json(res, 413, { error: 'Request body is too large.' });
        throw error;
      }
    }
    if (path.startsWith('/student')) return await handleStudent(req, res, path);

    const auth = await requireAuth(req);
    if (path === '/profile') {
      if (await handleUser(req, res, path, auth) !== false) return;
    }
    if (path.startsWith('/usage/')) return json(res, 404, { error: 'Endpoint not found.' });
    const billingPath = path === '/entitlements' || path.startsWith('/billing/') || path.startsWith('/generate/') || path.startsWith('/generation-jobs/') || path.startsWith('/documents') || path.startsWith('/export-jobs/') || path.startsWith('/exports/') || path === '/notifications' || path.startsWith('/admin/');
    if (billingPath) {
      const profile = await profileFor(auth);
      let limit;
      try { limit = await rateLimit(await getDatabase(), profile._id); }
      catch (error) { if (error instanceof RateLimitStorageError) return json(res, 503, { error: 'Request protection is temporarily unavailable.', code: 'RateLimitUnavailable' }); throw error; }
      if (!limit.allowed) { res.setHeader('Retry-After', String(limit.retryAfter)); return json(res, 429, { error: 'Request rate limit reached.', code: 'RateLimited' }); }
      if (path.startsWith('/generate/')) { if (await handleGeneration(req, res, path, auth, profile) !== false) return; }
      if (path.startsWith('/documents')) { if (await handleDocuments(req, res, path, auth, profile) !== false) return; }
      if (await handleBilling(req, res, path, auth, profile) !== false) return;
    }
    if (path.startsWith('/curriculum') || path.startsWith('/concept-maps') || path === '/lesson-sequences') {
      if (await handleCurriculum(req, res, path, auth) !== false) return;
    }
    return json(res, 404, { error: 'Endpoint not found.' });
  } catch (error) {
    console.error('API request failed:', error);
    const authFailure = error instanceof Error && /Authentication|Auth0|Token subject|expired/i.test(error.message);
    return json(res, authFailure ? 401 : 500, { error: authFailure ? 'Authentication failed.' : 'Request could not be completed.' });
  }
}
