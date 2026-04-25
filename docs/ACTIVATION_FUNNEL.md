# Activation Funnel — Amazon → Top-up

> **Status**: design v2 · drafted 2026-04-25 · reconciled with China team's existing Laravel work · 7 strategic decisions locked in (see §11).
> **Naming note**: this used to be called "Phase 1" until we discovered the China team uses "Phase 1" for their Flutter→App API migration (`docs/api-integration-guide/phase1-supplier-package.md` in Laravel repo). Renamed 2026-04-25 to avoid doc/commit confusion. Internally we still treat this as the next major work block in our 0-5 phase plan, just without the colliding number.
> **Locked-in strategy**: see `.cursor/rules/product-decisions.mdc`. This funnel is the work the monthly top-up margin actually depends on. Do not add scope until it ships.

This document is the single source of truth across **all four repos**: Evair-H5 (React), Evair-Laravel (PHP API), admin (Vue), EvairSIM-App (Flutter wrapper). Each repo's section lists files to add/edit and the contract it depends on.

**Architectural pivot from the v1 draft of this doc**: the China team has built a `/v1/app/*` API tier in parallel with the legacy `/v1/h5/*` tier, with real Stripe payment, refund/dispute webhooks, a `sim_assets` table that's the canonical owned-SIM record, and a `SimResource` that already exposes `package_name`, `country_code`, `qr_code_url`, `usage_percent`, `is_low_data`, `is_expired`. Going forward, **all new endpoints land on the App tier**, and `auto_renew` columns live on `sim_assets` (not on the legacy `app_user_sims` pivot). Existing endpoints `GET /v1/app/.../esim/preview/{iccid}` (TBD location) and `POST /v1/app/users/bind-sim` are extended rather than duplicated.

---

## 1. The customer story (what this funnel does)

1. Customer buys an Evair physical SIM on Amazon.
2. Box has a printable sticker: `evairdigital.com/activate?iccid=8901xxxxxxxxxxxxxxx` (or a QR encoding the same URL).
3. They scan / type it on their phone, browser opens **`/activate`**.
4. Page reads the ICCID, looks it up server-side, shows: SIM type, bundled plan name, speed tier, GB cap, plan duration. **No login required to view this much.**
5. They click "Activate this SIM". Inline: email + password (or magic-link, see §Open questions). Account is created in one step, SIM is bound to the new account, an `auto_renew=on` flag is set with the bundled plan as the default renewal product.
6. The auto-renew opt-in checkbox is **pre-checked** by default with the disclosure copy from `AUTO_RENEW_DISCLOSURE.md` directly below it. Customer can uncheck before confirming.
7. After activation: redirect to `/app/my-sims?iccid=…` so they land directly on their newly-bound SIM tile inside the customer app shell.
8. Asynchronously: server fires welcome email (Resend) including a `/top-up?iccid=…` link.
9. Three lifecycle reminders fire automatically:
   - **80% of bundled GB used** → "running low" email + push
   - **3 days before plan expiry** → "renews in 3 days" email + push (only if auto-renew on)
   - **On renewal attempt** → success or failure email
10. If `auto_renew=off`, day-of-expiry email reads "your SIM ran out — top up here" with the same `/top-up?iccid=…` link.

**Business pivot point**: even if they uncheck auto-renew at activation, the `/top-up` flow gets their email captured during activation and a clean re-engagement path. This is the entire reason this funnel ships before any homepage redesign.

---

## 2. Architecture — path-based routing

The H5 app currently has **no real router** (see scouting report). It's `App.tsx` switching `Tab` enum values and view modes inside `ProductTab.tsx`. Phase 0 introduced path-based forking (`isAppPath()`, `shouldRenderMarketing()`).

This funnel extends that pattern instead of introducing React Router today. We add **`getRoute()`** in `utils/testMode.ts` (or new `utils/routing.ts`) returning a discriminated union:

```typescript
type Route =
  | { kind: 'marketing' }            // /, /about, /blog/* (Phase 3+ only)
  | { kind: 'app' }                  // /app, /app/my-sims, /app/profile, etc.
  | { kind: 'activate'; iccid: string | null }   // /activate?iccid=…
  | { kind: 'topup'; iccid: string | null }      // /top-up?iccid=…
  | { kind: 'unknown' };
```

`App.tsx` reads the route at mount, picks the top-level component:

- `marketing` → marketing placeholder (Phase 3)
- `app` → existing customer app (current default)
- `activate` → new `<ActivatePage iccid={…} />`
- `topup` → new `<TopUpPage iccid={…} />`
- `unknown` → existing customer app (forgiving fallback)

This keeps the change surgical: zero changes to existing `Tab` / `viewMode` plumbing, no router migration, deep links work because Netlify already does SPA fallback (`/* → /index.html`).

**Why not React Router yet?** It's a Phase 2 task when real marketing routes land (`/usa`, `/devices/router`, `/blog/*`). Adding it for two routes today is busywork.

---

## 3. Evair-H5 deliverables

### 3.1 New files

| File | Purpose |
|---|---|
| `utils/routing.ts` | `getRoute()` parser, exports `Route` type |
| `pages/ActivatePage.tsx` | `/activate?iccid=…` UI |
| `pages/ActivatePage.css` (or Tailwind) | styles |
| `pages/TopUpPage.tsx` | `/top-up?iccid=…` UI |
| `services/api/activation.ts` | thin wrapper for new Laravel endpoints |
| `components/AutoRenewToggle.tsx` | reusable toggle with disclosure popover |

### 3.2 Files to edit

| File | Change |
|---|---|
| `App.tsx` | Replace top-level rendering with `switch (route.kind)`. Keep current customer-app render path unchanged for `app` and `unknown`. |
| `views/MySimsView.tsx` | Add `<AutoRenewToggle />` per SIM card. Wire to existing list re-fetch. Polish usage bar: pull `auto_renew` + next-charge-date from new resource fields. |
| `services/api/types.ts` | Add `autoRenew`, `autoRenewPackageId`, `nextChargeAt` to `UserSim` shape. |
| `services/api/esim.ts` (or new `sims.ts`) | Add `previewByIccid` (public, hits `GET /v1/app/sims/preview/{iccid}`), reuse existing `bindSim` for the claim step (now passes `auto_renew` + `stripe_payment_method_id`), add `setAutoRenew` (`PATCH /v1/app/sims/{iccid}/auto-renew`). |
| `i18n/en.ts` / `zh.ts` / `es.ts` | New `activation.*`, `topup.*`, `autoRenew.*` keys. |
| `utils/testMode.ts` | (Optional) move `isAppPath()` next to `getRoute()` — keep both exports for backwards compat. |

### 3.3 ActivatePage UX (wireframe)

```
┌──────────────────────────────────┐
│  Evair logo · "Activate your SIM"│
├──────────────────────────────────┤
│  ICCID: 89014103211118510720     │
│  ┌────────────────────────────┐  │
│  │ 📶  Phone & Tablet · 5G    │  │
│  │     Up to 650 Mbps         │  │
│  │     9 GB included          │  │
│  │     30 days from activation│  │
│  └────────────────────────────┘  │
│                                  │
│  Email   [_________________]     │
│  Password[_________________]     │
│                                  │
│  ☑ Auto-renew at $X/month after  │
│    your first 30 days. Cancel    │
│    anytime in My SIMs. [Details] │
│                                  │
│        ┌────────────────┐        │
│        │  Activate now  │        │
│        └────────────────┘        │
│                                  │
│  Already have an account? Log in │
└──────────────────────────────────┘
```

**Empty / error states** (must all be designed, not afterthoughts):

- ICCID query param missing → "Scan or enter your ICCID" with a barcode-scanner button (we already have `BarcodeScanner.tsx`)
- ICCID not found in our DB → "We can't find this SIM. It may not be from Evair. Contact support: service@evairdigital.com"
- ICCID found but already bound to another account → "This SIM is already activated. If it's yours, log in. If not, contact support."
- ICCID found and bound to the **current logged-in user** → straight redirect to `/app/my-sims?iccid=…` (idempotent re-scan)
- ICCID found but in `pending` / `inventory` state (still in Amazon warehouse) → "This SIM hasn't shipped yet. Try again after delivery."

### 3.4 TopUpPage UX

Browse-without-login is the rule. Layout:

```
ICCID summary (read-only) · current GB left · expiry date
↓
List of recharge plans (server-side filtered by supplier_type)
↓
Click "Top up $X" → if not logged in, inline email/password modal → Stripe checkout
```

Re-uses `StripePaymentModal` and `fetchTopUpPackages` from `MySimsView`. Difference is no login required to **view** the catalogue and the page is reachable from email links without the customer having to remember their app credentials.

### 3.5 Auto-renew toggle on `/app/my-sims`

Existing SIM card → add row above the action buttons:

```
Auto-renew    [●━━━━]  ON   ⓘ
Renews 9 GB · $X · in 17 days
```

Tapping the info `ⓘ` opens an `el-drawer`-equivalent (or full bottom sheet on mobile) showing the disclosure copy from `AUTO_RENEW_DISCLOSURE.md` rendered through i18n.

Tapping the toggle off opens a confirm sheet:

```
Cancel auto-renew?
You'll keep your current data until [date]. We won't charge again
unless you turn it back on. Cancel anytime by toggling it on.
[Keep auto-renew] [Yes, cancel]
```

The "Yes, cancel" CTA fires `PATCH /h5/sims/{iccid}/auto-renew` with `{ autoRenew: false, reason: 'user_initiated' }`. Confirmation email follows (legally required).

### 3.6 Path-based title + analytics

Extend the existing `applyTitle` `useEffect` in `App.tsx`:

| Path | document.title |
|---|---|
| `/` | `Evair — Premium 5G eSIM & SIM Cards` (Phase 3) |
| `/app/*` | `Evair APP` (existing) |
| `/activate*` | `Activate your Evair SIM` |
| `/top-up*` | `Top up your Evair SIM` |

---

## 4. Evair-Laravel deliverables

> **Reconciled with what already exists** (commits up to `f96d4e49`, fetched 2026-04-25 11:48 PT).
> The China team's parallel `/v1/app/*` tier already provides: real Stripe via `PaymentController` + `RechargeController` + `OrderPaymentService`, refund/dispute/checkout-expired webhook handlers in `StripePaymentService`, a polished `App\Http\Resources\App\SimResource` with `package_name` / `country_code` / `qr_code_url` / `usage_percent` / `is_low_data` / `is_expired`, and `POST /v1/app/users/bind-sim` that already accepts an `activation_code` validated against `SimAsset.matching_id`. We **extend** this surface, we don't duplicate it.

### 4.1 Canonical bound-SIM table

The owned-SIM source of truth is **`sim_assets`** (migration `2026_03_12_100004_create_sim_assets_table.php`):

```
sim_assets
  id                    pk
  iccid                 unique
  user_id               fk → app_users (nullable while INVENTORY)
  tenant_id             fk → tenants (nullable)
  supplier_type         'esimaccess' | 'pccw'
  status                'INVENTORY' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED'
  lpa_code, smdp_address, matching_id    eSIM only
  total_bytes, used_bytes
  activated_at, expired_at
  provisioned_order_id  fk → orders (the order that spawned the asset)
  current_package_id    supplier-side package id
  metadata              json
  timestamps + softDeletes
```

Auto-renew columns add to `sim_assets`, not the legacy `app_user_sims` pivot. (`app_user_sims` predates `sim_assets`; new code targets `sim_assets`.)

### 4.2 Schema migration

```php
// database/migrations/2026_04_25_xxxxxx_add_auto_renew_to_sim_assets.php
Schema::table('sim_assets', function (Blueprint $table) {
    $table->boolean('auto_renew')->default(false)->after('current_package_id');
    $table->string('auto_renew_package_id')->nullable()->after('auto_renew')
        ->comment('supplier-side package id to top up with on renewal');
    $table->timestamp('auto_renew_next_charge_at')->nullable()->after('auto_renew_package_id');
    $table->timestamp('auto_renew_disabled_at')->nullable()->after('auto_renew_next_charge_at');
    $table->string('auto_renew_disabled_reason', 64)->nullable()->after('auto_renew_disabled_at')
        ->comment('user_cancelled | payment_failed | cs_force_off | terms_change');
    $table->string('auto_renew_payment_method_id')->nullable()->after('auto_renew_disabled_reason')
        ->comment('Stripe pm_... saved at activation via SetupIntent');
    $table->index(['auto_renew', 'auto_renew_next_charge_at'], 'idx_sim_assets_renewal_due');
});
```

The composite index lets the renewal job efficiently pick `WHERE auto_renew = 1 AND auto_renew_next_charge_at <= NOW() AND status = 'ACTIVE'`.

### 4.3 Endpoints — extend, don't duplicate

| Action | Endpoint | Strategy |
|---|---|---|
| Public ICCID lookup for `/activate` | `GET /v1/app/sims/preview/{iccid}` (new public route, mirrors what `H5/EsimController::preview` does) | New thin controller method on `App\Http\Controllers\Api\App\PublicSimController` (created if not present). Returns supplier-aware preview + `claim_state`. |
| Claim a scanned SIM | `POST /v1/app/users/bind-sim` (existing) — extend payload | Add optional `auto_renew: bool` and `auto_renew_payment_method_id: string\|null` fields. Existing `iccid` + `activation_code` validation against `SimAsset.matching_id` is reused. |
| Toggle auto-renew | `PATCH /v1/app/sims/{iccid}/auto-renew` (new) | Calls `SimSubscriptionService::updateAutoRenew(simAsset, on, reason, paymentMethodId)`. |
| Top-up by ICCID | `POST /v1/app/recharge` (existing) | Already real-Stripe and polished. Public `/top-up?iccid=…` page hits this after login at checkout. |

```php
// routes/v1/app/public.php — additions
Route::get('/sims/preview/{iccid}', [PublicSimController::class, 'preview']);

// routes/v1/app/protected.php — additions
Route::patch('/sims/{iccid}/auto-renew', [SimController::class, 'updateAutoRenew']);
```

`bind-sim` route stays untouched — only the `BindSimRequest` validation rules and `AppUserController::bindSim` body grow to handle the new optional fields.

### 4.4 `preview` response shape (public, no auth)

Intentionally minimal — no PII:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "iccid": "89014103211118510720",
    "claim_state": "available",
    "package": {
      "name": "Evair 9GB · 30d · 5G",
      "speed_tier": "phone_5g",
      "speed_label": "Up to 650 Mbps",
      "volume_gb": 9,
      "duration_days": 30,
      "bundled_with_amazon": true
    },
    "renew_price_cents": 1999,
    "renew_currency": "USD"
  }
}
```

> **Confidentiality:** supplier identity (PCCW, eSIM Access, etc.) is never exposed on public endpoints. Internal/admin surfaces keep `supplier_type` for routing, but consumer-facing payloads omit it entirely.

`claim_state` enum derives from `sim_assets.status` + `user_id`:

| `claim_state` | Derivation |
|---|---|
| `available` | `status = INVENTORY` OR (`status = ACTIVE` AND `user_id IS NULL`) |
| `claimed_by_self` | authenticated request and `user_id = current.id` |
| `claimed_by_other` | `user_id IS NOT NULL` AND not self |
| `not_found` | no `sim_assets` row, no `sims` row |
| `pending_shipment` | `sims` row exists but no `sim_assets` yet (Amazon batch in transit) |

H5 page branches on this directly.

### 4.5 New scheduled job

`App\Jobs\Renewal\RenewExpiringSims` invoked from `app/Console/Kernel.php` every hour. Picks bindings where `auto_renew = 1 AND auto_renew_next_charge_at <= NOW() AND status = 'ACTIVE'`, calls Stripe with the saved `auto_renew_payment_method_id` (off-session PaymentIntent), on success extends the bundled plan via the supplier adapter (`PccwAdapter::topup()` for PCCW, eSIM Access equivalent for esimaccess), bumps `auto_renew_next_charge_at`, and dispatches `AutoRenewSuccessMail`. On failure: retry once after 24h (per Jordan's Q4 decision), then auto-disable with `auto_renew_disabled_reason = 'payment_failed'`, dispatch `AutoRenewFailedMail` and (after 24h grace) suspend the SIM.

### 4.6 Mail classes (Resend)

`config/mail.php` already preconfigures the `resend` transport. Switch `MAIL_MAILER=resend` in production env. From-address per Jordan's Q5 decision: `noreply@send.evairdigital.com` (Amazon SES is on this subdomain — but Resend can co-exist if we add Resend DKIM under a distinct selector, OR we bring all transactional onto Resend and leave SES for marketing). **Action item**: confirm with Jordan whether to keep SES on `send.` and put Resend on a different subdomain like `mail.evairdigital.com`, or migrate all transactional to Resend on `send.`.

| Class | Trigger |
|---|---|
| `App\Mail\Sim\ActivationWelcomeMail` | After `bind-sim` claim succeeds |
| `App\Mail\Sim\UsageAlertMail` | `used_bytes / total_bytes >= 0.8` (scheduled hourly) |
| `App\Mail\Sim\ExpirySoonMail` | `expired_at - now <= 3 days` |
| `App\Mail\Sim\AutoRenewSuccessMail` | After `RenewExpiringSims` succeeds for that asset |
| `App\Mail\Sim\AutoRenewFailedMail` | After `RenewExpiringSims` exhausts retries |
| `App\Mail\Sim\AutoRenewCancelledMail` | After `updateAutoRenew(false)` — legal requirement (ROSCA / SB-313 cancellation confirmation) |

Templates in `resources/views/emails/sim/*.blade.php`. Marketing emails get an unsubscribe link; transactional do not (CAN-SPAM allows transactional without opt-out). Every template includes a magic re-auth deep link to `/top-up?iccid=…` and `/app/my-sims`.

### 4.7 Existing `EmailController` stubs

Both `H5/EmailController` and `App/EmailController` (the latter added 2026-04-23 for Phase 0C parity) currently log-only. We migrate the production triggers to **scheduled jobs that call `Mail::send()` directly** rather than going through these controllers. The controller endpoints stay for backward compat / ad-hoc resend, but the source of truth for usage/expiry/renewal alerts is the scheduled jobs.

### 4.8 SIM resource — no new fields needed

`App\Http\Resources\App\SimResource` already exposes the keys the H5 my-sims page needs (`package_name`, `country_code`, `qr_code_url`, `usage_percent`, `total_display`, `is_low_data`, `is_expired`). For the auto-renew toggle, add three keys to that resource:

```php
// SimResource::toArray additions
'auto_renew'                 => (bool) $this->auto_renew,
'auto_renew_next_charge_at'  => optional($this->auto_renew_next_charge_at)->toIso8601String(),
'auto_renew_disabled_reason' => $this->auto_renew_disabled_reason,
```

`SimUsageResource` does not need changes — it's used for the `/sims/{iccid}/usage` polling endpoint and auto-renew is binding-scoped, not usage-scoped.

---

## 5. admin (Vue) deliverables

### 5.1 New columns on `views/sim/index.vue`

Add to the existing SIM list `ProTable`:

| Column | Backend source |
|---|---|
| `claimedBy` | `app_user.email` via existing `app_user_sims` join |
| `autoRenew` | new pivot column, render as Element Plus `<el-tag>` (green/grey) |
| `autoRenewNextCharge` | formatted date |

### 5.2 New filters

- `claim_state`: `unclaimed` | `claimed` | `all` (default `all`)
- `auto_renew`: `on` | `off` | `all`

These hit a new admin endpoint `GET /v1/admin/sims` query params. Backend route + controller is the second half of this work — `app/Http/Controllers/Api/Admin/SimController.php` already has `index`; just extend.

### 5.3 Force-off auto-renew (CS / ROSCA)

New row action button on `sim/index.vue` operations column:

```vue
<el-button
  v-auth="'sim:force_disable_autorenew'"
  type="warning"
  size="small"
  @click="confirmForceDisableAutoRenew(row)"
>
  {{ $t('sim.forceDisableAutoRenew') }}
</el-button>
```

`confirmForceDisableAutoRenew` opens `ElMessageBox.confirm` with the ROSCA-required disclosure (CS rep about to cancel a paid subscription on customer's behalf):

```
Disable auto-renew for ICCID 89...20?
- Customer will be charged through their current cycle ending [date]
- No future charges will be made
- A cancellation confirmation email will be sent to [email] (legally required)
- This action is logged with your CS user ID for audit

Reason for cancellation: [textarea, required]

[Cancel] [Disable auto-renew]
```

Backing endpoint: `PATCH /v1/admin/sims/{iccid}/auto-renew` body `{ auto_renew: false, reason: 'cs_initiated', cs_note: '<textarea content>' }`. The Laravel handler logs the actor (admin user ID), reason, and note — required for audit if a customer disputes the cancellation later.

### 5.4 Email log table (net-new page)

New menu under **客服管理 (`/h5admin`)**: "邮件日志 / Email log".

Columns:
- Sent at, recipient email, mail class (e.g. `AutoRenewSuccessMail`), Resend message ID, delivery status (sent/delivered/bounced/failed), related SIM ICCID, related user.

Backend: new table `transactional_email_logs` populated by a Laravel `MessageSent` event listener. Resend's webhook (`/v1/webhooks/resend`) updates `delivery_status`. Standard ProTable + Pinia pattern.

### 5.5 i18n

New keys under `sim.*` and a new `emailLog.*` module in both `src/languages/modules/zh.ts` and `en.ts`.

### 5.6 Permissions

Add `sim:force_disable_autorenew` button key to the admin permission matrix (super admin + dedicated CS role only — not regular B2B customer accounts).

---

## 6. EvairSIM-App (Flutter) deliverables

**Already shipped** (this commit, 2026-04-25):

- `lib/core/constants/app_constants.dart` `h5Url` default → `https://evairdigital.com/app`.

That's all the Flutter side needs from this funnel — every new flow (`/activate`, `/top-up`, auto-renew toggle) is already reachable through the WebView since the H5 app handles routing. No native code changes.

**Note**: The native app currently boots straight into `/app`. Activation/top-up happen in the browser (from Amazon box QR). After activation the customer downloads the app from App Store / Play, opens it, logs in with the email/password they created during activation, and lands on My SIMs with their freshly-activated SIM tile. No deep linking required.

**Cross-link with China team's plan**: their `docs/plans/2026-04-22-flutter-app-implementation-plan.md` §10 plans to migrate Flutter from H5 endpoints to App endpoints. Since Jordan's April WebView pivot, that migration is mostly moot for our customer surface (the H5 site is what runs inside the WebView), but the App API improvements they made (real Stripe, `SimResource` polish, `bind-sim` activation_code support) are exactly what this funnel needs. We benefit either way.

---

## 7. API contract (frozen for this phase)

> Tier: **App namespace `/v1/app/*`** (auth:app). Reuses the China team's existing endpoints where possible, adds two new ones.

### 7.1 `GET /v1/app/sims/preview/{iccid}` — public (NEW)

```json
// 200 OK — envelope follows Laravel app-tier convention {code, msg, data}
{
  "code": 0,
  "msg": "success",
  "data": {
    "iccid": "89014103211118510720",
    "claim_state": "available" | "claimed_by_self" | "claimed_by_other" | "pending_shipment" | "not_found",
    "package": {
      "name": "Evair 9GB · 30d · 5G",
      "speed_tier": "phone_5g" | "camera_bundled" | "camera_topup" | "iot_low",
      "speed_label": "Up to 650 Mbps",
      "volume_gb": 9,
      "duration_days": 30,
      "bundled_with_amazon": true
    },
    "renew_price_cents": 1999,
    "renew_currency": "USD"
  }
}
```

If `claim_state = not_found`: returns `404` with `{ "code": "NOT_FOUND_001", "msg": "iccid_not_found" }`. No PII exposed regardless of authentication state.

### 7.2 `POST /v1/app/users/bind-sim` — auth:app (EXISTING — extended)

The endpoint already validates `iccid` and an optional `activation_code` against `SimAsset.matching_id`. We add three optional fields:

```json
// request — Amazon box flow (auto-renew opt-in)
{
  "iccid": "89014103211118510720",
  "activation_code": "ABC123",          // optional; from box QR or printed insert
  "auto_renew": true,                   // NEW
  "auto_renew_package_id": 17,          // NEW — supplier package id
  "stripe_payment_method_id": "pm_..."  // NEW — required when auto_renew=true (saved via SetupIntent at activation)
}

// 200 OK
{
  "code": 0,
  "msg": "success",
  "data": {
    "sim_asset_id": 4521,
    "iccid": "89014103211118510720",
    "status": "ACTIVE",
    "auto_renew": true,
    "auto_renew_next_charge_at": "2026-05-25T00:00:00Z",
    "redirect_to": "/app/my-sims?iccid=89014103211118510720"
  }
}
```

Errors: `409 sim_already_claimed` (`SIM_ALREADY_CLAIMED`), `400 stripe_pm_required_for_autorenew` (`AUTORENEW_PM_REQUIRED`), `404 iccid_not_found` (`NOT_FOUND_001`).

### 7.3 `PATCH /v1/app/sims/{iccid}/auto-renew` — auth:app (NEW)

```json
// request — turn on
{
  "auto_renew": true,
  "auto_renew_package_id": 17,
  "stripe_payment_method_id": "pm_1234..."
}

// request — turn off
{
  "auto_renew": false,
  "reason": "user_initiated"   // or "cs_initiated"; "payment_failed" only set by RenewExpiringSims job
}

// 200 OK — returns the updated SimResource (auto_renew + auto_renew_next_charge_at + auto_renew_disabled_reason)
```

Backend dispatches `AutoRenewCancelledMail` / `AutoRenewSuccessMail` after every state transition (legal requirement: cancellation confirmation must be sent — see `docs/AUTO_RENEW_DISCLOSURE.md`).

### 7.4 `POST /v1/app/recharge` — auth:app (EXISTING — used as-is for /top-up flow)

Already real-Stripe and polished. Public `/top-up?iccid=…` page hits this after the customer logs in at checkout. No backend changes required.

### 7.5 H5-tier endpoints we keep using read-only

The H5 my-sims page currently calls `/v1/h5/user/sims` and `/v1/h5/esim/{iccid}/usage`. This funnel leaves those calls in place. The China team's `flutter-app-implementation-plan.md` §10 marks the App-tier equivalents (`/v1/app/sims`, `/v1/app/sims/{iccid}/usage`) as P1 migrations whose response shapes are now compatible — once they migrate Flutter, we'll switch the H5 page over too. No urgency now; it's a hot-swap when Flutter does theirs.

---

## 8. Strategic decisions (locked 2026-04-25)

| # | Question | Jordan's call | Implication |
|---|---|---|---|
| 1 | Auth on `/activate` | **Email + password mandatory** | Stripe-compatible, lets customer log into native app later |
| 2 | Stripe at activation | **SetupIntent** (save card, $0 charged) | No decline risk on a free claim; charge at first renewal |
| 3 | Billing clock start | **Bundled period day 1 = activation day 1**, first charge 30 days later | Customer-friendly; needs PCCW supplier-contract verification |
| 4 | Renewal payment failure | **24h grace + 1 retry, then suspend** | Implemented in `RenewExpiringSims` retry policy |
| 5 | Transactional email from-address | **Subdomain** (`send.evairdigital.com` or `mail.evairdigital.com`) | DNS records to verify with Resend; resolve SES coexistence (see §4.6) |
| 6 | Marketing opt-in checkbox | **Separate, unchecked** ("Yes, send me Evair travel deals") | Clean transactional/marketing split for CAN-SPAM compliance |
| 7 | CS cancellation audit retention | **7 years** | Belt-and-suspenders for CCPA/ROSCA; storage cost is trivial |

One follow-up open item from §4.6: confirm Resend vs SES subdomain split — Amazon SES is currently authoritative for `send.evairdigital.com`. Either we move all transactional to Resend on `send.` (and let SES go), or we put Resend on a different subdomain like `mail.evairdigital.com`. Defer until we wire the first mail class.

---

## 9. Ship sequence (the order I'll build)

> Reconciled with what the China team has already shipped. Steps 1-2 are **smaller** than the v1 plan because Stripe + bind-sim + recharge are already real.

1. **Laravel schema migration on `sim_assets`** (auto-renew columns + index) + `SimAsset` model accessor/cast updates + `SimResource` 3-key extension. One migration, one model edit, one resource edit.
2. **Laravel endpoints**:
   - New `GET /v1/app/sims/preview/{iccid}` (public) — claim_state + supplier-aware preview.
   - Extend `POST /v1/app/users/bind-sim` (+ `BindSimRequest`) with `auto_renew` / `auto_renew_package_id` / `stripe_payment_method_id`.
   - New `PATCH /v1/app/sims/{iccid}/auto-renew` — toggle + reason logging + `AutoRenewCancelledMail` / `AutoRenewSuccessMail`.
3. **Resend wiring** (`MAIL_MAILER=resend`) + 6 Mail classes + DNS records for the chosen subdomain.
4. **H5 routing + ActivatePage** (preview → email/pw signup → SetupIntent → bind-sim → redirect to `/app/my-sims`). End-to-end before TopUpPage.
5. **H5 TopUpPage** (public catalogue, login at checkout, hits `POST /v1/app/recharge`). Reuses 80% of existing top-up modal.
6. **H5 auto-renew toggle** on `/app/my-sims` with disclosure popover and confirm-cancel flow.
7. **`RenewExpiringSims` scheduled job** + smoke-test against PCCW staging with a 1-minute `auto_renew_next_charge_at`.
8. **admin extensions**: claimed-by + auto-renew columns on `views/sim/index.vue`, force-off button + ROSCA confirm modal, `unclaimed-Amazon-SIMs` filter.
9. **admin email log page** + Resend webhook receiver (`POST /v1/webhooks/resend`).
10. **i18n sweep** (en/zh/es).
11. **`docs/AUTO_RENEW_DISCLOSURE.md`** finalized + linked from H5 disclosure popovers and admin force-off modal.
12. **Memory + commits + save-all.sh** across all four repos.

Each step is its own commit. Steps 1-3 land Laravel-side as a single PR for the China team to review.

---

## 10. Out of scope (do not build in this phase)

- Marketing homepage (Phase 3)
- Country / device SEO pages (Phase 2)
- In-app physical SIM checkout (Phase 5 — for now Amazon stays the only physical-SIM purchase channel)
- Multi-language email templates (English only for v1; zh/es when we have multilingual customer demand)
- Apple/Google Pay buttons on top-up (Stripe checkout already handles them via Payment Element — no extra work needed)
- Web push for the activate/top-up flows (we already have FCM via the native app, that's enough)
- Gift / promo coupons on auto-renew (deliberately holding to keep ROSCA disclosure simple in v1)
