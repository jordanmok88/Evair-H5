/**
 * Sitemap generator plugin.
 *
 * Emits `sitemap.xml` into the build output during `vite build`,
 * sourcing the URL list from the same data files the SEO pages render
 * from. Single source of truth — adding a new help article or country
 * page automatically lands in the next sitemap, with no risk of
 * `public/sitemap.xml` drifting out of sync.
 *
 * Production deploy flow:
 *   1. Netlify runs `npm run build`.
 *   2. This plugin's `generateBundle` hook reads
 *      data/{travelEsimCountries,helpArticles,blogPosts}.ts via the
 *      same module resolution Vite uses for the rest of the app.
 *   3. Builds the URL list, writes `dist/sitemap.xml`.
 *   4. Search engines hit `https://evairdigital.com/sitemap.xml`
 *      (configured in `public/robots.txt`) and discover every
 *      indexable URL in one shot.
 *
 * Why a Vite plugin instead of a standalone script:
 *   - No extra runtime dependency (`tsx`/`ts-node`).
 *   - Imports the data files directly — no duplication.
 *   - Runs on every `npm run build`; impossible to forget.
 *
 * @see public/robots.txt
 * @see data/helpArticles.ts
 * @see data/blogPosts.ts
 * @see data/travelEsimCountries.ts
 */

import type { Plugin } from 'vite';
import { TRAVEL_COUNTRIES } from '../data/travelEsimCountries';
import { EMBEDDED_CATALOG_LOCATION_FACETS_SNAPSHOT } from '../data/catalogLocationFacetsEmbed';
import { HELP_ARTICLES } from '../data/helpArticles';
import { POSTS_NEWEST_FIRST } from '../data/blogPosts';

interface SitemapEntry {
    /** Path relative to the host, e.g. `/help/install-esim-iphone`. */
    path: string;
    /** ISO-8601 date — used for `<lastmod>`. Defaults to today. */
    lastmod?: string;
    /** Crawler hint — defaults set per surface below. */
    changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    /** 0.0–1.0 — relative to other URLs on the same site. */
    priority?: number;
}

/**
 * Static catalogue of "shell" URLs that aren't driven by data files.
 * The home page sits at `/` (apex), which on `evairdigital.com` is the
 * marketing surface (see `utils/routing.ts` MARKETING_HOSTS).
 */
const STATIC_URLS: SitemapEntry[] = [
    { path: '/', changefreq: 'weekly', priority: 1.0 },
    { path: '/welcome', changefreq: 'weekly', priority: 0.9 },
    { path: '/sim/phone', changefreq: 'weekly', priority: 0.9 },
    { path: '/sim/camera', changefreq: 'weekly', priority: 0.8 },
    { path: '/sim/iot', changefreq: 'weekly', priority: 0.8 },
    { path: '/travel-esim', changefreq: 'weekly', priority: 0.9 },
    { path: '/help', changefreq: 'weekly', priority: 0.7 },
    { path: '/blog', changefreq: 'weekly', priority: 0.7 },
    { path: '/activate', changefreq: 'monthly', priority: 0.6 },
    { path: '/top-up', changefreq: 'monthly', priority: 0.6 },
    { path: '/top-up/sim', changefreq: 'monthly', priority: 0.55 },
    { path: '/top-up/esim', changefreq: 'monthly', priority: 0.55 },
    // Legal — Stripe live mode and most app stores require these to be
    // crawlable, and search engines should know they exist so users can
    // find them via "evair refund policy" type queries.
    { path: '/legal/terms', changefreq: 'yearly', priority: 0.3 },
    { path: '/legal/privacy', changefreq: 'yearly', priority: 0.3 },
    { path: '/legal/refund', changefreq: 'yearly', priority: 0.4 },
];

export interface SitemapPluginOptions {
    /** Canonical site origin, e.g. `https://evairdigital.com` (no trailing slash). */
    baseUrl: string;
}

export function sitemapPlugin(opts: SitemapPluginOptions): Plugin {
    const baseUrl = opts.baseUrl.replace(/\/+$/, '');
    const today = new Date().toISOString().slice(0, 10);

    return {
        name: 'evair-sitemap',
        apply: 'build',
        generateBundle() {
            const urls: SitemapEntry[] = [...STATIC_URLS];

            // Travel eSIM country pages — union curated SEO list + full stocked ISO list
            // from embedded catalogue snapshot (matches live /app/packages/locations singles).
            const travelPaths = new Set<string>();
            for (const country of TRAVEL_COUNTRIES) {
                travelPaths.add(`/travel-esim/${country.code.toLowerCase()}`);
            }
            for (const row of EMBEDDED_CATALOG_LOCATION_FACETS_SNAPSHOT.singleCountries) {
                const code = (row.code || '').toLowerCase();
                if (/^[a-z]{2}$/.test(code)) travelPaths.add(`/travel-esim/${code}`);
            }
            for (const path of travelPaths) {
                urls.push({
                    path,
                    changefreq: 'weekly',
                    priority: 0.8,
                });
            }

            // Help articles — `updatedAt` from the data drives `<lastmod>`
            // so we can show search engines that content is fresh.
            for (const article of HELP_ARTICLES) {
                urls.push({
                    path: `/help/${article.slug}`,
                    lastmod: article.updatedAt,
                    changefreq: 'monthly',
                    priority: 0.6,
                });
            }

            // Blog posts — same idea, but the `publishedAt` date is the
            // best `<lastmod>` proxy unless we add an `updatedAt` column.
            for (const post of POSTS_NEWEST_FIRST) {
                urls.push({
                    path: `/blog/${post.slug}`,
                    lastmod: post.publishedAt,
                    changefreq: 'monthly',
                    priority: 0.6,
                });
            }

            const body = urls
                .map(u => renderUrl(baseUrl, u, today))
                .join('\n');

            const xml =
                `<?xml version="1.0" encoding="UTF-8"?>\n` +
                `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
                `${body}\n` +
                `</urlset>\n`;

            this.emitFile({
                type: 'asset',
                fileName: 'sitemap.xml',
                source: xml,
            });
        },
    };
}

function renderUrl(baseUrl: string, entry: SitemapEntry, today: string): string {
    const lines = [
        `  <url>`,
        `    <loc>${escapeXml(`${baseUrl}${entry.path}`)}</loc>`,
        `    <lastmod>${entry.lastmod ?? today}</lastmod>`,
    ];
    if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    if (entry.priority !== undefined) lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    lines.push(`  </url>`);
    return lines.join('\n');
}

function escapeXml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
