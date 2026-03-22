import Stripe from 'stripe';

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

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

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: corsHeaders(),
    });
  }

  try {
    const { packageName, priceUsd, email, packageCode, transactionId } = await req.json();

    if (!packageName || !priceUsd || !packageCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: packageName, priceUsd, packageCode' }),
        { status: 400, headers: corsHeaders() }
      );
    }

    const stripe = new Stripe(secretKey);

    const origin = req.headers.get('origin') || 'https://evair-h5.netlify.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: packageName,
              description: 'eSIM Data Plan — Instant Digital Delivery',
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
      },
      success_url: `${origin}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?stripe_status=cancelled`,
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: corsHeaders() }
    );
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session', detail: err.message }),
      { status: 500, headers: corsHeaders() }
    );
  }
};
