# Cloudflare Pages (Evair H5)

This repo deploys the Vite React app to **Cloudflare Pages** with **Pages Functions** (`functions/`) replacing Netlify serverless routes.

## What moved from Netlify

| Public path | Handler |
|-------------|---------|
| `POST /api/esim` | Red Tea HMAC proxy (→ `api.esimaccess.com`) |
| `POST /api/track` | Analytics no-op (200) |
| `POST /api/stripe-checkout` | Stripe Checkout Session |
| `POST /api/stripe-verify` | Stripe session verify |
| `POST /api/send-esim-email` | Resend HTML email (replaces `/.netlify/functions/send-esim-email`) |
| `GET /r` | QR scan log + 302 to app shell |

**Not ported in this cut** (Netlify-only today): `netlify/edge-functions/og-rewriter.ts` and `staging-robots.ts`. Social preview HTML and `*.netlify.app` robots behaviour need a **separate Cloudflare Worker** or Transform Rules if you still want parity.

## SPA routing

Cloudflare Pages **automatically treats the site as an SPA** when there is **no** root `404.html` (`/404.html`). You do **not** need a `/* → /index.html` `_redirects` rule; that pattern is flagged as an infinite loop on Pages.

## Git-connected deploy (recommended)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → Connect **`jordanmok88/Evair-H5`** (or Aliyun mirror).
2. Build settings:
   - **Build command:** `npm ci && npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (repo root)
   - **Deploy command:**
     - If the form says it is **optional** or allows a blank value: leave **empty** (classic Pages upload).
     - If the form shows **Required** in red: Cloudflare is using **Workers Git builds**. Use:  
       **`npx wrangler pages deploy dist --project-name=evairh5`**  
       (match the project name shown in the dashboard — yours is **evairh5**).  
       Do **not** use `npx wrangler deploy` alone (that targets a plain Worker, not this site).
3. Set **environment variable** `NODE_VERSION` = `22` (matches `netlify.toml`).
4. **Production branch:** usually `main`.
5. Add **production** secrets (mirror Netlify prod):

   - `ALLOWED_ORIGINS` — comma-separated extra origins (`https://<project>.pages.dev`, preview hosts, staging).
   - `ESIM_ACCESS_CODE`, `ESIM_SECRET`
   - `STRIPE_SECRET_KEY`
   - `RESEND_API_KEY`, `RESEND_FROM`
   - Optional: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (`/r` logging)
   - Optional: `QR_SCAN_REDIRECT_URL` (default `https://www.evairdigital.com/app`)
   - Optional rate-limit overrides: `RATE_LIMIT_*` (see `lib/cloudflare/rateLimit.ts`)

6. Frontend **non-secret** vars still come from `VITE_*` in Pages (same as Netlify): `VITE_API_BASE_URL`, Stripe publishable key, Laravel URLs, chat, etc.

7. Attach **Custom domain** (e.g. `evairdigital.com`): DNS per Cloudflare prompts (apex or `www`). Remove or pause old Netlify apex records when you cut over.

`wrangler.toml` sets `nodejs_compat` and `compatibility_date` so **Stripe** and **`node:crypto`** work in Functions.

## Manual CLI deploy

```bash
npm ci
npm run build
npx wrangler pages deploy dist --project-name=YOUR_PROJECT_SLUG --branch=main
```

Create the project once in the dashboard or via **Workers & Pages** → Create.

## Local dev (Vite + Functions)

Terminal A — Pages serves static **`dist`** and compiles **`functions/`**:

```bash
npm run build
npm run cf:dev
```

(Default bind: `http://127.0.0.1:8788`; override Wrangler `--port`.)

Terminal B — Vite on `:3000` with proxy to Functions:

```bash
# .env.local
VITE_FUNCTIONS_PROXY_TARGET=http://127.0.0.1:8788
npm run dev
```

Wrangler reads **secrets** from `.dev.vars` at the repo root (same names as Dashboard). Example:

```
ESIM_ACCESS_CODE=...
ESIM_SECRET=...
STRIPE_SECRET_KEY=...
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
RESEND_API_KEY=...
RESEND_FROM=EvairSIM <noreply@evairdigital.com>
```

Without `ALLOWED_ORIGINS`, browser calls from `http://localhost:3000` get **403** from CORS (by design).

## Cutover checklist

1. Deploy Pages project; verify preview URL loads `/`, `/app`, `/travel-esim/...`.
2. Smoke **`POST /api/track`** with curl (no `Origin` header).
3. Smoke checkout on **staging domain** with Stripe test keys if applicable.
4. Point DNS to Cloudflare; wait for TLS; purge cache if headers look stale.
5. Disable Netlify build hook when confident.

## Troubleshooting

### `EBADPLATFORM` / `@rollup/rollup-android-*` during install

That error means the build machine (Linux) refused a package built for another OS. This project **does not** ship `netlify-cli` in `package.json` (it pulled a huge tree that confused strict installs), and **does not** use `omit=optional` in `.npmrc` (that breaks Vite/Rollup’s normal platform add-ons). Pull the latest `main` and redeploy.

### “Deploy command” is **required** (red error when empty)

Some accounts use **Workers** Git builds, which **require** a deploy step. Use **Pages deploy**, not Worker upload:

```bash
npx wrangler pages deploy dist --project-name=evairh5
```

Replace **`evairh5`** with your project’s name as shown in the dashboard. **`npx wrangler deploy`** (without `pages`) is for plain Workers and will **not** match this Vite + `functions/` layout.

### “Deploy command” set to `npx wrangler deploy` (wrong for this repo)

That command uploads a **Worker** package, not a **Pages + `dist` + `functions/`** bundle. Prefer **`npx wrangler pages deploy dist --project-name=evairh5`** when the dashboard requires a deploy command, or leave deploy empty when the UI allows it.
