import Stripe from 'stripe';
import type { CfEnv } from '../../lib/cloudflare/env';
import { resolveCors, jsonHeaders } from '../../lib/cloudflare/cors';
import { rateLimitExceeded, stripeVerifyLimits } from '../../lib/cloudflare/rateLimit';

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

  if (rateLimitExceeded(req, stripeVerifyLimits(env))) {
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
    const { sessionId } = (await req.json()) as { sessionId?: string };

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers,
      });
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return new Response(
      JSON.stringify({
        paid: session.payment_status === 'paid',
        status: session.payment_status,
        customerEmail: session.customer_details?.email || session.customer_email,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error('Stripe verify error:', err);
    return new Response(
      JSON.stringify({
        error: 'Failed to verify payment',
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers },
    );
  }
}
