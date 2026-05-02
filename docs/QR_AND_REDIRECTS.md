# QR codes & redirect ops

Quick reference for packaging QR (`/r`), Netlify, and the production app URL.

## Printed / packaging QR

- **Generator:** `scripts/generate-qr.py` — set `URL` there, run the script, use the PNGs under `public/qr/` for print artwork.
- Typical encode target: `https://www.evairdigital.com/r` (short path, allows scan logging + redirect).

## Where scans go (same QR, change destination later)

1. **Default in code:** `netlify/functions/qr-scan.mjs` → deploy by pushing to Git (`main` → Netlify production build).
2. **Override without code change (optional):** Netlify **Site → Environment variables → `QR_SCAN_REDIRECT_URL`** — full URL (e.g. `https://www.evairdigital.com/app`). If unset, the function’s built-in default applies.

## Safari showing `evair-h5.netlify.app`

- **Edge:** `netlify/edge-functions/staging-robots.ts` — exact host `evair-h5.netlify.app` gets **301 → `https://www.evairdigital.com`** (path + query preserved). Preview deploy hostnames are not redirected.

## In-app desktop QR (OPEN APP)

- **`components/marketing/MobileOnlyNotice.tsx`** — `QR_TARGET_URL`; not the same as packaging `/r`.

See also: `netlify.toml` (`/r` → `qr-scan` function).
