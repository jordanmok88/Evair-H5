# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start Vite dev server on port 3000
npm run build        # Production build (outputs to dist/)
npm run test         # Run Vitest tests once
npm run test:watch   # Run tests in watch mode
```

## Project Overview

EvairSIM H5 is a mobile-first web app for selling and managing eSIMs and physical SIM cards. Customers can purchase eSIM plans, activate physical SIMs, top up data, and manage their SIMs.

**Tech Stack:** Vite + React 19 + TypeScript, Tailwind CSS 4, Netlify (hosting + serverless functions), ESIMAccess API (eSIM supplier), Resend (email), react-i18next (en/zh/es)

## Architecture

### Mode Detection (App.tsx)
- `#admin` in URL hash → AdminApp (chat, notifications)
- `#api-test` in URL hash → ApiTestPage (API testing interface)
- Default → Customer-facing app

### API Client (services/api/)

**Core client** (`client.ts`):
- Token management via localStorage (`access_token`, `refresh_token`)
- Auto case conversion: camelCase (frontend) ↔ snake_case (backend)
- Pluggable interceptors: `addRequestInterceptor`, `addResponseInterceptor`, `addErrorInterceptor`
- Base URL: `VITE_API_BASE_URL` env var, defaults to `localhost:8801`

**Services**:
- `authService` — login, register, logout, token refresh, password reset
- `userService` — profile, password change, SIM binding/unbinding
- `orderService` — create/list/cancel orders, refunds, tracking
- `packageService` — package listings, hot packages, recharge options
- `esimService` — eSIM details, usage queries, top-up
- `paymentService` — payment sessions, coupon validation

**Error codes** (`types.ts`): 0=success, -1 to -7=general errors, 1000s=auth, 2000s=user, 4000s=orders, 5000s=payment

### Directory Structure

```
services/api/       — Backend API client (NEW architecture)
services/esimApi.ts — ESIMAccess API wrapper (legacy, for Netlify proxy)
services/supabase.ts — Supabase client (notifications, chat)
views/              — Page components (ShopView, MySimsView, ProfileView, etc.)
views/admin/        — Admin panel (AdminApp, AdminChat, AdminNotifications)
components/         — Reusable UI (BottomNav, BarcodeScanner, StatusBar)
hooks/              — useEdgeSwipeBack, useSwipeBack
netlify/functions/  — Serverless: esim-proxy.mjs, send-esim-email.mjs
i18n/               — Translation files (en.ts, zh.ts, es.ts)
```

## Business Logic

### eSIM Purchase Flow
1. Customer selects plan in ShopView
2. `orderEsim(packageCode)` creates order via ESIMAccess API
3. QR code + LPA string displayed in-app
4. Email sent via `send-esim-email.mjs` Netlify function (Resend API)

### Physical SIM Activation
1. Customer enters ICCID (18-22 digits) or scans barcode
2. `queryProfile(iccid)` validates against ESIMAccess API
3. `packageName` must start with "United States"/"USA"/"US "
4. Top-up uses same `topUp()` API as eSIM

### Top-up Plans
- Filtered to show 30/60/90/180 day plans only (1, 7, 15, 365 hidden)
- Pricing: ~100% markup rounded to retail (X.99)

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main routing, mode detection, global state |
| `services/api/client.ts` | Core API client with interceptors |
| `services/api/types.ts` | All backend API TypeScript types |
| `docs/BACKEND_API_SPEC.md` | Complete API documentation |

## UI/UX Conventions

- Brand color: `#FF6600` (`brand-orange` in Tailwind)
- Login modal: `fixed inset-0` positioning
- All sub-views support swipe-from-left-edge back gesture
- "BEST" ribbon on best-value plans
- Sample name placeholder: "John Smith"

## Deployment

- GitHub `main` branch → Netlify auto-deploy
- Site: `evair-h5.netlify.app`
- Environment variables set in Netlify dashboard: `ESIM_ACCESS_CODE`, `ESIM_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`

## Custom Vite Plugin

`vite-plugins/apiResponseCapture.ts` — Development-only plugin that captures API responses via WebSocket and saves to `docs/api-responses/` for documentation purposes.