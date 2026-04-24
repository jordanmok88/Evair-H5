/**
 * QR Scan Tracker — Netlify Function
 *
 * QR code → GET /r?src=amazon → log scan to Supabase → 302 redirect to H5 app
 *
 * Env vars required (set in Netlify dashboard):
 *   SUPABASE_URL          — e.g. https://xxxxx.supabase.co
 *   SUPABASE_SERVICE_KEY   — service_role key (server-side only)
 *
 * Supabase table: qr_scans (see SQL in docs/)
 */

const H5_APP_URL = 'https://evair-h5.netlify.app';

function parseDevice(ua) {
  if (!ua) return 'unknown';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh/i.test(ua)) return 'Mac';
  return 'other';
}

async function hashIp(ip) {
  if (!ip) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + '_evair_salt_2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export default async (req, context) => {
  const url = new URL(req.url);
  const src = url.searchParams.get('src') || 'direct';

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const ua = req.headers.get('user-agent') || '';
      const clientIp = context?.ip
        || req.headers.get('x-nf-client-connection-ip')
        || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || null;

      const geo = context?.geo || {};
      const country = geo.country?.code || req.headers.get('x-country') || null;
      const region = geo.subdivision?.code || req.headers.get('x-nf-geo') || null;
      const city = geo.city || null;

      const row = {
        source: src,
        country: country,
        region: region,
        city: city,
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
    } catch (_) {
      // Logging failure must never block the redirect
    }
  }

  return new Response(null, {
    status: 302,
    headers: { Location: H5_APP_URL },
  });
};
