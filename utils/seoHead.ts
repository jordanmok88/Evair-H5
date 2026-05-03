/**
 * Client-side SEO tags for marketing surfaces.
 *
 * Social scrapers are handled separately by `netlify/edge-functions/og-rewriter.ts`.
 * This module keeps canonical + Open Graph aligned in the browser after
 * hydration when customers navigate between SPA routes without a full reload.
 */

const SITE_ORIGIN = 'https://evairdigital.com';
/** Square brand mark — scrapers that crop to a thumbnail (WeChat, some iOS previews) behave better than a 1200×630 hero. */
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/evairsim-logo.png`;

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
    const sel = attr === 'name' ? `meta[name="${key}"]` : `meta[property="${key}"]`;
    let el = document.head.querySelector(sel) as HTMLMetaElement | null;
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function upsertLinkCanonical(href: string): void {
    let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
    }
    el.setAttribute('href', href);
}

export interface PageSeoOptions {
    /** Pathname + optional search, e.g. `/travel-esim/jp` or `/welcome`. */
    path: string;
    title: string;
    description: string;
    ogType?: 'website' | 'article';
}

/**
 * Sets document title, meta description, canonical, and OG/Twitter mirrors.
 * `path` must start with `/` (leading slash added if missing).
 */
export function applyPageSeo(opts: PageSeoOptions): void {
    if (typeof document === 'undefined') return;

    const path = opts.path.startsWith('/') ? opts.path : `/${opts.path}`;
    const url = `${SITE_ORIGIN}${path}`;

    document.title = opts.title;
    upsertMeta('name', 'description', opts.description);
    upsertLinkCanonical(url);

    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:title', opts.title);
    upsertMeta('property', 'og:description', opts.description);
    upsertMeta('property', 'og:type', opts.ogType ?? 'website');
    upsertMeta('property', 'og:site_name', 'EvairSIM');
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);
    upsertMeta('property', 'og:image:width', '512');
    upsertMeta('property', 'og:image:height', '512');
    upsertMeta('property', 'og:image:alt', 'EvairSIM logo');
    upsertMeta('property', 'og:locale', 'en_US');

    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', opts.title);
    upsertMeta('name', 'twitter:description', opts.description);
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);
}
