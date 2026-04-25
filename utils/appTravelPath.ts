/**
 * Customer-app path helpers for travel eSIM deep-links.
 *
 * Marketing / SEO pages funnel purchase intent into:
 *   `/app/travel-esim/{iso2}`  (e.g. `/app/travel-esim/jp`)
 *
 * The SPA shell (`CustomerApp`) reads this path on first paint,
 * switches to the eSIM tab, and passes the ISO code down to
 * `ShopView` so the matching country group opens immediately —
 * plan list + checkout without an extra tap through the catalogue.
 */
export function parseAppTravelEsimCountry(pathname: string): string | null {
    const p = pathname.replace(/\/+$/, '');
    const m = p.match(/^\/app\/travel-esim\/([a-z]{2})$/i);
    return m ? m[1].toLowerCase() : null;
}
