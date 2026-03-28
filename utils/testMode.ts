/** sessionStorage: user dismissed dev auto test mode until refresh or ?testmode=1 */
export const DEV_TEST_MODE_OFF_KEY = 'evair_dev_testmode_off';

export function urlHasTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('testmode') === '1';
}

export function computeTestModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (urlHasTestMode()) {
    try {
      sessionStorage.removeItem(DEV_TEST_MODE_OFF_KEY);
    } catch {
      /* ignore */
    }
    return true;
  }
  if (import.meta.env.DEV) {
    try {
      return sessionStorage.getItem(DEV_TEST_MODE_OFF_KEY) !== '1';
    } catch {
      return true;
    }
  }
  return false;
}

export function dismissTestModeForSession(): void {
  if (import.meta.env.DEV) {
    try {
      sessionStorage.setItem(DEV_TEST_MODE_OFF_KEY, '1');
    } catch {
      /* ignore */
    }
  }
}

export function stripTestModeFromUrl(): void {
  const path = window.location.pathname;
  const qs = new URLSearchParams(window.location.search);
  qs.delete('testmode');
  const q = qs.toString();
  window.history.replaceState({}, '', q ? `${path}?${q}` : path);
}
