import { afterEach, describe, expect, test, vi } from 'vitest';
import handler from './stripe-checkout.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

function request(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('https://evairdigital.com/api/stripe-checkout', {
    method: 'POST',
    headers: {
      Origin: 'https://evairdigital.com',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('netlify stripe-checkout proxy', () => {
  test('rejects legacy browser-priced checkout payloads', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await handler(
      request({
        packageName: 'Japan 3GB',
        packageCode: 'JP_3GB_7D',
        priceUsd: 0.5,
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: 'Missing required field: orderNo',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('proxies only the Laravel order number and safe return URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: '200', data: { url: 'https://checkout.stripe.test/session' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await handler(
      request(
        {
          orderNo: 'EV-1001',
          priceUsd: 0.5,
          packageCode: 'JP_3GB_7D',
          successUrl: 'https://evairdigital.com/travel-esim/japan?stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: 'https://evil.example/cancel',
        },
        { Authorization: 'Bearer token-1' },
      ),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://evair.zhhwxt.cn/api/v1/app/payments/checkout');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-1' });
    expect(JSON.parse(String(init.body))).toEqual({
      order_no: 'EV-1001',
      success_url:
        'https://evairdigital.com/travel-esim/japan?stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://evairdigital.com/?stripe_status=cancelled',
    });
  });
});
