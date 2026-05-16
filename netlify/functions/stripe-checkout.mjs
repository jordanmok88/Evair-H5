import { resolveCors, jsonHeaders } from './cors.mjs';
import { rateLimitExceeded, stripeCheckoutLimits } from './rate-limit.mjs';

const LARAVEL_API_BASE = process.env.LARAVEL_API_BASE || 'https://evair.zhhwxt.cn/api/v1';

function safeReturnUrl(value, callerOrigin, fallbackPath) {
  if (typeof value === 'string' && value.length < 2048 && value.startsWith(callerOrigin)) {
    return value;
  }
  return `${callerOrigin}${fallbackPath}`;
}

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

  if (rateLimitExceeded(req, stripeCheckoutLimits())) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  try {
    const { orderNo, successUrl, cancelUrl } = await req.json();

    const callerOrigin =
      allowOrigin ||
      req.headers.get('Origin') ||
      req.headers.get('Referer')?.split('/').slice(0, 3).join('/') ||
      'https://evairdigital.com';

    if (typeof orderNo !== 'string' || !orderNo.trim()) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: orderNo',
          detail: 'Checkout amount is loaded from the Laravel order. Browser-supplied prices are not accepted.',
        }),
        { status: 400, headers },
      );
    }

    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers,
      });
    }

    const laravelRes = await fetch(`${LARAVEL_API_BASE}/app/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({
        order_no: orderNo.trim(),
        success_url: safeReturnUrl(
          successUrl,
          callerOrigin,
          '/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
        ),
        cancel_url: safeReturnUrl(cancelUrl, callerOrigin, '/?stripe_status=cancelled'),
      }),
    });

    const text = await laravelRes.text();
    return new Response(text, { status: laravelRes.status, headers });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return new Response(
      JSON.stringify({
        error: 'Failed to create checkout session',
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers },
    );
  }
};
