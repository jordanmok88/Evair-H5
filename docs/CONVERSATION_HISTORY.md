# Evair H5 — Development Conversation History

> Last updated: May 4, 2026 — Cursor session backup (support + marketing header UX)
>
> **Flutter successor app**: A native mobile app (EvairSIM, Flutter 3.38) has been started to replace this H5.
> Full Flutter history lives at `~/Development/EvairSIM-App/docs/CONVERSATION_HISTORY.md`.
> Flutter repo: https://github.com/jordanmok88/EvairSIM-App (`main`)
> See "Flutter Transition" section at the bottom of this file.

---

## Session Overview

This document captures the full development history of the Evair H5 project across multiple Cursor AI sessions.

---

## 1. Project Setup & Preview

- Set up Vite + React dev server for local preview
- Configured `?testmode=1` for test/demo mode (no real payments or supplier orders)
- Verified Cursor browser preview matches Netlify deployment

## 2. Shop View — UI/UX Redesign

### Data Formatting
- Fixed data allowance display: values < 1GB now show in MB (rounded up)
- Fixed `formatGB`, `formatVolume`, `formatPrice` utilities

### My eSIM Section
- Purchases now persist across refresh (localStorage in demo mode)
- "+" button navigates correctly between eSIM purchase and physical SIM scan
- Improved My eSIMs visibility with stacked country flags

### Shop Layout Reorganization
- Split browse modes into **Single Country** (1 SIM = 1 Country) and **Multi-Country** (1 SIM = Many Countries)
- Added subtitle capitalization fix (e.g., "1 SIM = 1 Country")
- Popular destination countries shown first (based on US traveler data: Mexico, Canada, UK, Japan, etc.)
- Regional eSIMs grouped under Multi-Country tab
- Full visual refresh: gradient hero, category cards, search, country flags

### SIM Card vs eSIM Toggle
- Prominent toggle between Physical SIM Card and eSIM sections
- Currently only US physical SIM cards sold; eSIMs available for all countries

## 3. Physical SIM Card — Full Flow Design

### Delivery Tracking
- In-app purchase shows estimated delivery (3-5 business days)
- "Track My Order" button navigates to tracking tab with pre-filled info
- Tracking tab with carrier integration placeholder
- Status badges: Pending → Shipped → Delivered → Active

### Activation / Binding Flow (eUICC)

#### Technical Background
- Uses **eUICC** technology: Red Tea eSIM profiles stored in physical SIM cards
- Factory (CSM) pre-writes profiles in **disabled state**
- H5 web app **cannot directly call LPA** to enable eSIM profiles
- Red Tea's billing starts 30-day timer when profile is enabled (problematic for shipping delays)

#### Evolution of Activation Strategy
1. **Initial attempt**: Multi-step guided wizard (Scan ICCID → Verify → Guide Enable → Done)
2. **Problem discovered**: H5 can't access eUICC hardware; manual enable is clunky
3. **STK approach**: Explored but rejected (STK requires Java Card applets, complex)
4. **Factory pre-enable**: Rejected (plan timer starts too early, validity lost during shipping)
5. **Final decision**: Push Red Tea to implement **"charge on first data use"** billing model
6. **Current interim solution**: Simplified to **3-step binding flow** (Scan → Confirm → Done)
   - Profiles are pre-enabled by factory
   - Activation only binds customer info to the SIM card
   - Login required before binding

#### Future Plans
- Native Android app with LPA integration (using OpenEUICC/EasyEUICC reference)
- CSM to pre-write app signing certificate hash into eUICC chip's ARA-M access rules
- OMAPI integration for direct profile management

### Physical SIM UX Polish
- NEW status physical SIMs show data usage donut (not stepper)
- Green "Insert your SIM card" reminder banner
- "Ready" badge instead of generic status
- Back navigation from My SIMs to Shop

## 4. Backend API Integration Hooks (留口子)

### Problem
- Supplier API (Red Tea/eSIMAccess): 2,489 packages, 207 countries
- Backend API (`evair.zhhwxt.cn`): Only 15 packages initially
- Need seamless switch when backend catches up

### Solution: Unified Data Service Layer
- Created `services/dataService.ts` as abstraction layer
- All components import from `dataService` instead of `esimApi` directly
- Backend API client in `services/api/esim.ts` with endpoint placeholders
- Single config flag to switch between supplier and backend APIs
- Components updated: `ShopView`, `MySimsView`, `ECardView`, `App.tsx`

### Backend Team Instructions (Chinese)
- Provided detailed sync requirements for Chinese IT staff
- Price format: cents (分), volume: bytes, add `duration` + `duration_unit` fields
- Need to sync all 2,489 packages from supplier

## 5. Navigation & UX Fixes

### Bottom Navigation Bar
- Implemented then **removed** — user found it blocked too much screen area
- Reverted to top SIM Card / eSIM toggle

### Contact Us / Inbox Back Navigation Bug
- Bug: Back button from Contact Us or Inbox always went to SIM tab
- Fix: Added `previousTab` ref in `App.tsx` to store origin tab before navigation
- Back now correctly returns to Profile (or wherever user came from)

### Login Before Binding
- Added auth gate in `PhysicalSimSetupView` CONFIRM step
- If not logged in: shows amber warning + "Sign in" button opens login modal
- If logged in: proceeds with binding
- Props passed through `ProductTab.tsx`

## 6. Profile View Polish

### Share with Friends
- Uses Web Share API (`navigator.share`) on mobile — works with WhatsApp, iMessage, etc.
- Share URL: `https://evairdigital.com`
- Desktop fallback: copies to clipboard + shows "Link copied!" toast
- Note: Which apps appear in iOS share sheet is controlled by iOS settings, not our code
- WeChat must be enabled in iOS share sheet settings to appear

### Rate App
- Replaced hardcoded English toast with interactive star rating popup
- 5 tappable stars with amber fill animation
- Submit button with brand gradient (disabled until stars selected)
- Thank-you confirmation with "App Store rating will be available soon"
- Rating stored in `localStorage` (`evair-app-rating`) — pre-fills on re-open
- "Update Rating" text shown if previously rated

### i18n (Internationalization)
- All strings translated in 3 languages: English, Chinese (zh), Spanish (es)
- Using `react-i18next`
- Added ~60+ translation keys across all features

## 7. UX Audit Findings (Implemented)

- eSIM install prompt improvements
- Register flow: "Account Created" confirmation before modal close
- Profile menu wiring: Account Info, Orders, Currency, Languages, More Info
- Help Center, About, Terms, Privacy, Refund, Acceptable Use, Cookie Policy pages
- Delete Account functionality
- Swipe-back gesture support (`useSwipeBack`, `useEdgeSwipeBack`)

## 8. Deployment & Version Control

### Git
- Repository: `github.com:jordanmok88/Evair-H5.git`
- Main branch: `main` (production on Netlify)
- Feature branch: `feature/api-integration`
- Branch deploy URL: `https://feature-api-integration--evair-h5.netlify.app`
- Production URL: `https://evair-h5.netlify.app`
- Test mode: append `?testmode=1`

### iCloud Backup
- Synced via `rsync` to `~/Library/Mobile Documents/com~apple~CloudDocs/Evair-H5-Backup/`
- Excludes: `node_modules`, `.git`, `dist`

### Netlify
- Auto-deploys from GitHub
- Branch deploys enabled for feature branches
- Main branch = production deploy

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, global state, tab navigation |
| `views/ShopView.tsx` | Product browsing (countries, regions, plans) |
| `views/MySimsView.tsx` | User's purchased SIMs display |
| `views/ProductTab.tsx` | Tab management, view mode switching |
| `views/PhysicalSimSetupView.tsx` | SIM binding flow (Scan → Confirm → Done) |
| `views/ProfileView.tsx` | User profile, settings, share, rate |
| `views/ECardView.tsx` | eSIM card details |
| `views/LoginModal.tsx` | Login and registration |
| `views/ContactUsView.tsx` | AI-powered support chat |
| `views/InboxView.tsx` | Notifications inbox |
| `services/dataService.ts` | Unified API abstraction layer |
| `services/esimApi.ts` | Supplier API (Red Tea) client |
| `services/api/esim.ts` | Backend API client (placeholder) |
| `types.ts` | TypeScript interfaces |
| `i18n/en.ts` | English translations |
| `i18n/zh.ts` | Chinese translations |
| `i18n/es.ts` | Spanish translations |
| `vite.config.ts` | Dev server, proxy, build config |

---

## Technical Stack

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **i18n**: react-i18next
- **Deployment**: Netlify (auto-deploy from GitHub)
- **Icons**: Lucide React
- **State**: React hooks (useState, useEffect, useRef, useCallback)
- **Storage**: localStorage (demo purchases, ratings, preferences)
- **APIs**: Red Tea/eSIMAccess (supplier), custom backend (in development)

---

## 9. Session — March 27, 2026

### Delete SIM Fix
- "Unknown error" appeared when deleting demo/test SIMs because `unbindSim()` calls the backend API which doesn't have these SIMs
- Fix: Delete now proceeds with local removal even if the API call fails
- Backend unbind will work when real SIMs are on the backend

### Navigation Persistence on Refresh
- Problem: Pull-to-refresh on mobile reset the app to the SIM Card shop tab every time
- Fix: `activeTab`, `currentSimType` (in `App.tsx`) and `viewMode` (in `ProductTab.tsx`) now saved to `sessionStorage`
- On refresh, the app returns to the exact same tab and view the user was on

### Install eSIM UI Relocation
- Removed the large center "Install Your eSIM" block that dominated the My eSIMs page
- Added compact indicators on the SIM banner card row for uninstalled eSIMs:
  - Blue "Install" badge (replaces green "Ready" to avoid confusion)
  - "Tap to install" subtitle text in blue
  - Tapping the card opens the install modal directly
- Kept existing compact "Install eSIM" row below the data donut
- Network Status detail badge also updated to show "Not Installed" for uninstalled eSIMs

### Spacing Fix Across All Pages
- Root cause: `.pt-safe` class in `app.css` only gave 2px top padding on mobile browsers
- Fix: Updated `.pt-safe` from `2px` to `12px` — fixes ALL page headers at once
- Added `mt-4` gap between header and SIM card list in MySimsView
- All views (ShopView, ProfileView, ContactUsView, InboxView, PhysicalSimSetupView, MySimsView) now have consistent comfortable spacing

### One-Time Install Warning
- eSIM profiles can only be downloaded/installed ONCE from SM-DP+ (standard GSMA behavior)
- Added amber warning banner at top of install modal: "One-time installation only — This eSIM can only be installed once. Please do not delete it from your device after installation, or it cannot be recovered."
- Translated in all 3 languages (EN, ZH, ES)

### Context Persistence
- Updated all Cursor rules in `.cursor/rules/` with latest decisions
- Updated `docs/CONVERSATION_HISTORY.md` with full session log
- All changes pushed to git + iCloud after every modification

---

## Pending / Future Work

1. **Red Tea billing update**: Waiting for "charge on first data use" feature
2. **Backend API sync**: Backend team needs to sync all 2,489 packages
3. **Native Android app**: LPA integration for direct eUICC profile management
4. **Merge to main**: `feature/api-integration` branch ready when confirmed
5. **Shipping carrier API**: Real tracking integration (currently placeholder)
6. **App Store release**: Rate App feature will link to real store listing
7. **Top-up modal layout**: User reported top-up page appearing at top of screen (modal fix was pushed but may need further verification)

---

## Flutter Transition (starting April 17, 2026)

Jordan decided to build a **native Flutter mobile app** to replace this H5. The Flutter app is a separate repo/codebase; this H5 remains the production web app until the Flutter app ships to TestFlight.

### Key facts
- **Local path**: `~/Development/EvairSIM-App` (not in iCloud — iCloud path caused `flutter create` to hang)
- **GitHub**: https://github.com/jordanmok88/EvairSIM-App (`main`)
- **Aliyun mirror**: `codeup.aliyun.com/sz0755/ZenoSIM/flutter.git` → branch `feature/evairsim-jordan`
- **iCloud backup**: `~/Library/Mobile Documents/com~apple~CloudDocs/EvairSIM-App-Backup`
- **App name**: EvairSIM · **Platform priority**: iOS first (Option A)
- **Apple ID**: `jordan_mok@icloud.com`

### Status (April 18, 2026 — end of session 1)
Milestones M0–M7 complete in one autonomous pass:
- M0 Flutter env setup · M1 Auth · M2 Shop browse · M3 Purchase + checkout
- M4 My SIMs + top-up + physical SIM activation · M5 Profile
- M6 i18n (en/zh/es) with persisted language switcher
- M7 App icons + native splash + iOS Info.plist + `docs/TESTFLIGHT_GUIDE.md`

### Session 2 (April 19, 2026) — Shop redesign + portal wiring + strategic pivot

1. **Shop redesign (done)**: Flutter Shop page now mirrors H5 structurally — white sticky header, SIM/eSIM toggle, mode-specific hero cards, unified country list with popular-first sorting + amber star highlight. Committed + pushed (`21976eb`).

2. **Portal integration (done)**: Wired Flutter app to admin portal endpoints for notifications and live chat. Built `NotificationApi` / `ChatApi` + repositories + Riverpod providers. Still need to rewrite the UI on top.

3. **Strategic pivot (IMPORTANT — affects H5 thinking too)**: Jordan clarified the app's product scope:

   > "the major feature of the APP will be bind and top up the sim card from PCCW, and then to be able to connect, top up red tea eSIM. No more eCard at the moment"

   Translates to:
   - PCCW physical SIM is PRIMARY (bind + top-up)
   - Red Tea eSIM is SECONDARY ("connect" by pasting LPA code / scanning QR, then top-up)
   - **NO more eSIM marketplace** — country browse / buy-new-eSIM flow is parked
   - **No shipping or in-app purchase flow** — customers buy PCCW SIMs on Amazon / Temu / Jordan's site; the app only handles activation + top-up
   - Top-up packages come from the admin portal (`/v1/app/recharge-packages`), not the Red Tea supplier API
   - Layout still follows H5, but "eCard (Red Tea)" content positions become "SIM card (PCCW)" content

   **Implication for this H5 codebase**: the `ShopView` marketplace pattern (country browse, purchase flow) is now a LEGACY concept for the new product direction. If we ever touch `ShopView.tsx` going forward, we should consider whether it still belongs. For now the H5 continues to serve existing customers while Flutter becomes the PCCW-first app.

Full Flutter-side history, architecture decisions, API endpoint mappings, pivot TODO list, and session-by-session log live in `~/Development/EvairSIM-App/docs/CONVERSATION_HISTORY.md`.

---

## Session 3 (April 22–24, 2026) — APP preview fixes, live usage, AI assistant, iOS build, competitor research

### 1. APP preview polish (Apr 22–23)
- Browser tab title now flips to "Evair APP" when URL hash contains `#app-preview`. Logic in `App.tsx` using `isAppPreviewHash()` from `utils/testMode.ts` (now exported).
- Removed the stray "testing banner" from APP preview mode.

### 2. eSIM catalogue regression fix (Apr 22)
- Shop was showing "0 plans found" because `services/dataService.ts::fetchPackages` routed through `packageService.getPackages()` with no `size` param, and `backendPkgToEsimPackage` crashed on the empty response.
- Fix: `fetchPackages` + `prefetchPackages` now always call the supplier path (`supplierFetchPackages` / `supplierPrefetch` from `esimApi.ts`). Regression guard written into `.cursor/rules/esim-api-services.mdc`.

### 3. Live SIM usage for APP (Apr 23)
- Usage display mismatch (e.g. "0 GB GB used" / "3 GB / 3 GB remaining" when actual was 451 MB / 2 GB).
- Fixed i18n: `gb_used` changed from "GB used" to "used" in all three locales.
- `App.tsx::fetchUserSims` now fans out parallel `checkDataUsage(iccid)` calls after loading SIMs, merging live `totalGB` / `usedGB` / `expiryDate` back into state.
- `MySimsView.tsx::handleRefreshStatus` now uses `checkDataUsage` for BOTH eSIM and physical SIMs; `queryProfile` is only called for Red Tea (eSIM), skipped for PCCW.

### 4. Supplier API audit (Apr 23)
- Confirmed all PCCW + Red Tea endpoints are wired through `ProviderFactory` / `ConnectivityProvider`. Provider contract is honored by `EsimAccessProvider` and `PccwProvider`.
- PCCW currently returns `401 Distributor is De-activated` — external blocker on Jordan's PCCW account. UI falls back to local DB snapshots.
- Ran `php artisan migrate` to create `push_tokens` + `user_push_preferences` (were missing, causing a 500 on `/push/preferences`).

### 5. AI assistant professionalization (Apr 24)
- Rewrote `ai/evairAssistant.ts`: removed every emoji, professional/welcoming/polite tone throughout, supplier-aware vocabulary (eSIM vs. physical SIM, Red Tea vs. PCCW, USA-only for physical), expanded knowledge base.

### 6. iOS app not loading on iPhone (Apr 24)
Multi-step debug:
- First issue: iPhone on same Wi-Fi couldn't reach Mac dev server — solved by using Mac's LAN IP `http://192.168.31.125:3000/#app-preview` in Safari.
- Second issue: Xcode build error — Dart type mismatch in `lib/core/push/push_notification_service.dart` line 267 (`URLRequest(url:)` expects `WebUri`, not `Uri`). Wrapped with `WebUri(target.toString())`.
- Third issue: App froze on splash — `Firebase.initializeApp()` was crashing because `GoogleService-Info.plist` / `google-services.json` were missing. Added fail-soft `try/catch` + `_firebaseReady` flag, then ran `flutterfire configure` to generate `firebase_options.dart` + both native config files, then updated `Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform)`.
- Fourth issue: App loaded Laravel welcome page (wrong URL), then loaded OLD version of H5. Root cause: `AppConstants.h5Url` defaulted to `https://evair.zhhwxt.cn/` and then to the `main` branch of Netlify. Fixed by repointing to `https://feature-api-integration--evair-h5.netlify.app/` — the branch where the current H5 work lives. **Locked into `product-decisions.mdc`** — do not change back.

### 7. USA banner removal (Apr 24)
- Removed the "United States · AT&T · Verizon · T-Mobile · 3G/4G/5G" country card from ShopView's physical SIM section — all physical SIMs are USA-only, a single-country banner added no filtering value. Re-introduce a picker only if we add a second country.

### 8. Competitor research (Apr 24)
Deep crawl of Airalo (www.airalo.com) and EIOTCLUB (www.eiotclub.com), multi-tier (homepage, country pages, product detail pages, policy/help/blog, cart/account flows). Full dossier saved to **`.cursor/rules/competitor-analysis.mdc`** — covers site trees, page templates, hidden features (Airmoney, EiotclubCredits, renewals, eSIM recycling, shared plans, ICCID refill portal), and a gap checklist vs. Evair.

### 9. Persistent memory system (Apr 24)
Set up three alwaysApply rule files so every new session starts with loaded context:
- `.cursor/rules/ongoing-work.mdc` — active threads + recently resolved
- `.cursor/rules/product-decisions.mdc` — locked-in decisions
- `.cursor/rules/competitor-analysis.mdc` — competitor dossier (on-demand)
Plus CLAUDE.md pointer block at the top. Stubs mirrored into the three sister repos (Evair-Laravel, admin, EvairSIM-App) so cross-repo work also sees it.

### Open thread at end of session
Front-page redesign is blocked on 4 questions in PART 6 of `competitor-analysis.mdc` (primary audience, physical SIM checkout, home top-level cut, public Netlify H5 role). Do not start design work until answered.

---

## Session 3b (April 24, 2026 — evening) — strategy lock-in + Phase 0 route split

### 1. Strategy lock-in (from the 2026-04-24 pricing spreadsheet + Jordan's direction)

Jordan shared `流量策略-2026.4.24.xlsx` with the full first-batch Amazon SIM lineup (2,980 units across 7 SKUs + 240 seed-link SIMs) and the cost/margin model. Key takeaways locked into `product-decisions.mdc`:

- **Market**: USA only. Two audiences: IoT/mobile customers (physical SIM, PCCW) and US travelers (eSIM, Red Tea).
- **Unit economics**: SIM cards are loss-leaders on Amazon (e.g. 1 GB/30d @ $6.99 = −$6.21 margin per card). Revenue comes from 5 months of top-up recharges with 70% MoM retention decay. Amazon is customer acquisition; our app is the business model.
- **Three brand pillars** (testable claims, not fluff):
  1. "5G up to 650 Mbps" — Phone/tablet plans. First 9 GB full speed, then 10 Mbps. Most competitors don't publish speeds because theirs are lower.
  2. "US IP abroad" — Red Tea API lets us pick the breakout IP (US vs HK etc.) per plan. For US travelers this means YouTube/Netflix/Venmo/banking apps keep working abroad. Airalo doesn't do this.
  3. "Auto APN" — PCCW auto-provisions. Amazon reviews on competitor SIMs routinely complain about manual APN setup; we eliminate that.
- **Internal capability** (not user-facing yet): we can remotely control speed tiers per SIM. Future "boost to 5G" monetization on camera plans.
- **Speed tiers** (must match marketing copy): Phone 650 Mbps → 10 Mbps after 9 GB · Camera 1.5 Mbps flat (bundled) / 1 Mbps (top-ups) · Low IoT 500 Kbps flat. **Disclose openly on product pages** — honest pricing = fewer refunds.
- **Design language**: Airalo-inspired (clean, spacious, human). Not EIOTCLUB (dense, countdown-heavy).
- **Premium pricing posture** confirmed — ~2× Temu, on par with Kiwisim, cheaper than individual carrier retail.
- **Domain**: `evairdigital.com` (Jordan to point at Netlify).
- **Phase order**: 0) route split (invisible) → 1) activation + top-up funnel (where the money is) → 2) device/country SEO pages → 3) home page brand → 4) help + blog → 5) in-app physical SIM checkout retiring Amazon. Do not skip ahead.
- **Auto-renew is load-bearing** — must be ROSCA + CA SB-313 compliant from day 1.

### 2. Phase 0 route split (shipped 2026-04-24 evening)

Invisible-to-users foundation for the marketing + functional split:

- `utils/testMode.ts` — added `isAppPath()` (checks `pathname === '/app'` or `startsWith('/app/')`) and `shouldRenderMarketing()` (inverse, gated by `VITE_MARKETING_HOME` env flag, defaults off).
- `App.tsx` — tab title flips to "Evair APP" on `/app` paths in addition to the existing `#app-preview` dev hash. Now runs in production too (was dev-only before) and listens to `popstate` in addition to `hashchange`.
- `EvairSIM-App/lib/core/constants/app_constants.dart` — `h5Url` default changed from `https://feature-api-integration--evair-h5.netlify.app/` to `.../app`. Flutter WebView now loads straight into the functional shell, skipping the future marketing layer.
- `netlify.toml` already had `/* → /index.html` catch-all, so SPA deep links under `/app` (like `/app/my-sims`) work without a config change.
- `shouldRenderMarketing()` is wired but gated — until `VITE_MARKETING_HOME=1` is set, the marketing placeholder won't render and visitors continue to see the customer app at both `/` and `/app`. Phase 3 ships the real marketing home and flips the flag.
- No React Router introduced yet — minimal path check is enough for Phase 0. Router migration is a Phase 2 task when real marketing routes arrive.

### 3. Memory system extended

- `.cursor/rules/product-decisions.mdc` now holds the full strategy: brand/market, three brand pillars, speed tiers, unit economics, architecture, phase order, auto-renew disclosure plan.
- `.cursor/rules/ongoing-work.mdc` updated — Phase 0 resolved, Phase 1 (activation + top-up funnel) now the active thread.
- `.cursor/rules/competitor-analysis.mdc` remains the on-demand dossier.

### 4. DNS cutover — `evairdigital.com` live (2026-04-24 20:09 PT)

Domain successfully cut over to Netlify without breaking existing email infrastructure. Key decisions and gotchas for posterity:

- **Approach chosen**: kept Aliyun nameservers (`dns21/22.hichina.com`) authoritative, added A + CNAME records pointing at Netlify. Did NOT delegate nameservers to Netlify. Rationale: the domain already hosted a full email stack (Zoho inbound, Amazon SES on `send.evairdigital.com`, Resend DKIM on apex) that would have been lost in a nameserver switch.
- **Shopify removal**: domain was previously pointing at a Shopify store. Removed two records — apex A `23.227.38.65` and www CNAME `shops.myshopify.com` — which had been silently round-robining with Netlify, causing ~50% of traffic to hit Shopify. Jordan confirmed Shopify is abandoned.
- **Final record state**:
  - `@` A → `75.2.60.5` (Netlify edge)
  - `www` CNAME → `evair-h5.netlify.app.`
  - All other records untouched (Zoho MX + SPF + verification TXT, SES MX/TXT/DKIM CNAMEs on `send`, Resend DKIM, etc.)
- **SSL**: Let's Encrypt cert issued automatically ~5 min after DNS went green (`CN=evairdigital.com`, issuer `E7` ECDSA intermediate). HTTP→HTTPS redirect and www→apex 301 both enforced by Netlify.
- **Total cutover time**: ~15 min from first record change to fully green cert.
- **Flutter follow-up**: `EvairSIM-App/lib/core/constants/app_constants.dart` `h5Url` default should be updated from `https://feature-api-integration--evair-h5.netlify.app/app` to `https://evairdigital.com/app` at start of Phase 1. (Left deliberately on the preview URL during DNS propagation.)

### 5. Open at end of session

- **Phase 1**: next piece to build. Activation landing (`/activate?iccid=`), top-up (`/top-up?iccid=`), auto-renew toggle on my-sims, transactional emails, ROSCA-compliant disclosure copy.
- **Red Tea breakout-IP field**: not yet surfaced in `esimApi.ts`. Needed for Phase 2 when we build country pages that highlight the US-IP variants. Research task.
- **Flutter `h5Url` repoint**: move from preview branch URL to `https://evairdigital.com/app` at start of Phase 1.

---

## 2026-04-25 — Phase 1 design reconciled with China team's Laravel work; renamed to Activation Funnel

### Trigger

Jordan, before letting code start, said: "before you continue, my china team
remind me that laravel has some update, please make sure you also take a
look first." Fetched `origin` (Aliyun) on the Laravel repo. Local was
already current on `f96d4e49`, but in the process discovered the China team
(ben + Jordan + Claude Sonnet 4.5 co-author) had landed major architectural
work over the last 10 days that I had not absorbed.

### Discoveries that changed the plan

1. **Parallel `/v1/app/*` API tier exists** alongside legacy `/v1/h5/*`.
   - `auth:app` guard, same `app_users` provider (Sanctum tokens interchangeable in theory).
   - 50 endpoints, 48 fully implemented (only 2 mock — both eliminated by 2026-04-23).
   - This was originally for native Flutter; after Jordan's April WebView
     pivot the App tier is somewhat orphaned but is far more polished than
     the H5 tier.
2. **`sim_assets` table is the canonical owned-SIM record** (migration
   `2026_03_12_100004_create_sim_assets_table.php`). Owns `user_id`,
   `status` (INVENTORY / ACTIVE / SUSPENDED / EXPIRED / TERMINATED),
   `activated_at`, `expired_at`, `current_package_id`, `metadata` json,
   plus eSIM-specific `lpa_code` / `smdp_address` / `matching_id`.
   The legacy `app_user_sims` pivot predates this and is no longer the
   right target for new features.
3. **`POST /v1/app/users/bind-sim` already supports `activation_code`**
   validated against `SimAsset.matching_id`. Exactly the activation flow
   the funnel needs — extend it instead of building new.
4. **Real Stripe is wired end-to-end on App tier**: `PaymentController::create`,
   `PaymentController::show`, `OrderController::pay`, all webhook handlers
   in `StripePaymentService` (canceled / refunded / dispute.created /
   dispute.closed / checkout.session.completed / checkout.session.expired,
   with tenant context fallback). Recharge unified into
   `RechargeController` 2026-04-23. The H5 `OrderController::createTopup`
   is `@deprecated`.
5. **`SimResource` (App tier) already exposes** `package_name`, `country_code`,
   `qr_code_url`, `usage_percent`, `total_display`, `is_low_data`,
   `is_expired` plus aliases (`total_volume` / `expired_time` /
   `activation_code`). The H5 my-sims page would benefit from these but
   doesn't need to migrate this phase.
6. **China team uses their own Phase numbering**:
   `docs/api-integration-guide/phase1-supplier-package.md` (their Phase 1)
   and `docs/plans/2026-04-22-flutter-app-implementation-plan.md` (Phase
   0A/0B/0C/0D + their Phase 1 = Flutter→App migration). My "Phase 1"
   would have collided directly.

### Decisions made (Jordan, in real time)

| # | Question | Choice |
|---|---|---|
| 1 | Phase naming | **Rename to "Activation Funnel"** — drop the colliding number |
| 2 | API tier for new endpoints | **App namespace only** (`/v1/app/*`) |
| 3 | Where do auto-renew columns live | **`sim_assets`** (not the legacy pivot) |
| 4 | Lookup endpoint approach | **Extend** the preview pattern with a `claim_state` field |
| 5 | Top-up flow Laravel target | **App `RechargeController`** (already real Stripe, polished) |

### Cleanup work shipped

- Renamed `Evair-H5/docs/PHASE_1_ACTIVATION.md` → `docs/ACTIVATION_FUNNEL.md`
  and rewrote §4 (Laravel deliverables) and §7 (API contract) against the
  actual data model. Other sections (H5 / admin / Flutter / customer story
  / wireframes / disclosure plan) unchanged.
- Updated `Evair-H5/.cursor/rules/ongoing-work.mdc` — Active thread
  renamed to "Activation Funnel"; added critical reconciliation note;
  cleaned up duplicate Resolved/Blockers sections.
- Updated `Evair-Laravel/.cursor/rules/cross-repo-sync.mdc` with a
  forward pointer for ben/the China team explaining the upcoming
  cross-repo PR (schema migration + 2 new endpoints + 1 extended +
  scheduled job + 6 mail classes).
- Deleted iCloud-sync duplicate files
  `Evair-Laravel/.cursor/rules/cross-repo-sync 2.mdc` and
  `competitor-analysis 2.mdc`.

### Net effect

~4-5 days of expected work removed from the funnel scope (Stripe wiring,
webhook handlers, SIM resource fields, bind-sim activation_code support
all already done). Same scope, same UX, lower risk. Ready to start the
Laravel migration on `sim_assets` as step 1 of the corrected ship sequence.

---

## Cursor session archive — Live Chat + marketing header (2026-05-04)

_Archived for Jordan starting a fresh agent. Raw Cursor threads are **not** in Git; only this summary plus the commits below._

### What Jordan asked for

1. **Remove the floating orange live chat bubble** (corners / vertical “LIVE CHAT” tab) from WebView + mobile everywhere; **keep chat only via header-style controls** (`AppShellLiveChatButton`) on Shop, Profile, Inbox, My SIMs, marketing `SiteHeader`, etc.
2. **Web mobile marketing home**: Jordan wanted Live Chat **in the hero**, **above** the trust line that includes **“No hidden fees”**, plus **room in the sticky header for Inbox + Account** without duplicating chat twice on narrow viewports.

### Intermediate step (later reverted on request)

- Jordan said **“undo”** once: that **reverted** `fix(marketing): always show inbox + account in SiteHeader on mobile web` (`a9c7336` ↔ `ec8054b`). After that revert, inbox/account again **vanished for signed-out visitors** (`SiteHeaderAccountActions` had returned `null` when not logged in).

### Final behavior shipped (`main`)

- **`components/SupportFab.tsx` removed**; `App.tsx` no longer mounts a global FAB—see commit `feat(support): remove floating chat FAB; header Live Chat…` (**8051ec6**, rebased ancestry).
- **Shared header CTA**: `components/AppShellLiveChatButton.tsx` (+ unread badge via `useUnreadChat(true)`); wired where headers need chat.
- **Apex homepage (`MarketingPage`)** (`3d378a8` — `feat(marketing): hero Live Chat above trust strip mobile; header inbox+account; hide dup chat in narrow header`):
  - **`MarketingHeroCarousel`**: Below `lg`, centered **Live Chat** pill **above** `HeroTrustStrip` (trust_no_hidden_fees row).
  - **`SiteHeader`**: New prop **`hideLiveChatBelowLg`** — apex passes it so header Live Chat is **`hidden lg:flex`** (no duplicate with hero pill on phones).
  - **`SiteHeaderAccountActions`**: Inbox + account **always rendered** again; **`MarketingProfileDrawer`** gets **`isLoggedIn={loggedIn}`** so signed-out users still open profile sheet / empty inbox UX.
  - **i18n**: `marketing.header_profile_aria` updated (en/zh/es) to “account menu,” not “in the Evair app.”

### Repo pointers for the next agent

| Topic | Files |
|---|---|
| FAB removal / in-app shell chat wiring | `App.tsx`, `views/ShopView.tsx`, `views/ProfileView.tsx`, `views/InboxView.tsx`, `views/MySimsView.tsx`, `views/ProductTab.tsx`, `components/marketing/SiteHeader.tsx` |
| Marketing contact drawer opener | `EVAIR_OPEN_MARKETING_CONTACT_EVENT` in `utils/evairMarketingEvents.ts`, listener in `App.tsx` (`marketingSupportOpen`) |
| Hero chat placement | `components/marketing/MarketingHeroCarousel.tsx`, prop `hideLiveChatBelowLg` on `components/marketing/SiteHeader.tsx`, `views/MarketingPage.tsx` |
| Signed-out inbox/account | `components/marketing/SiteHeaderAccountActions.tsx` |

**Note:** Paste any extra points from Cursor into this file—or ask the new agent to read `docs/H5_SHELL_AND_MARKETING.md` and `.cursor/rules/ongoing-work.mdc`.
