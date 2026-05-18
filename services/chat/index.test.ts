import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
});

import { clearTokens, setAccessToken } from '../api/client';
import {
  acquireSharedChatProvider,
  releaseSharedChatProvider,
  resetSharedChatProvider,
} from './index';

describe('shared chat provider', () => {
  beforeEach(() => {
    clearTokens();
    localStorage.clear();
    resetSharedChatProvider();
  });

  afterEach(() => {
    clearTokens();
    localStorage.clear();
    resetSharedChatProvider();
  });

  test('reset lets auto mode re-resolve from logged-out local to logged-in Laravel', () => {
    const loggedOutProvider = acquireSharedChatProvider();
    expect(loggedOutProvider.name).toBe('local');
    releaseSharedChatProvider();

    setAccessToken('access-token');
    resetSharedChatProvider();

    const loggedInProvider = acquireSharedChatProvider();
    expect(loggedInProvider.name).toBe('laravel');
    releaseSharedChatProvider();
  });
});
