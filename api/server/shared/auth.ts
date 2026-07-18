import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { ApiRequest } from './http.js';

export type AuthenticatedUser = { auth0Id: string; email?: string; name?: string; claims: Readonly<Record<string, unknown>> };

export const requireAuth = async (req: ApiRequest): Promise<AuthenticatedUser> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new Error('Authentication required.');

  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;
  if (!domain || !audience) throw new Error('Auth0 server configuration is missing.');

  const issuer = `https://${domain}/`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
  const { payload } = await jwtVerify(header.slice(7), jwks, { issuer, audience });
  if (typeof payload.sub !== 'string') throw new Error('Token subject is missing.');

  return {
    auth0Id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    claims: payload as Record<string, unknown>
  };
};
