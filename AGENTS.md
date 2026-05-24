# Evair-H5 — instructions for automated assistants

Jordan asked that **every new agent receives full project instructions without manual steps**.

Cursor loads **all** `.cursor/rules/*.mdc` files tagged `alwaysApply: true` whenever this workspace is open.

Optional **Agent Skills** (topic playbooks Cursor may load when a task matches) live under **`.cursor/skills/*/SKILL.md`** — layout, SEO, and WebView shell notes live there alongside rules.

## Start here

1. Read **`.cursor/rules/00-agent-start-here.mdc`** — master checklist and read order for every rule file.
2. **Jordan chat history** (`jordan-chat-history.mdc`): human preferences from chats (agents **extend this file themselves** whenever Jordan expresses a lasting preference — he should not need a special phrase).
3. Build commands and API layout: **`CLAUDE.md`**.

There is no separate "pull instructions" command — staying in this folder is enough if Cursor rules sync is enabled for the project.

## Cursor Cloud specific instructions

### Environment

- **Node.js 20** via nvm (`$HOME/.nvm`). The update script handles install/activation.
- After nvm loads, `npm install` in `/workspace` brings all deps up to date.
- No `.env` file is committed. Copy `.env.example` to `.env` for local dev; the defaults point at the production Laravel API (`evair.zhhwxt.cn`).

### Running the app

```bash
npm run dev        # Vite dev server on :3000 (host 0.0.0.0)
```

The app loads at `http://localhost:3000/app` (customer shell) or `http://localhost:3000/` (marketing site for unauthenticated visitors).

### Linting / type-checking

No dedicated `lint` script exists. Use:

```bash
npx tsc --noEmit   # TypeScript check (expect ~6 pre-existing errors in BarcodeScanner, esimApi, dataService, ApiTestPage — documented in ongoing-work.mdc)
```

### Tests

```bash
npm run test       # Vitest — currently 2 test files, 22 tests
```

### Build

```bash
npm run build      # Production build → dist/
```

### Gotchas

- The Vite config proxies `/api/*` to the deployed Netlify site (`evair-h5.netlify.app`) and `/laravel-api/*` to a local Laravel instance. In Cloud Agent VMs there is no local Laravel, so those proxy routes hit the remote. This is fine for H5 development.
- Stripe payment flows require `VITE_STRIPE_PUBLISHABLE_KEY` in `.env`; without it the SetupIntent card form won't initialize. Non-payment pages work fine without it.
- The 6 pre-existing TS errors do NOT block the build (Vite uses esbuild, not tsc, for transpilation).
