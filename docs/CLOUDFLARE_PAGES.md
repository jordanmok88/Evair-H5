# Cloudflare Pages (Evair H5)

This repo deploys the Vite React app to **Cloudflare Pages** with **Pages Functions** (`functions/`) replacing Netlify serverless routes.

## If “Deploy command” is required or you get “Invalid request body”

You likely created a **Worker** with Git (**Workers Builds**), not **Pages**.

- That flow only accepts commands like **`npx wrangler deploy`**. It will **reject** **`npx wrangler pages deploy`**, which often shows as **Invalid request body** when saving.
- This repo targets **Cloudflare Pages** (`dist` + root `functions/`), not Worker-only upload.

**Fix:** create a **new Pages** project (keep or ignore the old Worker):

1. **Workers & Pages** → **Create** → **Pages** (not Worker / not “Deploy to Workers”).
2. Connect **Git** → `jordanmok88/Evair-H5`, branch `main`.
3. **Build command:** `npm ci && npm run build` — **Output directory:** `dist`.
4. Pages has **no** Wrangler “Deploy command” step like Workers Git.
5. Set **`NODE_VERSION`** = `22` and copy Netlify **variables/secrets**.

---

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
2. Build settings (**Pages** wizard):
   - **Build command:** `npm ci && npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (repo root)  
   The Pages flow **does not** use Workers’ “Deploy command” field. If you only see Worker-style **Deploy command** / **Version command**, you are in the wrong project type — see the section at the top of this doc.
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

### “Deploy command” required or **Invalid request body** saving build settings

You are almost certainly inside a **Worker** project using **Workers Builds**, not **Pages**. The dashboard rejects **`wrangler pages deploy`** there. **Do not keep fighting that form.** Create a **Pages** project using the steps in [If “Deploy command” is required or you get “Invalid request body”](#if-deploy-command-is-required-or-you-get-invalid-request-body) at the top of this file.

### Old note: **`npx wrangler deploy`** alone

That uploads a **Worker** only — wrong for this repo’s Pages Functions layout unless you migrate the whole project to Workers static assets.
