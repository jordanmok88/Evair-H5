import type { CfEnv } from './env';

const DEFAULT_ORIGINS = ['https://evairdigital.com', 'https://www.evairdigital.com'];

function getAllowedOrigins(env: CfEnv | undefined): Set<string> {
  const set = new Set(DEFAULT_ORIGINS);
  const extra = env?.ALLOWED_ORIGINS;
  if (extra?.trim()) {
    for (const o of extra.split(',').map((s) => s.trim()).filter(Boolean)) {
      set.add(o);
    }
  }
  return set;
}

export function resolveCors(req: Request, env: CfEnv | undefined) {
  const origin = req.headers.get('Origin');
  const allowed = getAllowedOrigins(env);
  if (!origin) {
    return { allowOrigin: null as string | null, rejectCrossOriginBrowser: false };
  }
  if (allowed.has(origin)) {
    return { allowOrigin: origin, rejectCrossOriginBrowser: false };
  }
  return { allowOrigin: null as string | null, rejectCrossOriginBrowser: true };
}

export function jsonHeaders(allowOrigin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (allowOrigin) h['Access-Control-Allow-Origin'] = allowOrigin;
  return h;
}
