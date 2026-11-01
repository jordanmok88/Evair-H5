import { afterEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
  });
});

import {
  ESIM_CHECKOUT_SUCCESS_CACHE_KEY,
  checkoutCountriesMatch,
  clearEsimCheckoutSuccessCache,
  readCheckoutNavigationKind,
  shouldDiscardCheckoutSuccess,
  shouldRestoreCheckoutSuccess,
} from './esimCheckoutSuccessCache';

describe('esim checkout success cache', () => {
  afterEach(() => {
    clearEsimCheckoutSuccessCache();
  });

  test('treats a normal link click as a reason to drop install secrets', () => {
    expect(shouldDiscardCheckoutSuccess('navigate', null)).toBe(true);
    expect(shouldDiscardCheckoutSuccess('navigate', 'cancelled')).toBe(true);
    expect(shouldDiscardCheckoutSuccess('unknown', null)).toBe(true);
  });

  test('keeps the cache on the Stripe return so the new order can replace it', () => {
    expect(shouldDiscardCheckoutSuccess('navigate', 'success')).toBe(false);
  });

  test('does not drop the cache on refresh or back', () => {
    expect(shouldDiscardCheckoutSuccess('reload', null)).toBe(false);
    expect(shouldDiscardCheckoutSuccess('back_forward', null)).toBe(false);
  });

  test('restores the QR only for a refresh of the same country', () => {
    expect(shouldRestoreCheckoutSuccess('reload', null, 'jp', 'jp')).toBe(true);
    expect(shouldRestoreCheckoutSuccess('reload', null, 'JP', 'jp')).toBe(true);
    expect(shouldRestoreCheckoutSuccess('back_forward', null, 'jp', 'jp')).toBe(true);
  });

  test('does not restore across countries, link clicks, or a new Stripe return', () => {
    expect(shouldRestoreCheckoutSuccess('reload', null, 'jp', 'fr')).toBe(false);
    expect(shouldRestoreCheckoutSuccess('reload', null, 'jp', null)).toBe(false);
    expect(shouldRestoreCheckoutSuccess('reload', null, undefined, 'jp')).toBe(false);
    expect(shouldRestoreCheckoutSuccess('navigate', null, 'jp', 'jp')).toBe(false);
    expect(shouldRestoreCheckoutSuccess('reload', 'success', 'jp', 'jp')).toBe(false);
  });

  test('country match ignores case and blank values', () => {
    expect(checkoutCountriesMatch(' Jp ', 'jp')).toBe(true);
    expect(checkoutCountriesMatch('', 'jp')).toBe(false);
    expect(checkoutCountriesMatch('jp', null)).toBe(false);
  });

  test('reads the navigation timing type', () => {
    expect(readCheckoutNavigationKind({ type: 'reload' })).toBe('reload');
    expect(readCheckoutNavigationKind({ type: 'other' })).toBe('unknown');
    expect(readCheckoutNavigationKind(null)).toBe('unknown');
  });

  test('clear removes the session snapshot', () => {
    sessionStorage.setItem(ESIM_CHECKOUT_SUCCESS_CACHE_KEY, '{"result":{"activationCode":"SECRET"}}');
    clearEsimCheckoutSuccessCache();
    expect(sessionStorage.getItem(ESIM_CHECKOUT_SUCCESS_CACHE_KEY)).toBeNull();
  });
});
