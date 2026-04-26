/**
 * Laravel Reverb / Pusher client wrapper for H5.
 *
 * We use Laravel Echo + pusher-js to subscribe to the `private-conversation.{id}`
 * channel that Laravel broadcasts `MessageSent` events on. The wrapper:
 *
 *   1. Lazy-initialises Echo on first call so the chat module's WS deps
 *      don't bloat the rest of the app's bundle (saves ~80kb gzipped).
 *   2. Reads VITE_REVERB_* env vars and gracefully fails (returns null)
 *      when config is missing — useful for staging / Netlify deploy
 *      previews where the WS server isn't wired up yet. Callers should
 *      treat null as "WS unavailable, fall back to REST polling".
 *   3. Carries the user's bearer token in the auth headers for the
 *      `/broadcasting/auth` request that gates private channels (see
 *      Laravel `routes/channels.php`).
 *
 * Channel naming (from CROSS_PLATFORM_CONTRACT §5.4):
 *   - `private-conversation.{id}` — server-side defines this in
 *     `routes/channels.php`. Our Echo prepends `private-` automatically
 *     when `.private(...)` is used, so callers pass `conversation.{id}`.
 *
 * Event names (also from CROSS_PLATFORM_CONTRACT §5.4):
 *   - `.message.sent` — leading dot tells Echo not to namespace the
 *     event with `App\\Events\\Chat\\` (matches Laravel's
 *     `broadcastAs()` override).
 */

import { getAccessToken, getBaseUrl } from '../api/client';

// Module-level cached Echo instance. Reused across LiveChatView mounts so
// we don't churn the WS connection when the user navigates away and back.
let echoInstance: any | null = null;
let echoLoadFailed = false;

interface EchoConfig {
  appKey: string;
  host: string;
  port: number;
  scheme: 'https' | 'http';
}

function readConfig(): EchoConfig | null {
  const env = (import.meta as any).env ?? {};
  const appKey = env.VITE_REVERB_APP_KEY;
  const host = env.VITE_REVERB_HOST;
  if (!appKey || !host) return null;

  const portRaw = env.VITE_REVERB_PORT;
  const port = portRaw ? parseInt(String(portRaw), 10) : 443;
  if (Number.isNaN(port)) return null;

  const scheme = (env.VITE_REVERB_SCHEME === 'http' ? 'http' : 'https') as 'http' | 'https';

  return { appKey, host, port, scheme };
}

/**
 * Get (and lazily create) the Echo singleton. Returns null if config is
 * missing or initialisation throws — caller MUST handle null and fall
 * back to REST polling.
 */
export async function getEcho(): Promise<any | null> {
  if (echoInstance) return echoInstance;
  if (echoLoadFailed) return null;

  const config = readConfig();
  if (!config) return null;

  try {
    // Dynamic imports keep the WS deps out of the main bundle.
    const [{ default: Echo }, Pusher] = await Promise.all([
      import('laravel-echo'),
      import('pusher-js').then(m => m.default),
    ]);

    // Pusher.js needs to be available globally for laravel-echo's
    // `pusher` broadcaster — it does `new (window as any).Pusher(...)`.
    (globalThis as any).Pusher = Pusher;

    const apiBase = getBaseUrl();
    // The /broadcasting/auth endpoint is mounted at the application root
    // (NOT under /api/v1), so strip the /api/v1 suffix from the API base.
    const authEndpoint = apiBase.replace(/\/api\/v\d+\/?$/i, '') + '/broadcasting/auth';

    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: config.appKey,
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      forceTLS: config.scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint,
      // Per-request auth header — refreshed every time pusher-js calls
      // back into us, so we always send the *current* access token even
      // after a token refresh from the API client interceptor.
      auth: {
        headers: {} as Record<string, string>,
      },
      authorizer: (channel: any) => ({
        authorize: (socketId: string, callback: (err: any, data?: any) => void) => {
          const token = getAccessToken();
          fetch(authEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          })
            .then(async response => {
              if (!response.ok) {
                throw new Error(`Echo auth HTTP ${response.status}`);
              }
              const data = await response.json();
              callback(null, data);
            })
            .catch(error => {
              console.warn('[realtime/echo] /broadcasting/auth failed', error);
              callback(error);
            });
        },
      }),
    });

    return echoInstance;
  } catch (err) {
    console.warn('[realtime/echo] init failed, falling back to polling', err);
    echoLoadFailed = true;
    echoInstance = null;
    return null;
  }
}

/**
 * Tear down the Echo connection — useful on logout, where the auth
 * cookie / token changes and any open WS subscriptions become stale.
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch {
      /* swallow — disconnecting an already-dead socket isn't fatal */
    }
    echoInstance = null;
  }
}

/**
 * Convenience flag so callers can decide whether to even attempt a WS
 * subscription before doing the dynamic import dance.
 */
export function isRealtimeConfigured(): boolean {
  return readConfig() !== null;
}
