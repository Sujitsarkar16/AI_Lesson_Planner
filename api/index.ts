import { requireAuth } from './server/shared/auth.js';
import { json, type ApiRequest, type ApiResponse } from './server/shared/http.js';
import { handleCurriculum } from './server/modules/curriculum/handler.js';
import { handleDocuments } from './server/modules/documents/handler.js';
import { handleGeneration } from './server/modules/generation/handler.js';
import { handleStudent } from './server/modules/student/handler.js';
import { handleUser } from './server/modules/user/handler.js';

const indexedPaths = ['/', '/product', '/schools', '/pricing', '/trust-ai'];

const siteOrigin = (req: ApiRequest) => {
  try {
    const configuredUrl = process.env.VITE_APP_URL;
    if (configuredUrl) return new URL(configuredUrl).origin;
  } catch { /* Fall back to the request origin when VITE_APP_URL is not a valid URL. */ }
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
    if (path.startsWith('/student')) return await handleStudent(req, res, path);

    const auth = await requireAuth(req);
    if (path === '/profile' || path.startsWith('/usage/')) {
      if (await handleUser(req, res, path, auth) !== false) return;
    }
    if (path === '/generate') {
      if (await handleGeneration(req, res, path, auth) !== false) return;
    }
    if (path.startsWith('/documents')) {
      if (await handleDocuments(req, res, path, auth) !== false) return;
    }
    if (path.startsWith('/curriculum') || path.startsWith('/concept-maps') || path === '/lesson-sequences') {
      if (await handleCurriculum(req, res, path, auth) !== false) return;
    }
    return json(res, 404, { error: 'Endpoint not found.' });
  } catch (error) {
    console.error('API request failed:', error);
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return json(res, message.includes('required') || message.includes('Invalid') || message.includes('expired') ? 401 : 500, { error: message });
  }
}
