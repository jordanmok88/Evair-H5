/**
 * Packaging QR → GET /r?src=… → optional Supabase log → 302 to public app shell.
 */

import type { CfEnv } from '../lib/cloudflare/env';

const DEFAULT_PUBLIC_APP = 'https://www.evairdigital.com/app';

function parseDevice(ua: string): string {
  if (!ua) return 'unknown';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh/i.test(ua)) return 'Mac';
  return 'other';
}

async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '_evair_salt_2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/** Cloudflare `request.cf` (subset). */
interface CfIncoming {
  country?: string;
  region?: string;
  regionCode?: string;
  city?: string;
}

function geoFromRequest(request: Request) {
  const cf = (request as Request & { cf?: CfIncoming }).cf;
  return {
    country: cf?.country ?? null,
    region: cf?.regionCode || cf?.region || null,
    city: cf?.city ?? null,
  };
}

export async function onRequest(context: { request: Request; env: CfEnv }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const src = url.searchParams.get('src') || 'direct';

  const target = (env.QR_SCAN_REDIRECT_URL || DEFAULT_PUBLIC_APP).replace(/\/$/, '');
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const ua = request.headers.get('user-agent') || '';
      const clientIp =
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-nf-client-connection-ip') ||
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        null;

      const geo = geoFromRequest(request);
      const row = {
        source: src,
        country: geo.country ?? null,
        region: geo.region ?? null,
        city: geo.city ?? null,
        device: parseDevice(ua),
        user_agent: ua.slice(0, 512),
        ip_hash: await hashIp(clientIp),
      };

      await fetch(`${supabaseUrl}/rest/v1/qr_scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      });
    } catch {
      // Logging failure must never block the redirect
    }
  }

  return new Response(null, {
    status: 302,
    headers: { Location: target },
  });
}
