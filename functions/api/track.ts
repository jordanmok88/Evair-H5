import type { CfEnv } from '../../lib/cloudflare/env';
import { resolveCors, jsonHeaders } from '../../lib/cloudflare/cors';
import { rateLimitExceeded, trackLimits } from '../../lib/cloudflare/rateLimit';

export async function onRequest(context: { request: Request; env: CfEnv }): Promise<Response> {
  const { request: req, env } = context;
  const { allowOrigin, rejectCrossOriginBrowser } = resolveCors(req, env);
  const headers = jsonHeaders(allowOrigin);

  if (req.method === 'OPTIONS') {
    if (rejectCrossOriginBrowser) {
      return new Response(null, { status: 403, headers });
    }
    return new Response(null, { status: 204, headers });
  }

  if (rejectCrossOriginBrowser) {
    return new Response(JSON.stringify({ error: 'Forbidden origin' }), {
      status: 403,
      headers,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  if (rateLimitExceeded(req, trackLimits(env))) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}
