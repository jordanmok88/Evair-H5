/**
 * Push notification glue layer for the H5 ↔ native WebView shell.
 *
 * The native app exposes a bridge at `window.evair.*` (see
 * EvairSIM-App/docs/native-bridge-api.md) with:
 *
 *   - `registerForPush()`  → Promise<{ ok, token? }>
 *   - `onPushTokenReady`   ← callback we can install
 *   - `onPushReceived`     ← callback we can install
 *   - `onPushOpened`       ← callback we can install
 *
 * This module wraps all of that into two public entry points:
 *
 *   - `initPush(options)`   — call once per session, after the user logs
 *                             in. Handles OS permission prompt, fetches
 *                             a token, and POSTs it to Laravel.
 *   - `unregisterPush()`    — call on logout so the token is detached
 *                             from the user on the backend.
 *
 * Runs ONLY inside the native app (`window.evair.isNative === true`).
 * In a regular browser it's a no-op — we could add Web Push later but
 * it's a much narrower use-case (has to be installed as a PWA first).
 */

import { post, del } from './api/client';

/* ──────────────────────────────────────────────────────────────────────── */

type PushRegisterResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'denied' | 'unsupported' | 'not_in_app' };

interface EvairBridge {
  isNative?: boolean;
  registerForPush?: () => Promise<PushRegisterResult>;
  onPushTokenReady?: (payload: { token: string }) => void;
  onPushReceived?: (payload: Record<string, unknown>) => void;
  onPushOpened?: (payload: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    evair?: EvairBridge;
  }
}

function getBridge(): EvairBridge | null {
  if (typeof window === 'undefined') return null;
  const evair = window.evair;
  if (!evair?.isNative) return null;
  return evair;
}

/* ──────────────────────────────────────────────────────────────────────── */

type ReceivedHandler = (data: Record<string, unknown>) => void;

/** Set of handlers registered by the app (typically one per concern:
 *  data-usage banner, order list refresh, etc.). Kept in a Set so the
 *  same function isn't invoked twice if accidentally registered twice. */
const receivedHandlers = new Set<ReceivedHandler>();
const openedHandlers = new Set<ReceivedHandler>();

/**
 * Subscribe to inbound foreground pushes. The callback fires every time
 * the native shell delivers a `window.evair.onPushReceived` event.
 * Returns an unsubscribe function.
 */
export function onPushReceived(handler: ReceivedHandler): () => void {
  receivedHandlers.add(handler);
  return () => receivedHandlers.delete(handler);
}

/**
 * Subscribe to "user tapped a notification" events. Fires when the native
 * shell delivers `onPushOpened` (either from a foreground banner tap or
 * a background notification tap that resumed the app).
 */
export function onPushOpened(handler: ReceivedHandler): () => void {
  openedHandlers.add(handler);
  return () => openedHandlers.delete(handler);
}

let bridgeInstalled = false;
function installBridgeListeners(): void {
  if (bridgeInstalled) return;
  const bridge = getBridge();
  if (!bridge) return;

  bridge.onPushReceived = (data) => {
    for (const h of receivedHandlers) {
      try {
        h(data);
      } catch (err) {
        console.warn('[push] onPushReceived handler threw', err);
      }
    }
  };
  bridge.onPushOpened = (data) => {
    for (const h of openedHandlers) {
      try {
        h(data);
      } catch (err) {
        console.warn('[push] onPushOpened handler threw', err);
      }
    }
  };
  // `onPushTokenReady` is handled inline by initPush below.
  bridgeInstalled = true;
}

/* ──────────────────────────────────────────────────────────────────────── */

export interface InitPushOptions {
  /** Optional ISO locale (e.g. 'en', 'zh-CN'). Forwarded to the backend
   *  so marketing campaigns can be segmented by language. */
  locale?: string;
  /** Client-side app version (for debugging). Defaults to reading
   *  `APP_VERSION` from Vite env if present. */
  appVersion?: string;
}

/**
 * Ask the native shell for a push token, then POST it to Laravel.
 *
 * Call this ONCE after a successful login (or after reading a persisted
 * auth token on app startup). Safe to call multiple times — the backend
 * `/push/register` endpoint is idempotent: re-registering the same
 * token for the same user is a no-op (just touches last_seen_at).
 *
 * Returns the token on success, or `null` in every other case:
 *   - not inside the native app shell
 *   - user denied OS permission
 *   - native bridge doesn't support push yet (older APP build)
 */
export async function initPush(options: InitPushOptions = {}): Promise<string | null> {
  const bridge = getBridge();
  if (!bridge) return null;

  installBridgeListeners();

  // Older APP builds might not have `registerForPush` yet — guard
  // explicitly so we don't blow up.
  if (typeof bridge.registerForPush !== 'function') {
    console.warn('[push] native shell does not expose registerForPush; skipping');
    return null;
  }

  let result: PushRegisterResult;
  try {
    result = await bridge.registerForPush();
  } catch (err) {
    console.warn('[push] registerForPush threw', err);
    return null;
  }

  if (!result.ok) {
    console.info('[push] not registered:', result.reason);
    return null;
  }

  const platform = detectPlatform();
  try {
    await post('/h5/push/register', {
      token: result.token,
      platform,
      locale: options.locale ?? detectLocale(),
      appVersion: options.appVersion ?? detectAppVersion(),
    });
  } catch (err) {
    console.warn('[push] backend registration failed (will retry on next login)', err);
    // Not fatal — the token is still cached by the OS and we can retry
    // next time. Surface to Sentry if we ever wire it up.
    return null;
  }

  return result.token;
}

/**
 * Detach the current device token from this user on the backend.
 * Call on explicit logout so pushes stop being delivered for this
 * user on this device.
 *
 * We deliberately do NOT revoke the OS-level permission or reset the
 * native token cache — the user may re-login as another account
 * immediately, and we want to reuse the same token row instead of
 * round-tripping through APNs again.
 */
export async function unregisterPush(token?: string): Promise<void> {
  const bridge = getBridge();
  if (!bridge || !token) return;
  try {
    await del('/h5/push/register', { body: JSON.stringify({ token }) });
  } catch (err) {
    console.warn('[push] backend unregister failed (non-fatal)', err);
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
// Helpers.

function detectPlatform(): 'ios' | 'android' | 'web' {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
}

function detectLocale(): string | undefined {
  try {
    return localStorage.getItem('evair-lang') || navigator.language || undefined;
  } catch {
    return undefined;
  }
}

function detectAppVersion(): string | undefined {
  // Populated by Vite if `import.meta.env.VITE_APP_VERSION` is set in
  // .env. Falls back to the package.json version injected via
  // vite-plugin-html or similar — leave undefined if not wired.
  try {
    return (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_APP_VERSION;
  } catch {
    return undefined;
  }
}

/* ──────────────────────────────────────────────────────────────────────── */

export interface PushPreferences {
  transactionalEnabled: boolean;
  marketingEnabled: boolean;
}

/**
 * Fetch the current per-category opt-in state for the logged-in user.
 * Used by the Settings screen to render the "Receive marketing
 * notifications" toggle.
 */
export async function getPreferences(): Promise<PushPreferences> {
  const data = await (await import('./api/client')).get<{
    transactionalEnabled: boolean;
    marketingEnabled: boolean;
  }>('/h5/push/preferences');
  return {
    transactionalEnabled: data.transactionalEnabled,
    marketingEnabled: data.marketingEnabled,
  };
}

/**
 * Toggle the marketing opt-in (or both categories at once if the caller
 * passes both). Transactional usually shouldn't be touchable from H5
 * — it's part of the service the user paid for — but the API accepts
 * it anyway for parity with Laravel.
 */
export async function updatePreferences(
  prefs: Partial<PushPreferences>,
): Promise<PushPreferences> {
  const { request } = await import('./api/client');
  const body: Record<string, unknown> = {};
  if (typeof prefs.marketingEnabled === 'boolean') {
    body.marketing_enabled = prefs.marketingEnabled;
  }
  if (typeof prefs.transactionalEnabled === 'boolean') {
    body.transactional_enabled = prefs.transactionalEnabled;
  }
  const data = await request<{
    transactionalEnabled: boolean;
    marketingEnabled: boolean;
  }>('/h5/push/preferences', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return {
    transactionalEnabled: data.transactionalEnabled,
    marketingEnabled: data.marketingEnabled,
  };
}
