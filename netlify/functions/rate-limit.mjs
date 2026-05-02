/**
 * Cheap per-instance sliding-window rate limit for serverless abuse mitigation.
 *
 * Limits are best-effort: cold starts reset state; malicious traffic spread across
 * many instances can exceed caps. Prefer Netlify Traffic Rules / WAF where available.
 *
 * Env (optional overrides):
 *   RATE_LIMIT_STRIPE_MAX, RATE_LIMIT_STRIPE_WINDOW_MS
 *   RATE_LIMIT_EMAIL_MAX, RATE_LIMIT_EMAIL_WINDOW_MS
 *   RATE_LIMIT_ESIM_MAX, RATE_LIMIT_ESIM_WINDOW_MS
 *   RATE_LIMIT_TRACK_MAX, RATE_LIMIT_TRACK_WINDOW_MS
 */

const buckets = new Map();

function prune(tsList, windowMs, now) {
  const cutoff = now - windowMs;
  while (tsList.length && tsList[0] < cutoff) tsList.shift();
}

function ipFromReq(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('client-ip') ||
    req.headers.get('cf-connecting-ip') ||
    (req.headers.get('x-forwarded-for') || '')
      .split(',')[0]
      ?.trim() ||
    'unknown'
  );
}

/**
 * @param {Request} req
 * @param {{ name: string, max?: number, windowMs?: number }} bucket
 */
export function rateLimitExceeded(req, { name, max, windowMs }) {
  const m = Number.isFinite(Number(max)) ? Number(max) : 40;
  const w = Number.isFinite(Number(windowMs)) ? Number(windowMs) : 60_000;
  const key = `${ipFromReq(req)}:${name}`;
  const now = Date.now();
  let list = buckets.get(key);
  if (!list) {
    list = [];
    buckets.set(key, list);
  }
  prune(list, w, now);
  if (list.length >= m) return true;
  list.push(now);
  if (buckets.size > 20_000) {
    buckets.clear();
  }
  return false;
}

export function stripeCheckoutLimits() {
  return {
    name: 'stripe-checkout',
    max: Number(process.env.RATE_LIMIT_STRIPE_MAX) || 20,
    windowMs: Number(process.env.RATE_LIMIT_STRIPE_WINDOW_MS) || 60_000,
  };
}

export function sendEmailLimits() {
  return {
    name: 'send-esim-email',
    max: Number(process.env.RATE_LIMIT_EMAIL_MAX) || 8,
    windowMs: Number(process.env.RATE_LIMIT_EMAIL_WINDOW_MS) || 60_000,
  };
}

export function esimProxyLimits() {
  return {
    name: 'esim-proxy',
    max: Number(process.env.RATE_LIMIT_ESIM_MAX) || 60,
    windowMs: Number(process.env.RATE_LIMIT_ESIM_WINDOW_MS) || 60_000,
  };
}

export function trackLimits() {
  return {
    name: 'track',
    max: Number(process.env.RATE_LIMIT_TRACK_MAX) || 120,
    windowMs: Number(process.env.RATE_LIMIT_TRACK_WINDOW_MS) || 60_000,
  };
}

export function stripeVerifyLimits() {
  return {
    name: 'stripe-verify',
    max: Number(process.env.RATE_LIMIT_VERIFY_MAX) || 40,
    windowMs: Number(process.env.RATE_LIMIT_VERIFY_WINDOW_MS) || 60_000,
  };
}
