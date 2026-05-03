/**
 * Mirrors `authService.isLoggedIn()` plus same-tab refresh when tokens change:
 * `@see dispatchAuthChanged()` in services/api/client.ts
 */
import { useSyncExternalStore } from 'react';
import { authService } from '@/services/api';

function read(): boolean {
  return authService.isLoggedIn();
}

function subscribe(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onEvairAuth = () => listener();

  /** Cross-tab logout / login only (same-tab relies on evair-auth-changed). */
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === 'evair_access_token' ||
      e.key === 'evair_refresh_token' ||
      e.key === null /* clear */
    )
      listener();
  };

  const onFocus = () => listener();

  window.addEventListener('evair-auth-changed', onEvairAuth);
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', onFocus);

  return () => {
    window.removeEventListener('evair-auth-changed', onEvairAuth);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', onFocus);
  };
}

/** True while `evair_access_token` is stored (marketing header + gated CTAs only). */
export function useAuthSessionPresent(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}
