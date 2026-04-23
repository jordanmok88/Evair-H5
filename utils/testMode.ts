/** sessionStorage: user dismissed dev auto test mode until refresh or ?testmode=1 */
export const DEV_TEST_MODE_OFF_KEY = 'evair_dev_testmode_off';

export function urlHasTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('testmode') === '1';
}

/**
 * Detect whether the page is currently loaded inside the EvairSIM native
 * app shell (iOS/Android WebView). The native bridge injects
 * `window.evair.isNative = true` at document-start — see
 * Evair-H5 /../EvairSIM-App/docs/native-bridge-api.md and
 * EvairSIM-App/lib/core/bridge/native_bridge.dart.
 */
function runningInsideNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const evair = (window as unknown as { evair?: { isNative?: boolean } }).evair;
    return evair?.isNative === true;
  } catch {
    return false;
  }
}

export function computeTestModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  // Never show the dev test-mode banner inside the native app shell: the
  // real end-users on iOS / Android should never see "Local preview" even
  // if we're pointing the app at a dev H5 URL. The banner exists purely
  // for desktop browser dev work.
  if (runningInsideNativeApp()) return false;
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
