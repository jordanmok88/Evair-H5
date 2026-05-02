/**
 * Browser CORS for Netlify Functions — allowlisted origins only.
 *
 * Env: ALLOWED_ORIGINS — comma-separated extra origins (e.g. branch deploy URLs,
 *      http://localhost:3000 for Vite proxied dev).
 *
 * Requests with an Origin header not in the allowlist get 403. Requests with no
 * Origin (curl, native app, SSR) still hit the handler.
 */

const DEFAULT_ORIGINS = ['https://evairdigital.com', 'https://www.evairdigital.com'];

let mergedAllowed = null;

function getAllowedOrigins() {
  if (mergedAllowed) return mergedAllowed;
  const set = new Set(DEFAULT_ORIGINS);
  const extra = process.env.ALLOWED_ORIGINS;
  if (extra && extra.trim()) {
    for (const o of extra.split(',').map(s => s.trim()).filter(Boolean)) {
      set.add(o);
    }
  }
  mergedAllowed = set;
  return mergedAllowed;
}

/**
 * @param {Request} req
 * @returns {{ allowOrigin: string | null, rejectCrossOriginBrowser: boolean }}
 */
export function resolveCors(req) {
  const origin = req.headers.get('Origin');
  const allowed = getAllowedOrigins();
  if (!origin) {
    return { allowOrigin: null, rejectCrossOriginBrowser: false };
  }
  if (allowed.has(origin)) {
    return { allowOrigin: origin, rejectCrossOriginBrowser: false };
  }
  return { allowOrigin: null, rejectCrossOriginBrowser: true };
}

/**
 * @param {string | null} allowOrigin Reflect allowed origin only (never '*').
 */
export function jsonHeaders(allowOrigin) {
  const h = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (allowOrigin) h['Access-Control-Allow-Origin'] = allowOrigin;
  return h;
}
