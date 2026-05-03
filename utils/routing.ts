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
 *     case 'topup':    return <TopUpPage iccid={route.iccid} initialTab={route.tab} />;
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

export type LegalSlug = 'terms' | 'privacy' | 'refund';

/** Top-up segmented control: SIM card (plastic) vs eSIM (travel / account lines). */
export type TopUpTab = 'sim' | 'esim';

export type Route =
    | { kind: 'app' }                                  // /, /app, /app/*, anything not matched below
    | { kind: 'activate'; iccid: string | null }       // /activate, /activate?iccid=...
    | {
          kind: 'topup';
          /** From `?tab=esim` or legacy `/top-up/esim`; default SIM. */
          tab: TopUpTab;
          iccid: string | null;
      }
    | { kind: 'marketing' }                            // /welcome (Phase 3 apex landing page)
    | { kind: 'marketingPreview' }                   // /welcome-preview — layout redesign draft (not live)
    | { kind: 'device'; category: DeviceCategory }     // /sim/phone, /sim/camera, /sim/iot (Phase 2 SEO)
    | { kind: 'travel'; countryCode: string | null }   // /travel-esim, /travel-esim/jp (Phase 2 SEO)
    | { kind: 'help'; slug: string | null }            // /help, /help/install-esim (Phase 4)
    | { kind: 'blog'; slug: string | null }            // /blog, /blog/sim-vs-esim (Phase 4)
    | { kind: 'legal'; slug: LegalSlug }                // /legal/terms, /legal/privacy, /legal/refund
    | { kind: 'apiTest' };                             // legacy #api-test debug surface

const DEVICE_CATEGORIES: ReadonlySet<DeviceCategory> = new Set(['phone', 'camera', 'iot']);
const LEGAL_SLUGS: ReadonlySet<LegalSlug> = new Set(['terms', 'privacy', 'refund']);

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
        return {
            kind: 'topup',
            tab: resolveTopUpTab(path),
            iccid: extractIccidFromQuery(),
        };
    }

    if (path === '/welcome-preview') {
        return { kind: 'marketingPreview' };
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

    // Phase 4 — help center: /help (index) and /help/{slug} (article).
    // Slugs are validated by the page component against the static
    // article catalogue; unknown slugs render the "article not found"
    // empty state rather than 404 at the network layer.
    if (path === '/help' || path === '/help/') {
        return { kind: 'help', slug: null };
    }
    if (path.startsWith('/help/')) {
        const slug = sanitiseSlug(path.slice('/help/'.length));
        return { kind: 'help', slug: slug || null };
    }

    // Phase 4 — blog: /blog (index) and /blog/{slug} (post).
    if (path === '/blog' || path === '/blog/') {
        return { kind: 'blog', slug: null };
    }
    if (path.startsWith('/blog/')) {
        const slug = sanitiseSlug(path.slice('/blog/'.length));
        return { kind: 'blog', slug: slug || null };
    }

    // Legal surfaces: /legal/terms, /legal/privacy, /legal/refund.
    // These are linked from the marketing footer and Stripe-required
    // for live mode — without a real route they would silently fall
    // through to the customer-app shell and present users with the
    // bottom-tab UI when they expect a policy document.
    if (path.startsWith('/legal/')) {
        const slug = sanitiseSlug(path.slice('/legal/'.length));
        if (slug && LEGAL_SLUGS.has(slug as LegalSlug)) {
            return { kind: 'legal', slug: slug as LegalSlug };
        }
    }

    // Apex evairdigital.com renders the marketing page at `/`. App users
    // still hit /app, /activate, /top-up explicitly so they're unaffected.
    if (path === '/' && MARKETING_HOSTS.has(window.location.hostname.toLowerCase())) {
        return { kind: 'marketing' };
    }

    return { kind: 'app' };
}

/**
 * Pull the first path segment as a content slug. Strips anything other
 * than lowercase letters, digits, and hyphens so a malformed URL can't
 * sneak HTML/JS into the page title via the slug parameter.
 */
function sanitiseSlug(rest: string): string {
    const first = rest.split('/')[0] ?? '';
    return first.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 100);
}

/**
 * Pull `?iccid=...` from the current URL and normalise it.
 *
 * Returns `null` when the param is missing, empty, or fails the loose ICCID
 * shape check (15–22 ASCII alphanumerics — matches the Laravel route
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

/** Path segment overrides query: `/top-up/esim` works without `?tab=`. Sync tab after pushState/popstate in TopUpPage. */
export function getTopUpTabFromLocation(pathname?: string): TopUpTab {
    if (typeof window === 'undefined') {
        return 'sim';
    }
    const path = pathname ?? window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments[1] === 'esim') return 'esim';
    if (segments[1] === 'sim') return 'sim';
    try {
        const raw = new URLSearchParams(window.location.search).get('tab');
        return raw === 'esim' ? 'esim' : 'sim';
    } catch {
        return 'sim';
    }
}

function resolveTopUpTab(pathname: string): TopUpTab {
    if (typeof window === 'undefined') {
        return 'sim';
    }
    const segments = pathname.split('/').filter(Boolean);
    if (segments[1] === 'esim') return 'esim';
    if (segments[1] === 'sim') return 'sim';
    try {
        const raw = new URLSearchParams(window.location.search).get('tab');
        return raw === 'esim' ? 'esim' : 'sim';
    } catch {
        return 'sim';
    }
}
