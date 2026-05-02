# EvairSIM H5

Mobile-first React (Vite + TypeScript + Tailwind) customer app and marketing
surface for **evairdigital.com**, deployed on **Netlify**.

## Local development

```bash
npm install
npm run dev
```

- **App shell:** [http://localhost:3000/app](http://localhost:3000/app)
- **API base:** set `VITE_API_BASE_URL` in `.env.local` (see `.env.example`).
- **Netlify Functions in dev:** run `npx netlify dev` (defaults to port **8888**)
  so `/api/esim`, `/api/stripe-checkout`, `/api/stripe-verify`, and `/api/track`
  resolve locally. Vite proxies those paths to **`VITE_NETLIFY_FUNCTIONS_PROXY_TARGET`**
  (default `http://127.0.0.1:8888`). Do **not** point the proxy at production Netlify
  unless you intend to hit live Stripe / supplier from your laptop.
- **Laravel API:** optional proxy `VITE_LARAVEL_PROXY_TARGET` (see `vite.config.ts`).

## Security / Netlify environment

- **Do not** set `GEMINI_API_KEY` for the Vite client build. There is no in-browser
  Gemini integration; any future LLM calls must go through a **serverless function**
  with the key in Netlify env only.
- **CORS:** Functions use an allowlist (`https://evairdigital.com`,
  `https://www.evairdigital.com`) plus optional **`ALLOWED_ORIGINS`** (comma-separated)
  for branch deploy URLs and e.g. `http://localhost:3000` during Vite + `netlify dev`.
- **Rate limits:** best-effort per-IP windows in `netlify/functions/rate-limit.mjs`
  (tunable via `RATE_LIMIT_*` env vars documented in that file).

## OG / social image

Source artwork: `public/og-image.png`. Optimized JPEG for crawlers:

```bash
npm run og:optimize
```

Produces `public/og-image.jpg` (~1200×630). References live in `index.html`,
`utils/seoHead.ts`, and the edge rewriter.

## Quality checks

```bash
npm run build
npm run verify:sitemap   # expects dist/sitemap.xml from prior build
npm test                 # includes i18n key parity (en/zh/es)
```

## Deploy

Push to **`main`** on GitHub (see `scripts/save.sh`). Netlify build: `npm run build`, publish `dist/`.
