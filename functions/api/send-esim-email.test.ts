import { afterEach, describe, expect, test, vi } from 'vitest';
import { onRequest } from './send-esim-email';
import netlifySend from '../../netlify/functions/send-esim-email.mjs';

const PHISH = {
  email: 'victim@example.com',
  packageName: 'Your account will close — call this number',
  qrCodeUrl: 'https://evil.example/qr.png',
  activationCode: 'FAKE-CODE',
  lpaString: 'LPA:1$evil.example$FAKE-CODE',
  smdpAddress: 'evil.example',
  orderNo: 'ORD-1',
  iccid: '8900000000000000001',
};

function post(url: string, origin?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (origin) headers.Origin = origin;
  return new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(PHISH),
  });
}

describe('public eSIM email relay is closed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('Cloudflare function does not call Resend for a no-Origin POST', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await onRequest({
      request: post('https://evairdigital.com/api/send-esim-email'),
      env: { RESEND_API_KEY: 're_live_secret', RESEND_FROM: 'EvairSIM <noreply@evairdigital.com>' },
    });

    expect(res.status).toBe(410);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.error).toMatch(/closed/i);
  });

  test('Cloudflare function still refuses an allowlisted browser origin', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await onRequest({
      request: post('https://evairdigital.com/api/send-esim-email', 'https://evairdigital.com'),
      env: { RESEND_API_KEY: 're_live_secret' },
    });

    expect(res.status).toBe(410);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('Netlify function does not call Resend for a no-Origin POST', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', 're_live_secret');
    vi.stubEnv('RESEND_FROM', 'EvairSIM <noreply@evairdigital.com>');

    const res = await netlifySend(post('https://evairdigital.com/.netlify/functions/send-esim-email'));

    expect(res.status).toBe(410);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
