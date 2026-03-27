# Evair H5 — Development Conversation History

> Last updated: March 27, 2026

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
