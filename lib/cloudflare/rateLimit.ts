import type { CfEnv } from './env';

/** Best-effort per-instance sliding window (cold starts reset). */

const buckets = new Map<string, number[]>();

function prune(tsList: number[], windowMs: number, now: number) {
  const cutoff = now - windowMs;
  while (tsList.length && tsList[0]! < cutoff) tsList.shift();
}

export function ipFromReq(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('client-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() ||
    'unknown'
  );
}

export function rateLimitExceeded(
  req: Request,
  { name, max, windowMs }: { name: string; max?: number; windowMs?: number },
): boolean {
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
  if (buckets.size > 20_000) buckets.clear();
  return false;
}

export function stripeCheckoutLimits(env: CfEnv | undefined) {
  return {
    name: 'stripe-checkout',
    max: Number(env?.RATE_LIMIT_STRIPE_MAX) || 20,
    windowMs: Number(env?.RATE_LIMIT_STRIPE_WINDOW_MS) || 60_000,
  };
}

export function sendEmailLimits(env: CfEnv | undefined) {
  return {
    name: 'send-esim-email',
    max: Number(env?.RATE_LIMIT_EMAIL_MAX) || 8,
    windowMs: Number(env?.RATE_LIMIT_EMAIL_WINDOW_MS) || 60_000,
  };
}

export function esimProxyLimits(env: CfEnv | undefined) {
  return {
    name: 'esim-proxy',
    max: Number(env?.RATE_LIMIT_ESIM_MAX) || 60,
    windowMs: Number(env?.RATE_LIMIT_ESIM_WINDOW_MS) || 60_000,
  };
}

export function trackLimits(env: CfEnv | undefined) {
  return {
    name: 'track',
    max: Number(env?.RATE_LIMIT_TRACK_MAX) || 120,
    windowMs: Number(env?.RATE_LIMIT_TRACK_WINDOW_MS) || 60_000,
  };
}

export function stripeVerifyLimits(env: CfEnv | undefined) {
  return {
    name: 'stripe-verify',
    max: Number(env?.RATE_LIMIT_VERIFY_MAX) || 40,
    windowMs: Number(env?.RATE_LIMIT_VERIFY_WINDOW_MS) || 60_000,
  };
}
