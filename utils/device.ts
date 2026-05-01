/**
 * Device-class detection used by the marketing site to branch CTAs at
 * click time.
 *
 * Why this lives in /utils and not inline in MarketingPage:
 *
 *   - The same heuristic is wanted by the long-stay button, the
 *     pillar "Browse plans" link, and the final "Get started" CTA, so
 *     centralising the check keeps them all in lockstep.
 *
 *   - Detection has to happen at click time (not href-render time)
 *     because the marketing surface is statically pre-rendered and
 *     scraped by SEO bots that all identify as desktop. If we baked
 *     the device decision into the rendered href we would either
 *     give bots the wrong URL or hide the desktop URL from them.
 *
 * The heuristic combines two signals:
 *
 *   1. **User-Agent regex** — the same expression already used at
 *      App.tsx:753 for analytics tagging (`/iPhone|iPad|Android/`),
 *      extended to cover the rest of the common mobile browsers.
 *      UA spoofing exists, but for a marketing-page CTA the cost of
 *      a wrong call is a one-tap correction, not a security issue.
 *
 *   2. **Viewport width via matchMedia(max-width: 1023px)** — matches
 *      the same `lg:` breakpoint Tailwind already uses to flip the
 *      H5 between full-screen mobile app and desktop phone-mock.
 *      Catches the "phone in landscape" and "desktop browser pinned
 *      narrow" edge cases that pure UA misses.
 *
 * We treat the visitor as **mobile** if EITHER signal fires. False
 * positives ("desktop user with a tiny window") get the mobile
 * full-screen app, which is fine — the H5 is fully responsive at any
 * viewport. False negatives ("Android tablet in landscape") get the
 * desktop store, which is also fine.
 */
export function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;

    const ua = navigator.userAgent || '';
    const uaMobile = /iPhone|iPad|iPod|Android|Mobile|Silk|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const narrow =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 1023px)').matches;

    return uaMobile || narrow;
}

/**
 * **User-agent only** — no viewport check.
 * Used by the marketing "OPEN APP" modal gate: desktop browsers with a narrow
 * window must still see the scan-QR dialog; `isMobileDevice()` would wrongly
 * treat them as mobile because of `max-width: 1023px`.
 */
export function isMobileUserAgentClient(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod|Android|Mobile|Silk|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}
