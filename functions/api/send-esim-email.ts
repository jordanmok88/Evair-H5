import type { CfEnv } from '../../lib/cloudflare/env';
import { resolveCors, jsonHeaders } from '../../lib/cloudflare/cors';

/**
 * Public Resend relay is closed.
 *
 * This URL used to accept `{ email, qrCodeUrl, lpaString, ... }` from
 * anyone (missing Origin is allowed) and send a branded EvairSIM message
 * with the company Resend key. Checkout no longer calls it — delivery
 * goes through the authenticated Laravel route
 * `POST /app/email/esim-delivery`.
 */
const CLOSED_BODY = JSON.stringify({
  error: 'This public email endpoint is closed. Delivery is handled by the account API.',
});

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
    return new Response(JSON.stringify({ error: 'Forbidden origin' }), { status: 403, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  return new Response(CLOSED_BODY, { status: 410, headers });
}
