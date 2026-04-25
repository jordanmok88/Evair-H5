/**
 * Top-level route detection for the H5 app.
 *
 * The app does not yet use a real router (React Router etc.) — it's a single
 * SPA whose top-level component is chosen at boot from the URL. This helper
 * keeps that decision in one place so `App.tsx` can stay declarative:
 *
 *   const route = getRoute();
 *   switch (route.kind) {
 *     case 'activate': return <ActivatePage iccid={route.iccid} />;
 *     case 'topup':    return <TopUpPage iccid={route.iccid} />;
 *     default:         return <CustomerApp />;
 *   }
 *
 * When we add a real router (Phase 2/3 marketing pages) the matching here
 * gets replaced — call sites only need the discriminated union to stay
 * stable.
 *
 * @see docs/ACTIVATION_FUNNEL.md §2 — Architecture: path-based routing
 */

export type Route =
    | { kind: 'app' }                                  // /, /app, /app/*, anything not matched below
    | { kind: 'activate'; iccid: string | null }       // /activate, /activate?iccid=...
    | { kind: 'topup'; iccid: string | null }          // /top-up, /top-up?iccid=...
    | { kind: 'apiTest' };                             // legacy #api-test debug surface

/**
 * Inspect `window.location` and return the route the app should render.
 *
 * Server-safe: returns `{ kind: 'app' }` when there is no `window` (e.g.
 * during SSR snapshots or Vitest jsdom setup with the global stripped).
 */
export function getRoute(): Route {
    if (typeof window === 'undefined') {
        return { kind: 'app' };
    }

    // Hash-based legacy debug surfaces take priority — they're expected to
    // work even when stacked underneath a real path (e.g. /app/#api-test).
    if (window.location.hash.includes('api-test')) {
        return { kind: 'apiTest' };
    }

    const path = window.location.pathname;

    if (path === '/activate' || path.startsWith('/activate/')) {
        return { kind: 'activate', iccid: extractIccidFromQuery() };
    }

    if (path === '/top-up' || path.startsWith('/top-up/')) {
        return { kind: 'topup', iccid: extractIccidFromQuery() };
    }

    return { kind: 'app' };
}

/**
 * Pull `?iccid=...` from the current URL and normalise it.
 *
 * Returns `null` when the param is missing, empty, or fails the loose ICCID
 * shape check (15-22 ASCII alphanumerics — matches the Laravel route
 * constraint). Callers should treat `null` as "ask the user to scan or type
 * their ICCID" rather than as an error.
 */
function extractIccidFromQuery(): string | null {
    try {
        const raw = new URLSearchParams(window.location.search).get('iccid');

        if (!raw) {
            return null;
        }

        // Strip whitespace and any URL-encoding leftovers — barcode scanners
        // sometimes emit decorative spacing or hyphens that we don't want
        // forwarded to the backend lookup.
        const cleaned = raw.replace(/[^0-9A-Za-z]/g, '');

        if (cleaned.length < 15 || cleaned.length > 22) {
            return null;
        }

        return cleaned;
    } catch {
        // URLSearchParams can throw on truly malformed URLs — fail silently
        // and let the page render its empty-state UI.
        return null;
    }
}
