import { describe, expect, it, vi } from 'vitest';
import stripeCheckout from '../netlify/functions/stripe-checkout.mjs';
import netlifyEsimProxy from '../netlify/functions/esim.mjs';
import { onRequest as cloudflareEsimProxy } from './api/esim';

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('legacy checkout/proxy hardening', () => {
  it('rejects legacy Netlify checkout requests that send browser-controlled prices', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await stripeCheckout(jsonRequest('https://evairdigital.com/api/stripe-checkout', {
      packageName: 'Japan 1GB',
      packageCode: 'JP_1GB_7D',
      priceUsd: 0.01,
    }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Missing required field: orderNo',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('requires auth before Netlify checkout proxies an authoritative Laravel order', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await stripeCheckout(jsonRequest('https://evairdigital.com/api/stripe-checkout', {
      orderNo: 'EV202605230001',
      successUrl: 'https://evairdigital.com/travel-esim/jp?stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://evairdigital.com/travel-esim/jp?stripe_status=cancelled',
    }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Authorization required',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('forwards Netlify checkout requests to Laravel with server-side pricing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        url: 'https://checkout.stripe.test/session',
        sessionId: 'cs_test_123',
        orderNo: 'EV202605230001',
        amount: 1299,
        currency: 'USD',
      }), { status: 200 }),
    );

    const res = await stripeCheckout(jsonRequest(
      'https://evairdigital.com/api/stripe-checkout',
      {
        orderNo: 'EV202605230001',
        successUrl: 'https://evairdigital.com/travel-esim/jp?stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://evil.example/cancel',
        priceUsd: 0.01,
      },
      { Authorization: 'Bearer app-token' },
    ));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://evair.zhhwxt.cn/api/v1/app/payments/checkout');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer app-token' });
    expect(JSON.parse(String(init?.body))).toEqual({
      order_no: 'EV202605230001',
      success_url: 'https://evairdigital.com/travel-esim/jp?stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://evairdigital.com/?stripe_status=cancelled',
    });
    fetchMock.mockRestore();
  });

  it('blocks anonymous supplier provisioning through the Netlify eSIM proxy', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await netlifyEsimProxy(jsonRequest('https://evairdigital.com/api/esim', {
      endpoint: '/esim/order',
      payload: { packageInfoList: [{ packageCode: 'JP_1GB_7D', count: 1 }] },
    }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Supplier write endpoint disabled',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('blocks anonymous supplier top-up through the Cloudflare eSIM proxy', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await cloudflareEsimProxy({
      request: jsonRequest('https://evairdigital.com/api/esim', {
        endpoint: '/esim/topup',
        payload: { iccid: '8985200000000000000', packageCode: 'TOPUP_1GB' },
      }),
      env: {},
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Supplier write endpoint disabled',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
