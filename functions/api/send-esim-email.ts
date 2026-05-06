import type { CfEnv } from '../../lib/cloudflare/env';
import { resolveCors, jsonHeaders } from '../../lib/cloudflare/cors';
import { rateLimitExceeded, sendEmailLimits } from '../../lib/cloudflare/rateLimit';
import {
  buildSendEsimEmailHtml,
  type SendEsimEmailPayload,
} from '../../lib/cloudflare/sendEsimEmailHtml';

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

  if (rateLimitExceeded(req, sendEmailLimits(env))) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers,
    });
  }

  try {
    const body = (await req.json()) as SendEsimEmailPayload & { email?: string };
    const { email, ...rest } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers,
      });
    }

    const html = buildSendEsimEmailHtml(rest);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'EvairSIM <onboarding@resend.dev>',
        to: [email],
        subject: `Your eSIM is ready${rest.packageName ? ` — ${rest.packageName}` : ''}`,
        html,
      }),
    });

    const result = (await res.json()) as { message?: string; id?: string };

    if (!res.ok) {
      console.error('Resend error:', result);
      return new Response(JSON.stringify({ error: result.message || 'Email send failed' }), {
        status: res.status,
        headers,
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('send-esim-email error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      {
        status: 500,
        headers,
      },
    );
  }
}
