/**
 * Tests for the H5 API client — focusing on the parts that bridge the
 * dual response-shape convention (legacy `code: 0` vs new `code: '200'`)
 * and the single-flight token-refresh queue.
 *
 * Why this exists: before this test file landed, the activation funnel
 * silently relied on `PublicSimController::preview` happening to return
 * the legacy `code: 0` shape. The first auth-required `/v1/app/*` call
 * (bind-sim, refresh, auto-renew toggle…) would have thrown ApiError on
 * a successful response because the client only accepted `code === 0`.
 * These tests prevent that regression.
 *
 * @see services/api/client.ts
 * @see docs/H5_API_SPEC.md
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Install a localStorage shim BEFORE the client module loads. `vi.hoisted`
// runs before any imports, which is essential because `client.ts` is
// imported below and (transitively) registers a default error interceptor
// that may touch localStorage on first invocation. Vitest's default `node`
// env does not provide localStorage, and we avoid a hard jsdom/happy-dom
// dependency since the rest of the API client doesn't need a DOM.
vi.hoisted(() => {
  const store = new Map<string, string>();
  const shim = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
  // Force-replace any existing partial shim from vitest's node env.
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: shim,
  });
});

import {
  ApiError,
  clearTokens,
  get,
  isSuccessApiCode,
  post,
  setAccessToken,
  setBaseUrl,
  setRefreshToken,
  getAccessToken,
  getRefreshToken,
} from './client';

const BASE = 'http://test.local/api/v1';

beforeEach(() => {
  setBaseUrl(BASE);
  clearTokens();
});

afterEach(() => {
  vi.restoreAllMocks();
  clearTokens();
});

// ─── isSuccessApiCode ────────────────────────────────────────────────────

describe('isSuccessApiCode', () => {
  test('accepts legacy /h5 numeric 0', () => {
    expect(isSuccessApiCode(0)).toBe(true);
    expect(isSuccessApiCode('0')).toBe(true);
  });

  test("accepts /v1/app string '200' and '201'", () => {
    expect(isSuccessApiCode('200')).toBe(true);
    expect(isSuccessApiCode('201')).toBe(true);
  });

  test('rejects every error code we have observed in production', () => {
    expect(isSuccessApiCode(1001)).toBe(false);
    expect(isSuccessApiCode(1021)).toBe(false);
    expect(isSuccessApiCode('AUTH_001')).toBe(false);
    expect(isSuccessApiCode('BUSINESS_001')).toBe(false);
    expect(isSuccessApiCode('NOT_FOUND_001')).toBe(false);
    expect(isSuccessApiCode('VALIDATION_001')).toBe(false);
    expect(isSuccessApiCode(null)).toBe(false);
    expect(isSuccessApiCode(undefined)).toBe(false);
    expect(isSuccessApiCode(false)).toBe(false);
    expect(isSuccessApiCode(200)).toBe(false); // numeric 200 is NOT the contract
  });
});

// ─── request() success-shape acceptance ──────────────────────────────────

describe('request() accepts both success-code conventions', () => {
  test("legacy /h5 endpoint returning {code: 0}", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ code: 0, msg: 'ok', data: { foo: 'bar' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const data = await get<{ foo: string }>('/h5/anything', undefined, {
      skipAuth: true,
    });
    expect(data).toEqual({ foo: 'bar' });
  });

  test("/v1/app endpoint returning {code: '200'}", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ code: '200', msg: 'ok', data: { id: 42 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const data = await get<{ id: number }>('/app/users/me', undefined, {
      skipAuth: true,
    });
    expect(data).toEqual({ id: 42 });
  });

  test("/v1/app create-style endpoint returning {code: '201'}", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '201',
            msg: 'created',
            data: { id: 7, app_user_id: 1 },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const data = await post<{ id: number; appUserId: number }>(
      '/app/users/bind-sim',
      { simId: 1 },
      { skipAuth: true },
    );
    expect(data).toEqual({ id: 7, appUserId: 1 });
  });

  test("/v1/app error response throws typed ApiError with string code", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'BUSINESS_001',
            msg: 'SIM already bound',
            data: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      post('/app/users/bind-sim', { simId: 1 }, { skipAuth: true }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      code: 'BUSINESS_001',
      message: 'SIM already bound',
    });
  });
});

// ─── 401 → refresh → retry, single-flight queue ─────────────────────────

describe('401 token refresh is single-flight', () => {
  test('retries the original request after a successful refresh', async () => {
    setAccessToken('expired');
    setRefreshToken('rt-1');

    let originalCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/app/auth/refresh')) {
        return new Response(
          JSON.stringify({
            code: '200',
            msg: 'ok',
            data: { token: 'new-access', refresh_token: 'rt-2' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/app/users/me')) {
        originalCalls += 1;
        if (originalCalls === 1) {
          return new Response(
            JSON.stringify({ code: 'AUTH_001', msg: 'expired', data: null }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ code: '200', msg: 'ok', data: { id: 42 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await get<{ id: number }>('/app/users/me');

    expect(result).toEqual({ id: 42 });
    expect(originalCalls).toBe(2); // first 401, then retry succeeds
    expect(getAccessToken()).toBe('new-access');
    expect(getRefreshToken()).toBe('rt-2');
  });

  test('parallel 401s coalesce into one refresh call', async () => {
    setAccessToken('expired');
    setRefreshToken('rt-1');

    let refreshCalls = 0;
    let meRetries = 0;
    let simsRetries = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/app/auth/refresh')) {
        refreshCalls += 1;
        // Tiny delay so concurrent callers all queue behind the same
        // refreshPromise instead of sequencing through it.
        await new Promise((r) => setTimeout(r, 5));
        return new Response(
          JSON.stringify({
            code: '200',
            msg: 'ok',
            data: { token: 'new-access', refresh_token: 'rt-2' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/app/users/me')) {
        meRetries += 1;
        if (meRetries === 1) {
          return new Response(
            JSON.stringify({ code: 'AUTH_001', msg: 'expired', data: null }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ code: '200', msg: 'ok', data: { id: 1 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/app/sims')) {
        simsRetries += 1;
        if (simsRetries === 1) {
          return new Response(
            JSON.stringify({ code: 'AUTH_001', msg: 'expired', data: null }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ code: '200', msg: 'ok', data: { list: [] } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const [me, sims] = await Promise.all([
      get<{ id: number }>('/app/users/me'),
      get<{ list: unknown[] }>('/app/sims'),
    ]);

    expect(me).toEqual({ id: 1 });
    expect(sims).toEqual({ list: [] });
    expect(refreshCalls).toBe(1); // ⭐ critical: only ONE refresh
  });

  test('refresh failure clears tokens and surfaces the error', async () => {
    setAccessToken('expired');
    setRefreshToken('rt-bad');

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/app/auth/refresh')) {
        return new Response(
          JSON.stringify({
            code: 'AUTH_001',
            msg: 'invalid refresh token',
            data: null,
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ code: 'AUTH_001', msg: 'expired', data: null }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(get('/app/users/me')).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  test('refresh hits /v1/app/auth/refresh, not the legacy /h5 endpoint', async () => {
    setAccessToken('expired');
    setRefreshToken('rt-1');

    const seenUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      seenUrls.push(url);
      if (url.endsWith('/app/auth/refresh')) {
        return new Response(
          JSON.stringify({
            code: '200',
            msg: 'ok',
            data: { token: 'new', refresh_token: 'rt-2' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      // First /me call returns 401, second succeeds.
      const seenMeCount = seenUrls.filter((u) =>
        u.endsWith('/app/users/me'),
      ).length;
      if (seenMeCount === 1) {
        return new Response(
          JSON.stringify({ code: 'AUTH_001', msg: 'expired', data: null }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ code: '200', msg: 'ok', data: { id: 99 } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await get('/app/users/me');

    expect(seenUrls).toContain(`${BASE}/app/auth/refresh`);
    expect(seenUrls.find((u) => u.endsWith('/h5/auth/refresh'))).toBeUndefined();
  });
});
