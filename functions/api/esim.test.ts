import { describe, expect, it } from 'vitest';
import { onRequest } from './esim';

function postEndpoint(endpoint: string): Request {
  return new Request('https://evairdigital.com/api/esim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evairdigital.com',
    },
    body: JSON.stringify({ endpoint, payload: {} }),
  });
}

describe('/api/esim supplier proxy', () => {
  it.each(['/esim/order', '/esim/topup'])('blocks supplier write endpoint %s', async (endpoint) => {
    const res = await onRequest({ request: postEndpoint(endpoint), env: {} });
    const body = (await res.json()) as { error?: string; detail?: string };

    expect(res.status).toBe(403);
    expect(body.error).toBe('Supplier write endpoint disabled');
    expect(body.detail).toContain('Laravel checkout');
  });
});
