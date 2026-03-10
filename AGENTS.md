# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

EvairSIM is a React + Vite + TypeScript mobile web app (PWA) for purchasing/managing travel eSIMs and physical SIM cards. See `README.md` for basic run instructions.

### Tech stack

- **Frontend**: React 19, Vite 6, Tailwind CSS 4, TypeScript 5.8
- **Backend**: Netlify Functions (serverless), Supabase (PostgreSQL + Auth + Realtime)
- **External APIs**: eSIM Access (Red Tea), 17track, Google Gemini
- **Node version**: 20 (specified in `netlify.toml`)

### Running the dev server

```
npm run dev
```

Starts Vite on port 3000 (`0.0.0.0`). The app works fully without any external service credentials — it uses mock data, demo mode for ordering, and graceful fallbacks when Supabase/API keys are not configured.

### Building

```
npm run build
```

Outputs to `dist/`. There is a chunk size warning for the main JS bundle (>500 kB) — this is expected and not a build failure.

### Lint / Test

No ESLint config or test framework is configured in this repository. The `package.json` only has `dev`, `build`, and `preview` scripts.

### External services (all optional)

All external services are optional. The app checks `supabaseConfigured` at runtime and falls back to mock data. API proxy routes (`/api/esim`, `/api/track`) are proxied to the production Netlify deployment in dev mode via `vite.config.ts`.

| Service | Env vars | Purpose |
|---------|----------|---------|
| Supabase | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Notifications, live chat, admin auth |
| eSIM Access | `ESIM_ACCESS_CODE`, `ESIM_SECRET` | Real eSIM package data |
| 17track | `TRACK17_API_KEY` | Shipment tracking |
| Gemini | `GEMINI_API_KEY` | AI chat assistant |

Set these in `.env.local` (see `.env.example` for reference).
