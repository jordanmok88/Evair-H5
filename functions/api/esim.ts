import { createHmac, randomUUID } from 'node:crypto';
import type { CfEnv } from '../../lib/cloudflare/env';
import { resolveCors, jsonHeaders } from '../../lib/cloudflare/cors';
import { rateLimitExceeded, esimProxyLimits } from '../../lib/cloudflare/rateLimit';

const API_BASE = 'https://api.esimaccess.com/api/v1/open';

function makeAuthHeaders(bodyString: string, env: CfEnv): Record<string, string> {
  const accessCode = env.ESIM_ACCESS_CODE;
  const secret = env.ESIM_SECRET;
  if (!accessCode || !secret) throw new Error('Missing ESIM API credentials');

  const timestamp = Date.now().toString();
  const requestId = randomUUID();

  const signData = timestamp + requestId + accessCode + bodyString;
  const signature = createHmac('sha256', secret)
    .update(signData)
    .digest('hex')
    .toUpperCase();

  return {
    'RT-AccessCode': accessCode,
    'RT-RequestID': requestId,
    'RT-Timestamp': timestamp,
    'RT-Signature': signature,
    'Content-Type': 'application/json',
  };
}

async function proxyRequest(endpoint: string, body: unknown, env: CfEnv): Promise<unknown> {
  const url = `${API_BASE}${endpoint}`;
  const bodyString = JSON.stringify(body);
  const headers = makeAuthHeaders(bodyString, env);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: bodyString,
  });

  const text = await res.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Non-JSON response from API: ${text.substring(0, 200)}`);
  }
}

const ALLOWED_ENDPOINTS = ['/package/list', '/esim/order', '/esim/query', '/esim/topup', '/esim/usage'];

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

  if (rateLimitExceeded(req, esimProxyLimits(env))) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  try {
    const { endpoint, payload } = (await req.json()) as { endpoint?: string; payload?: unknown };

    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint', allowed: ALLOWED_ENDPOINTS }),
        { status: 400, headers },
      );
    }

    const data = await proxyRequest(endpoint, payload ?? {}, env);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('eSIM proxy error:', err);
    return new Response(
      JSON.stringify({ error: 'eSIM API proxy error', detail: err instanceof Error ? err.message : String(err) }),
      { status: 502, headers },
    );
  }
}
