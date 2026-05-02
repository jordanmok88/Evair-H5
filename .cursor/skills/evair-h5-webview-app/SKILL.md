---
name: evair-h5-webview-app
description: >-
  Evair Flutter WebView shell consuming this H5. Use when gestures, safe-area, deep
  links, or “works in Safari but not WebView” issues matter; defer native Dart work to EvairSIM-App.
---

# Evair H5 — WebView / Flutter shell parity

The **EvairSIM** native app is a **thin WebView** around this H5 codebase. Most feature work ships **here first**; Flutter changes are for shell, deep links, and native bridges.

## Load URL and entry

- **Production target:** Customer shell loads **`/app`** on **`evairdigital.com`** (not the raw Netlify host in production) — see [`project-overview.mdc`](../rules/project-overview.mdc) and [`product-decisions.mdc`](../rules/product-decisions.mdc) for `h5Url` / branch notes.
- **Test parity:** Hash **`#app-preview`** forces **“Evair APP”** document title behaviour in [`App.tsx`](../../App.tsx) — match WebView title expectations.

## Gestures and chrome

- **Swipe-back**, **safe-area (`pt-safe`)**, and **viewport** choices must remain tolerable inside **embedded WebViews** ([`hooks/useEdgeSwipeBack.ts`](../../hooks/useEdgeSwipeBack.ts), [`useSwipeBack`](../../hooks/useSwipeBack.ts) where used).
- If something works in mobile Safari **but breaks in the app WebView**, suspect **viewport, touch, overscroll, or storage** differences before changing Laravel.

## Contract with native and API

- **Auth / envelope / chat / refresh patterns:** [`docs/CROSS_PLATFORM_CONTRACT.md`](../../docs/CROSS_PLATFORM_CONTRACT.md) is source of truth for what crosses **H5 ↔ Flutter ↔ Laravel**.
- **Interceptor / token refresh:** [`services/api/client.ts`](../../services/api/client.ts) — keep `/v1/app/*` and legacy `/v1/h5/*` success-code handling aligned when touching auth-adjacent code.

## Sibling repo

- **Flutter project** (default local path **`~/Development/EvairSIM-App`**) owns **Dart, WKWebView/Chrome tabs, IAP shell** — **do not** implement native screens in H5 unless product explicitly pivots ([`business-decisions.mdc`](../rules/business-decisions.mdc)).
- This SKILL.md scopes to **Evair-H5**; open the Flutter workspace separately when Dart or store builds need edits.
