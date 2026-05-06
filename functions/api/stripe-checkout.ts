import Stripe from 'stripe';
import type { CfEnv } from '../../lib/cloudflare/env';
import { resolveCors, jsonHeaders } from '../../lib/cloudflare/cors';
import { rateLimitExceeded, stripeCheckoutLimits } from '../../lib/cloudflare/rateLimit';

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

  if (rateLimitExceeded(req, stripeCheckoutLimits(env))) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers,
    });
  }

  try {
    const {
      packageName,
      priceUsd,
      email,
      packageCode,
      transactionId,
      countryCode,
      successUrl,
      cancelUrl,
      orderId,
      orderNo,
      userId,
    } = (await req.json()) as Record<string, unknown>;

    if (!packageName || priceUsd === undefined || priceUsd === null || !packageCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: packageName, priceUsd, packageCode' }),
        { status: 400, headers },
      );
    }

    const stripe = new Stripe(secretKey);

    const callerOrigin =
      allowOrigin ||
      req.headers.get('Origin') ||
      req.headers.get('Referer')?.split('/').slice(0, 3).join('/') ||
      'https://evairdigital.com';

    const isSafeReturn = (url: unknown): url is string =>
      typeof url === 'string' && url.length < 2048 && url.startsWith(callerOrigin);

    const safeSuccessUrl = isSafeReturn(successUrl)
      ? successUrl
      : `${callerOrigin}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`;
    const safeCancelUrl = isSafeReturn(cancelUrl) ? cancelUrl : `${callerOrigin}/?stripe_status=cancelled`;

    const countryStr = typeof countryCode === 'string' ? countryCode : '';
    const flagUrl = countryStr
      ? `https://wsrv.nl/?url=flagcdn.com/w320/${countryStr.toLowerCase()}.png&w=324&h=217&fit=contain&we&cbg=d0d3d8`
      : undefined;

    const orderMetadata =
      orderId != null && orderId !== ''
        ? {
            order_type: 'order',
            order_id: String(orderId),
            ...(orderNo != null && orderNo !== '' ? { order_number: String(orderNo) } : {}),
            ...(userId != null && userId !== '' ? { user_id: String(userId) } : {}),
            channel: 'h5',
          }
        : null;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: typeof email === 'string' ? email || undefined : undefined,
      allow_promotion_codes: true,
      adaptive_pricing: { enabled: false },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: String(packageName),
              description: 'eSIM Data Plan — Instant Digital Delivery',
              ...(flagUrl ? { images: [flagUrl] } : {}),
            },
            unit_amount: Math.round(Number(priceUsd) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        packageCode: String(packageCode),
        ...(transactionId != null ? { transactionId: String(transactionId) } : {}),
        packageName: String(packageName),
        ...(orderMetadata ?? {}),
      },
      ...(orderMetadata ? { payment_intent_data: { metadata: orderMetadata } } : {}),
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
    });

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      status: 200,
      headers,
    });
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
}
