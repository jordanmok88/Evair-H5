---
name: evair-h5-seo
description: >-
  SEO and indexable surfaces for Evair H5 (/travel-esim*, marketing, helpers). Use when
  editing titles/meta, OG, sitemap routing, structured data, or crawler-facing content.
---

# Evair H5 — SEO and discoverability

Use when touching **titles, descriptions, OG/Twitter previews, canonical paths, robots-related HTML, structured data**, or **URL lists** that search engines crawl.

## Page-level SEO helpers

- **Runtime head:** [`applyPageSeo`](../../utils/seoHead.ts) drives `<title>` and meta descriptions for SPA navigations — keep country/marketing URLs consistent when adding pages.
- **Country travel pages:** [`TravelEsimPage.tsx`](../../views/TravelEsimPage.tsx) (index + per-ISO slug) — headings and hero copy tie into search intent (“{Country} eSIM”).
- **Top-level routing / deep links:** [`utils/routing.ts`](../../utils/routing.ts) and [`App.tsx`](../../App.tsx) — document title rules and route switches must stay aligned with public URLs.

## Social / crawler HTML (edge)

- **Netlify edge:** [`netlify/edge-functions/og-rewriter.ts`](../../netlify/edge-functions/og-rewriter.ts) rewrites OG/Twitter tags for crawlers on configured paths.
- **Registration:** Paths are listed under **`[[edge_functions]]`** in [`netlify.toml`](../../netlify.toml) (e.g. `/travel-esim`, `/travel-esim/*`, `/help`, `/blog`, `/sim/*`).

## Sitemap (build-time single source)

- **Generator:** [`vite-plugins/sitemap.ts`](../../vite-plugins/sitemap.ts) — wired from [`vite.config.ts`](../../vite.config.ts); runs on **`vite build`**, emits **`dist/sitemap.xml`** for apex **`https://evairdigital.com`**.
- **Do not maintain** a stale hand-edited `public/sitemap.xml` alongside the plugin — extend the plugin’s route list ([`vite-plugins/sitemap.ts`](../../vite-plugins/sitemap.ts)).

## Locked product copy and geography

- **USA-only physical catalogue**, **pillars**, and **tone** constraints live in [`product-decisions.mdc`](../rules/product-decisions.mdc) — **do not contradict** them in meta or body copy for ranking pages.
- **Phase / roadmap numbering:** Two systems exist in docs — disambiguate before citing “Phase N” in public copy ([`ongoing-work.mdc`](../rules/ongoing-work.mdc)).

## Footer / IA

- Marketing footer uses a structured link grid — see [`components/marketing/SiteFooter.tsx`](../../components/marketing/SiteFooter.tsx) when changing discoverability from sitewide links.
