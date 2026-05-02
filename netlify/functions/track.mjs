/**
 * Lightweight analytics beacon — resolves /api/track 404 after prior mis-wire.
 *
 * Accepts POST JSON payloads from the SPA (same CORS/rate-limit pattern as peers).
 */

import { resolveCors, jsonHeaders } from './cors.mjs';
import { rateLimitExceeded, trackLimits } from './rate-limit.mjs';

export default async (req) => {
  const { allowOrigin, rejectCrossOriginBrowser } = resolveCors(req);

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

  if (rateLimitExceeded(req, trackLimits())) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
};
