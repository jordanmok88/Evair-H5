---
name: evair-h5-visual-layout
description: >-
  EvairSIM H5 (Vite/React/Tailwind) layout and UX. Use when changing marketing pages,
  /app shell, spacing, typography, imagery in /public, or mobile/desktop gates—not when
  only touching Laravel/Flutter repos.
---

# Evair H5 — visual layout and UX

Focused playbook for agents editing this repo’s UI. **`alwaysApply` rules** remain authoritative when they conflict — this skill is a shortcut checklist.

## Stack and brand

- **Stack:** Mobile-first Tailwind CSS; React 19 + Vite — see root [`CLAUDE.md`](../../CLAUDE.md).
- **Brand orange:** `#FF6600`; use **`brand-orange`** in Tailwind and the brand gradient **`linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)`** where gradients are already the pattern ([`product-decisions.mdc`](../rules/product-decisions.mdc)).

## Layout conventions

- **Headers:** Apply **`pt-safe`** for safe-area/top spacing consistency ([`project-overview.mdc`](../rules/project-overview.mdc), [`app.css`](../../app.css)).
- **Sub-views:** Swipe-from-left-edge back navigations remain the default UX pattern unless a specific view documents otherwise ([`project-overview.mdc`](../rules/project-overview.mdc)).

## Assets and imagery

- Static assets ship from **[`public/`](../../public/)** — reference root paths (`/evairsim-wordmark.png`, etc.).
- **Boot splash / wordmarks:** Prefer real RGBA **`/evairsim-wordmark.png`**; do **not** use JPEG renamed as `.png` (opaque/matte artefacts) ([`project-overview.mdc`](../rules/project-overview.mdc)).

## Marketing versus `/app` shell

- **Routing:** Respect [`shouldRenderMarketing` / `isAppPath`](../../utils/testMode.ts) splits — marketing paths vs **`/app/*`** functional shell ([`product-decisions.mdc`](../rules/product-decisions.mdc)).
- **Mobile / desktop gates:** **`MobileOnlyNotice`**, **`useMobileSignInGate`**, and shared ack keys (**`evair_desktop_signin_acked.v4`**) — do not regress ([`hooks/useMobileSignInGate.ts`](../../hooks/useMobileSignInGate.ts), [`components/marketing/MobileOnlyNotice.tsx`](../../components/marketing/MobileOnlyNotice.tsx); see [`jordan-chat-history.mdc`](../rules/jordan-chat-history.mdc)).

## i18n

- User-facing strings in the **customer app** use **`t()`** keys with **en / zh / es** ([`i18n/`](../../i18n/), [`business-context.mdc`](../rules/business-context.mdc)).
- **Marketing-only** surfaces may remain English-only when product docs explicitly allow — do not expand i18n there without Jordan’s OK.

## What this skill does *not* do

- **MCP servers** do not substitute for Tailwind/HTML/CSS edits here — implement layout directly in JSX.
- Laravel admin and Flutter **native screens** belong in their sibling repos; this skill scopes to **Evair-H5** tree only.
