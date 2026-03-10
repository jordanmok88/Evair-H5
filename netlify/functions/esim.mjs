import { createHmac, randomUUID } from 'crypto';

const API_BASE = 'https://api.esimaccess.com/api/v1/open';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function makeAuthHeaders(bodyString) {
  const accessCode = process.env.ESIM_ACCESS_CODE;
  const secret = process.env.ESIM_SECRET;
  if (!accessCode || !secret) throw new Error('Missing ESIM API credentials');

  const timestamp = Date.now().toString();
  const requestId = randomUUID();

  // Sign data = timestamp + requestId + accessCode + requestBody
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

const ALLOWED_ENDPOINTS = [
  '/package/list',
  '/esim/order',
  '/esim/query',
  '/esim/topup',
  '/esim/usage',
];

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  try {
    const { endpoint, payload } = await req.json();

    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint', allowed: ALLOWED_ENDPOINTS }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const data = await proxyRequest(endpoint, payload || {});

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error('eSIM proxy error:', err);
    return new Response(
      JSON.stringify({ error: 'eSIM API proxy error', detail: err.message }),
      { status: 502, headers: corsHeaders() }
    );
  }
};
