import { createHmac, randomUUID } from 'crypto';
import { resolveCors, jsonHeaders } from './cors.mjs';
import { rateLimitExceeded, esimProxyLimits } from './rate-limit.mjs';

const API_BASE = 'https://api.esimaccess.com/api/v1/open';

function makeAuthHeaders(bodyString) {
  const accessCode = process.env.ESIM_ACCESS_CODE;
  const secret = process.env.ESIM_SECRET;
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

async function proxyRequest(endpoint, body) {
  const url = `${API_BASE}${endpoint}`;
  const bodyString = JSON.stringify(body);
  const headers = makeAuthHeaders(bodyString);

  console.log('[esim-proxy] Calling:', url);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: bodyString,
  });

  const text = await res.text();
  console.log('[esim-proxy] Status:', res.status, 'Body:', text.substring(0, 500));

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from API: ${text.substring(0, 200)}`);
  }

  return data;
}

const ALLOWED_ENDPOINTS = ['/package/list', '/esim/order', '/esim/query', '/esim/topup', '/esim/usage'];

export default async (req) => {
  const { allowOrigin, rejectCrossOriginBrowser } = resolveCors(req);
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

  if (rateLimitExceeded(req, esimProxyLimits())) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  try {
    const { endpoint, payload } = await req.json();

    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint', allowed: ALLOWED_ENDPOINTS }),
        { status: 400, headers },
      );
    }

    const data = await proxyRequest(endpoint, payload || {});

    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('eSIM proxy error:', err);
    return new Response(
      JSON.stringify({ error: 'eSIM API proxy error', detail: err.message }),
      { status: 502, headers },
    );
  }
};
