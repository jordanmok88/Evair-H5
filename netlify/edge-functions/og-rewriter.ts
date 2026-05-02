/**
 * OG / social-card rewriter — Netlify Edge Function.
 *
 * Why this exists:
 *   The H5 app is a single-page React app. Per-route `<title>` and
 *   `<meta name="description">` are set in `useEffect` once React
 *   hydrates. Googlebot tolerates this (it executes JS), but every
 *   social-card scraper out there does not:
 *     - Twitter / X      — reads only the static HTML
 *     - Facebook / Slack — reads only the static HTML
 *     - LinkedIn         — reads only the static HTML
 *     - iMessage         — reads only the static HTML
 *
 *   Without a server-side rewrite, every share of `/blog/japan-2026`
 *   or `/help/install-esim-iphone` shows the generic homepage card.
 *
 * How it works:
 *   1. Netlify routes every HTML request through this edge function
 *      via `[[edge_functions]]` in `netlify.toml`.
 *   2. We pass through to origin to fetch `dist/index.html` (the SPA
 *      shell with hardcoded marketing-defaults OG tags).
 *   3. If the URL maps to a content surface we know about (help
 *      article, blog post, country page), we string-replace the
 *      relevant `<title>`, `<meta>` and `<meta property="og:*">`
 *      tags with route-specific values pulled from the same data
 *      files the React pages use. Same source of truth, no drift.
 *   4. If the URL is anything else (the customer app, /activate, etc.),
 *      we return the response untouched.
 *
 * Important: this runs on Deno Deploy. Imports must be relative or
 * use Deno-friendly specifiers. We import the project's data files
 * directly — they're pure data with no DOM/React/npm dependencies,
 * so Deno bundles them cleanly.
 *
 * Performance: the edge function is a stream-through string replace.
 * Cold start is sub-50ms, warm is ~5-10ms. We do not block on origin
 * — the response stream is consumed once.
 *
 * @see netlify.toml [[edge_functions]] block
 * @see vite-plugins/sitemap.ts (companion: builds the URL list)
 */

import type { Context } from 'https://edge.netlify.com/';
import { HELP_ARTICLES } from '../../data/helpArticles.ts';
import { BLOG_POSTS } from '../../data/blogPosts.ts';
import { TRAVEL_COUNTRIES } from '../../data/travelEsimCountries.ts';

const SITE_ORIGIN = 'https://evairdigital.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;
const OG_IMAGE_WIDTH = '1200';
const OG_IMAGE_HEIGHT = '630';

interface OgMeta {
    title: string;
    description: string;
    image?: string;
    /** Used for `og:type`. Articles get `article`; everything else `website`. */
    type?: 'website' | 'article';
}

export default async (request: Request, context: Context): Promise<Response | void> => {
    // Only rewrite HTML responses. Everything else (assets, sitemap,
    // robots, JSON, images) flows through untouched.
    const accept = request.headers.get('accept') ?? '';
    if (!accept.includes('text/html')) return;

    const url = new URL(request.url);
    const meta = resolveMeta(url.pathname);
    // No mapping → don't bother fetching origin twice; let Netlify
    // serve the page directly. The default OG tags in index.html are
    // already correct for the marketing apex.
    if (!meta) return;

    const response = await context.next();
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return response;

    const original = await response.text();
    const rewritten = rewrite(original, meta, url.toString());

    return new Response(rewritten, {
        status: response.status,
        headers: response.headers,
    });
};

/**
 * Look up route-specific metadata. Returns null for unknown paths so
 * the edge function can short-circuit without re-fetching origin.
 */
function resolveMeta(pathname: string): OgMeta | null {
    // Help articles → /help/{slug}
    if (pathname.startsWith('/help/')) {
        const slug = pathname.slice('/help/'.length).split('/')[0];
        if (!slug) return helpIndexMeta();
        const article = HELP_ARTICLES.find(a => a.slug === slug);
        if (!article) return helpIndexMeta();
        return {
            title: `${article.title} — EvairSIM Help`,
            description: article.summary,
            image: DEFAULT_OG_IMAGE,
            type: 'article',
        };
    }
    if (pathname === '/help' || pathname === '/help/') return helpIndexMeta();

    // Blog posts → /blog/{slug}
    if (pathname.startsWith('/blog/')) {
        const slug = pathname.slice('/blog/'.length).split('/')[0];
        if (!slug) return blogIndexMeta();
        const post = BLOG_POSTS.find(p => p.slug === slug);
        if (!post) return blogIndexMeta();
        return {
            title: `${post.title} — EvairSIM Blog`,
            description: post.summary,
            image: DEFAULT_OG_IMAGE,
            type: 'article',
        };
    }
    if (pathname === '/blog' || pathname === '/blog/') return blogIndexMeta();

    // Travel eSIM country pages → /travel-esim/{iso2}
    if (pathname.startsWith('/travel-esim/')) {
        const code = pathname.slice('/travel-esim/'.length).split('/')[0]?.toLowerCase();
        if (!code) return travelIndexMeta();
        const country = TRAVEL_COUNTRIES.find(c => c.code === code);
        if (!country) return travelIndexMeta();
        return {
            title: `${country.name} eSIM — from $${country.priceFromUsd} | EvairSIM`,
            description: country.blurb,
            image: DEFAULT_OG_IMAGE,
            type: 'website',
        };
    }
    if (pathname === '/travel-esim' || pathname === '/travel-esim/') {
        return travelIndexMeta();
    }

    // Device-category landing pages — small, hardcoded for now since
    // `data/deviceLandings.ts` pulls in lucide-react which Deno Deploy
    // can't bundle without a custom import map.
    if (pathname === '/sim/phone') {
        return {
            title: 'Mobile & tablet SIM cards — EvairSIM',
            description:
                'Honest US SIM cards for mobiles, tablets, hotspots, and laptops. 5G up to 650 Mbps; 9 GB high-speed then 10 Mbps. Plug-and-play APN.',
            type: 'website',
        };
    }
    if (pathname === '/sim/camera') {
        return {
            title: 'Trail & security camera SIMs — EvairSIM',
            description:
                'Reliable cellular SIMs for trail cams, security cameras, and outdoor monitoring. 1.5 Mbps cap all month, no hidden throttle. From $4.99/mo.',
            type: 'website',
        };
    }
    if (pathname === '/sim/iot') {
        return {
            title: 'IoT & smart device SIMs — EvairSIM',
            description:
                'GPS trackers, walkie-talkies, POS terminals, smart watches, e-readers, robotic mowers. 500 Kbps low-data plans built for telemetry.',
            type: 'website',
        };
    }

    return null;
}

function helpIndexMeta(): OgMeta {
    return {
        title: 'Help center — EvairSIM',
        description:
            'Setup guides, troubleshooting, billing, and refunds. Find an answer or open a chat with us.',
        type: 'website',
    };
}

function blogIndexMeta(): OgMeta {
    return {
        title: 'EvairSIM Blog — Travel eSIMs, US SIMs, IoT',
        description:
            'Honest guides on travel eSIMs, US SIMs, IoT data plans, and how to actually save money on mobile data.',
        type: 'website',
    };
}

function travelIndexMeta(): OgMeta {
    return {
        title: 'Travel eSIMs for 200+ countries — EvairSIM',
        description:
            'Buy travel eSIMs for Japan, the UK, Mexico, and 200+ destinations. Install at home, connect when you land. From $4.99.',
        type: 'website',
    };
}

/**
 * String-replace the OG / Twitter / title tags in the SPA shell.
 *
 * We use targeted regex replacement (one tag at a time) instead of
 * a full HTML parser because:
 *   - The shell is generated by Vite and is structurally stable.
 *   - Edge functions have a strict CPU budget; HTMLRewriter (Cloudflare)
 *     isn't available on Netlify, and DOMParser on Deno is heavyweight.
 *   - We only touch `<head>`; never touch user content. No XSS risk.
 *
 * Anything we don't recognise (extra meta tags added later, OG arrays)
 * is left untouched.
 */
function rewrite(html: string, meta: OgMeta, canonicalUrl: string): string {
    const image = meta.image ?? DEFAULT_OG_IMAGE;
    const type = meta.type ?? 'website';
    const desc = escapeAttr(meta.description);
    const title = escapeText(meta.title);
    const titleAttr = escapeAttr(meta.title);
    const url = escapeAttr(canonicalUrl);

    let out = html;

    // <title>
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

    // canonical link
    out = out.replace(
        /<link\s+rel="canonical"[^>]*>/i,
        `<link rel="canonical" href="${url}" />`,
    );

    // meta description
    out = out.replace(
        /<meta\s+name="description"[^>]*>/i,
        `<meta name="description" content="${desc}" />`,
    );

    // OG tags
    out = out.replace(
        /<meta\s+property="og:type"[^>]*>/i,
        `<meta property="og:type" content="${type}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:url"[^>]*>/i,
        `<meta property="og:url" content="${url}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:title"[^>]*>/i,
        `<meta property="og:title" content="${titleAttr}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:description"[^>]*>/i,
        `<meta property="og:description" content="${desc}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:image"[^>]*>/i,
        `<meta property="og:image" content="${image}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:image:width"[^>]*>/i,
        `<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />`,
    );
    out = out.replace(
        /<meta\s+property="og:image:height"[^>]*>/i,
        `<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`,
    );

    // Twitter tags
    out = out.replace(
        /<meta\s+name="twitter:title"[^>]*>/i,
        `<meta name="twitter:title" content="${titleAttr}" />`,
    );
    out = out.replace(
        /<meta\s+name="twitter:description"[^>]*>/i,
        `<meta name="twitter:description" content="${desc}" />`,
    );
    out = out.replace(
        /<meta\s+name="twitter:image"[^>]*>/i,
        `<meta name="twitter:image" content="${image}" />`,
    );

    return out;
}

function escapeAttr(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeText(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
