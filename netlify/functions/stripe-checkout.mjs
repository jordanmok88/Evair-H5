import Stripe from 'stripe';
import { resolveCors, jsonHeaders } from './cors.mjs';
import { rateLimitExceeded, stripeCheckoutLimits } from './rate-limit.mjs';

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

  const secretKey = process.env.STRIPE_SECRET_KEY;
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
      // Optional caller-supplied return URLs. The mobile shop in
      // ShopView.tsx never sends these and falls back to the apex
      // origin (where ShopView mounts and consumes the redirect).
      // The desktop /travel-esim/{country} page DOES send these so
      // Stripe redirects back to the same desktop URL the customer
      // started on, where useEsimCheckoutFlow handles fulfilment.
      successUrl,
      cancelUrl,
      // Order linkage — populated by callers that pre-create a Laravel
      // Order via POST /h5/orders/esim before opening Stripe Checkout.
      // Required so the checkout.session.completed webhook can find the
      // order and trigger OrderProvisioningService. See docs:
      //   StripePaymentService::handleCheckoutSessionCompleted
      //   OrderPaymentService::handlePaymentSuccess
      // Optional for now to keep older callers (no pre-created order)
      // alive while we migrate, but those callers WILL fall through to
      // the legacy "create order after payment" path with no backend
      // record — see ShopView.tsx for the deprecation path.
      orderId,
      orderNo,
      userId,
    } = await req.json();

    if (!packageName || !priceUsd || !packageCode) {
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

    // Defence in depth: only accept caller-supplied return URLs that
    // start with our own origin. Stripe will refuse anything that
    // doesn't include a literal `{CHECKOUT_SESSION_ID}` placeholder
    // for `success_url`, but we still avoid being a redirect oracle.
    const isSafeReturn = (url) =>
      typeof url === 'string' && url.length < 2048 && url.startsWith(callerOrigin);

    const safeSuccessUrl = isSafeReturn(successUrl)
      ? successUrl
      : `${callerOrigin}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`;
    const safeCancelUrl = isSafeReturn(cancelUrl)
      ? cancelUrl
      : `${callerOrigin}/?stripe_status=cancelled`;

    const flagUrl = countryCode
      ? `https://wsrv.nl/?url=flagcdn.com/w320/${countryCode.toLowerCase()}.png&w=324&h=217&fit=contain&we&cbg=d0d3d8`
      : undefined;

    // Stripe metadata caps every value at 500 chars and only accepts
    // strings. Coerce defensively so a numeric `orderId` from the
    // backend doesn't blow up the API call.
    const orderMetadata = orderId
      ? {
          order_type: 'order',
          order_id: String(orderId),
          ...(orderNo ? { order_number: String(orderNo) } : {}),
          ...(userId ? { user_id: String(userId) } : {}),
          channel: 'h5',
        }
      : null;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email || undefined,
      allow_promotion_codes: true,
      adaptive_pricing: { enabled: false },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: packageName,
              description: 'eSIM Data Plan — Instant Digital Delivery',
              ...(flagUrl ? { images: [flagUrl] } : {}),
            },
            unit_amount: Math.round(priceUsd * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        packageCode,
        transactionId,
        packageName,
        // Mirror order linkage at session level too — useful for
        // expiry/cancel webhooks (handleCheckoutSessionExpired reads
        // session.metadata.order_id directly without an intent fetch).
        ...(orderMetadata ?? {}),
      },
      // CRITICAL: the Laravel checkout.session.completed handler reads
      // metadata off the underlying PaymentIntent (not the Session),
      // because that's what carries through the rest of the Stripe
      // payment lifecycle. Setting payment_intent_data.metadata is what
      // wires the order to the webhook. Without this the webhook gets
      // the event but can't match an Order and provisioning never runs.
      ...(orderMetadata ? { payment_intent_data: { metadata: orderMetadata } } : {}),
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session', detail: err.message }),
      { status: 500, headers },
    );
  }
};
