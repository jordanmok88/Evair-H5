/**
 * Edge guard for *.netlify.app:
 *   1) Default production subdomain → 301 redirect to www.evairdigital.com (preserve path/query).
 *   2) All other *.netlify.app → X-Robots-Tag noindex (previews duplicate production).
 */

import type { Context } from 'https://edge.netlify.com/';

const PRODUCTION_NETLIFY_APP_HOST = 'evair-h5.netlify.app';
const CANONICAL_HOST = 'www.evairdigital.com';

export default async (request: Request, context: Context): Promise<Response | void> => {
  const host = request.headers.get('host') ?? '';

  if (host === PRODUCTION_NETLIFY_APP_HOST) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.href, 301);
  }

  if (!host.endsWith('.netlify.app')) {
    return undefined;
  }

  const res = await context.next();
  const headers = new Headers(res.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};
