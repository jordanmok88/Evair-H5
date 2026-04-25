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

/**
 * Device-category SEO landing pages live under `/sim/{category}`. The
 * union literal here is the source of truth for what the router will
 * accept — adding a new category means adding a copy block in
 * `data/deviceLandings.ts` AND extending this list.
 */
export type DeviceCategory = 'phone' | 'camera' | 'iot';

export type Route =
    | { kind: 'app' }                                  // /, /app, /app/*, anything not matched below
    | { kind: 'activate'; iccid: string | null }       // /activate, /activate?iccid=...
    | { kind: 'topup'; iccid: string | null }          // /top-up, /top-up?iccid=...
    | { kind: 'marketing' }                            // /welcome (Phase 3 apex landing page)
    | { kind: 'device'; category: DeviceCategory }     // /sim/phone, /sim/camera, /sim/iot (Phase 2 SEO)
    | { kind: 'travel'; countryCode: string | null }   // /travel-esim, /travel-esim/jp (Phase 2 SEO)
    | { kind: 'apiTest' };                             // legacy #api-test debug surface

const DEVICE_CATEGORIES: ReadonlySet<DeviceCategory> = new Set(['phone', 'camera', 'iot']);

/**
 * Hostnames where `/` should boot directly into the marketing page
 * instead of the customer app. This lets us serve the same Vite build
 * from `evairdigital.com` (marketing) and `app.evairdigital.com` (app)
 * without a separate deployment. Keep this list short — it only needs
 * the apex; any subdomain we don't recognise falls through to `app`.
 */
const MARKETING_HOSTS = new Set([
    'evairdigital.com',
    'www.evairdigital.com',
]);

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

    if (path === '/welcome' || path === '/marketing') {
        return { kind: 'marketing' };
    }

    // Phase 2 device-category landing pages: /sim/phone, /sim/camera,
    // /sim/iot. Anything we don't recognise (e.g. /sim/typo) falls
    // through to the customer app rather than 404 — Netlify rewrites
    // catch real 404s above.
    if (path.startsWith('/sim/')) {
        const slug = path.slice('/sim/'.length).split('/')[0]?.toLowerCase();
        if (slug && DEVICE_CATEGORIES.has(slug as DeviceCategory)) {
            return { kind: 'device', category: slug as DeviceCategory };
        }
    }

    // Phase 2 travel eSIM pages: /travel-esim (catalogue index) and
    // /travel-esim/{iso2} (single-country page). ISO-2 is normalised to
    // lowercase here; the page component treats it case-insensitively.
    if (path === '/travel-esim' || path === '/travel-esim/') {
        return { kind: 'travel', countryCode: null };
    }
    if (path.startsWith('/travel-esim/')) {
        const slug = path.slice('/travel-esim/'.length).split('/')[0]?.toLowerCase() ?? '';
        const cleaned = slug.replace(/[^a-z]/g, '').slice(0, 2);
        return { kind: 'travel', countryCode: cleaned.length === 2 ? cleaned : null };
    }

    // Apex evairdigital.com renders the marketing page at `/`. App users
    // still hit /app, /activate, /top-up explicitly so they're unaffected.
    if (path === '/' && MARKETING_HOSTS.has(window.location.hostname.toLowerCase())) {
        return { kind: 'marketing' };
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
