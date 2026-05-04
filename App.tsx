import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Zap } from 'lucide-react';
import AppShellFloater from './components/AppShellFloater';
import ProductTab from './views/ProductTab';
import { parseAppTravelEsimCountry } from './utils/appTravelPath';
import ProfileView from './views/ProfileView';
import LoginModal from './views/LoginModal';
import GuestAuthSheet from './components/auth/GuestAuthSheet';
import DialerView from './views/DialerView';
import ContactUsView from './views/ContactUsView';
import InboxView from './views/InboxView';
import ApiTestPage from './views/ApiTestPage';
const ActivatePage = lazy(() => import('./views/ActivatePage'));
const TopUpPage = lazy(() => import('./views/TopUpPage'));
const MarketingPage = lazy(() => import('./views/MarketingPage'));
const MarketingPageRedesignPreview = lazy(() => import('./views/MarketingPageRedesignPreview'));
const DeviceLandingPage = lazy(() => import('./views/DeviceLandingPage'));
const TravelEsimPage = lazy(() => import('./views/TravelEsimPage'));
const HelpCenterPage = lazy(() => import('./views/HelpCenterPage'));
const BlogPage = lazy(() => import('./views/BlogPage'));
const LegalPage = lazy(() => import('./views/LegalPage'));
import { Tab, ActiveSim, Country, SimType, User, AppNotification, EsimProfileResult } from './types';
import { Lock } from 'lucide-react';
import { MOCK_COUNTRIES, MOCK_PLANS_US, MOCK_ACTIVE_SIMS, MOCK_NOTIFICATIONS } from './constants';
import { retailCarrierRowForIso } from './utils/retailCarrierLookup';
import { checkDataUsage, prefetchPackages, DEMO_MODE, mapRedTeaStatus, bindSim, queryProfile } from './services/dataService';
import { supabaseConfigured, fetchNotifications, logSimActivation } from './services/supabase';
import { authService, userService, type UserDto, type UserSimDto } from './services/api';
import { initPush, unregisterPush } from './services/pushService';
import {
  computeTestModeEnabled,
  dismissTestModeForSession,
  isAppPath,
  isAppPreviewHash,
  runningInsideNativeApp,
  stripTestModeFromUrl,
} from './utils/testMode';
import { getRoute, type Route } from './utils/routing';
import {
  EVAIR_OPEN_APP_SHELL_CHAT,
  EVAIR_OPEN_MARKETING_CONTACT_EVENT,
  type MarketingContactOpenDetail,
} from './utils/evairMarketingEvents';
import { deriveEsimCountryOverlay } from './utils/deriveEsimRegionFromPlanName';
import { BootSplash, shouldSkipBootSplash } from './components/BootSplash';
import { useViewportMinWidth } from './hooks/useViewportMinWidth';
import { useCustomerAppDesktopQr } from './hooks/useMobileSignInGate';
import MobileOnlyNotice from './components/marketing/MobileOnlyNotice';
import MarketingContactDrawer from './components/marketing/MarketingContactDrawer';
import LiveChatEdgeLauncher from './components/marketing/LiveChatEdgeLauncher';

/** Laravel `SupplierSeeder` default ordering: PCCW = 1, ESIMACCESS = 2. See Evair-Laravel `docs/ops/STAGING_PREVIEW_BINDINGS_JORDAN.md`. */
const LARAVEL_SUPPLIER_ID_PCCW = 1;

function normaliseExpiryIso(raw: string | undefined | null): string | undefined {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return undefined;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

/** Matches Tailwind `--breakpoint-md` (`48rem`): tablet / windowed Safari and up use full `/app` chrome (no centred phone mock). */
const APP_WIDE_LAYOUT_MIN_PX = 768;

function hashFragmentForTab(tab: Tab): string {
  switch (tab) {
    case Tab.DIALER:
      return '#contact';
    case Tab.INBOX:
      return '#inbox';
    case Tab.PROFILE:
      return '#profile';
    case Tab.SIM_CARD:
      return '#sim-card';
    case Tab.ESIM:
      return '#esim';
    default:
      return '#esim';
  }
}


/** Default anchor when the marketing contact event has no `detail` (e.g. Profile → Contact). Matches edge tab sizing. */
function marketingContactFallbackAnchor(): MarketingContactOpenDetail {
  if (typeof window === 'undefined') {
    return { dock: 'right', topPx: 120, tabW: 44, tabH: 118 };
  }
  const md = window.innerWidth >= 768;
  const tabW = md ? 44 : 22;
  const tabH = md ? 118 : 92;
  const vh = window.innerHeight;
  return {
    dock: 'right',
    topPx: Math.max(12, Math.round((vh - tabH) / 2)),
    tabW,
    tabH,
  };
}


function RouteSuspenseFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 bg-white text-slate-500">
      <Loader2 className="animate-spin text-brand-orange" size={32} aria-hidden />
    </div>
  );
}

function App() {
  /** Full-screen splash on every load (~2.8 s). Append `?nosplash` to skip (QA). Timing: BootSplash.tsx `BOOT_SPLASH_DURATION_*`. */
  const [bootComplete, setBootComplete] = useState(() => shouldSkipBootSplash());
  const [marketingSupportOpen, setMarketingSupportOpen] = useState(false);
  const [marketingContactAnchor, setMarketingContactAnchor] = useState<MarketingContactOpenDetail | null>(null);

  // Top-level route detection. Falls back to <CustomerApp/> for any path
  // we don't explicitly handle, so existing app surfaces are unaffected.
  const [route, setRoute] = useState<Route>(() => getRoute());

  useEffect(() => {
    const sync = () => setRoute(getRoute());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  useEffect(() => {
    setMarketingSupportOpen(false);
    setMarketingContactAnchor(null);
  }, [route.kind]);

  /** Profile drawer → Contact Us without `/app#contact` (`SiteHeaderAccountActions`). */
  useEffect(() => {
    const openContactDrawer = (ev: Event) => {
      if (getRoute().kind === 'app') return;
      const ce = ev as CustomEvent<MarketingContactOpenDetail | undefined>;
      setMarketingContactAnchor(ce.detail ?? marketingContactFallbackAnchor());
      setMarketingSupportOpen(true);
    };
    window.addEventListener(EVAIR_OPEN_MARKETING_CONTACT_EVENT, openContactDrawer);
    return () => window.removeEventListener(EVAIR_OPEN_MARKETING_CONTACT_EVENT, openContactDrawer);
  }, []);

  // Phone-frame scroll lock is owned by <CustomerApp/> (see its
  // own useEffect on `activeTab`). We deliberately do NOT toggle
  // `html.app-shell` here because the rule depends on the customer
  // app's *current tab*: the eSIM tab needs to render full-width
  // with normal page scrolling on desktop (it's a real store, not
  // a mock-phone screen), while every other tab keeps the iPhone
  // contained layout. Centralising the toggle in CustomerApp also
  // means the class is added only after CustomerApp mounts and
  // removed on unmount — so the public surfaces (marketing, device,
  // travel, help, blog, legal, activate, top-up, apiTest) stay
  // free-scrolling without any opt-out lists to maintain.

  // Tab title override. Three surfaces own the document title:
  //   1. /activate(*)    → "Activate your Evair SIM"
  //   2. /app(*) or
  //      desktop dev-only `#app-preview` hash → "Evair APP"
  //      (the latter is what start-all-previews.sh opens for QA).
  //   3. anything else   → "Evair H5"
  useEffect(() => {
    if (!bootComplete) return;
    const applyTitle = () => {
      if (route.kind === 'activate') {
        document.title = 'Activate your Evair SIM';
      } else if (route.kind === 'topup') {
        document.title = 'Top up your Evair SIM';
      } else if (route.kind === 'marketingPreview') {
        document.title = 'Evair — Homepage preview (draft)';
      } else if (route.kind === 'marketing') {
        document.title = 'Evair — Mobile data, simplified';
      } else if (route.kind === 'device' || route.kind === 'travel') {
        // Device + travel landing pages set their own <title> after
        // hydration (so the country / category appears in the tab),
        // but we set a sensible default in case content loads slow.
        document.title = 'Evair — Mobile data, simplified';
      } else if (route.kind === 'help' || route.kind === 'blog') {
        // Same pattern as device/travel — pages own their own title
        // once hydrated; this is a fallback for the brief flash before
        // React mounts.
        document.title = route.kind === 'help' ? 'Help center — Evair' : 'Evair Blog';
      } else if (route.kind === 'legal') {
        document.title = 'Legal — Evair';
      } else if (isAppPreviewHash() || isAppPath()) {
        document.title = 'Evair APP';
      } else if (document.title === 'Evair APP') {
        document.title = 'Evair H5';
      }
    };
    applyTitle();
  }, [route, bootComplete]);

  const handleBootSplashDone = useCallback(() => {
    setBootComplete(true);
  }, []);

  const appBody = useMemo(() => {
    if (!bootComplete) return null;
    if (route.kind === 'apiTest') return <ApiTestPage />;
    if (route.kind === 'activate') return <ActivatePage iccid={route.iccid} />;
    if (route.kind === 'topup') return <TopUpPage iccid={route.iccid} initialTab={route.tab} />;
    if (route.kind === 'marketingPreview') return <MarketingPageRedesignPreview />;
    if (route.kind === 'marketing') return <MarketingPage />;
    if (route.kind === 'device') return <DeviceLandingPage category={route.category} />;
    if (route.kind === 'travel') return <TravelEsimPage countryCode={route.countryCode} />;
    if (route.kind === 'help') return <HelpCenterPage slug={route.slug} />;
    if (route.kind === 'blog') return <BlogPage slug={route.slug} />;
    if (route.kind === 'legal') return <LegalPage slug={route.slug} />;
    return <CustomerApp />;
  }, [route, bootComplete]);

  if (!bootComplete) {
    return <BootSplash onFinish={handleBootSplashDone} />;
  }

  return (
    <>
      <LiveChatEdgeLauncher />
      {route.kind !== 'app' && (
        <MarketingContactDrawer
          open={marketingSupportOpen}
          anchor={marketingContactAnchor}
          onClose={() => {
            setMarketingSupportOpen(false);
            setMarketingContactAnchor(null);
          }}
        />
      )}
      <Suspense fallback={<RouteSuspenseFallback />}>{appBody}</Suspense>
    </>
  );
}

function CustomerApp() {
  const { t } = useTranslation();
  const phoneRef = useRef<HTMLDivElement>(null);
  const desktopAppQr = useCustomerAppDesktopQr();
  const [testMode, setTestMode] = useState(computeTestModeEnabled);

  useEffect(() => {
    const sync = () => setTestMode(computeTestModeEnabled());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const exitTestMode = useCallback(() => {
    setTestMode(false);
    dismissTestModeForSession();
    stripTestModeFromUrl();
  }, []);

  // 初始化认证状态
  const [isLoggedIn, setIsLoggedIn] = useState(() => authService.isLoggedIn());
  const [user, setUser] = useState<User | undefined>(() => {
    // TODO: 登录后从 userService.getProfile() 获取真实用户数据
    // 目前从 localStorage 获取基本信息
    return undefined;
  });

  // 如果有 token 但没有 user，从后端获取用户信息
  const userFetched = useRef(false);
  useEffect(() => {
    if (userFetched.current) return;
    if (!authService.isLoggedIn()) return;
    userFetched.current = true;
    userService.getProfile()
      .then(profile => {
        setUser({
          id: String(profile.id),
          name: profile.name,
          email: profile.email,
        });
      })
      .catch(() => {
        // 如果获取失败，清除 token 让用户重新登录
        authService.logout();
        userFetched.current = false;
      });
  }, []);


  // Resolve the initial tab from URL hash first, then sessionStorage,
  // then fall back to SIM_CARD. Reading the hash here (rather than
  // letting the hash-change effect override after first paint) avoids
  // a one-frame flash where the customer sees the SIM-Card view even
  // though they came in through `/app#esim` from the marketing CTA.
  // The hash table here intentionally mirrors the one in the
  // hashchange effect below — keep them in lock-step.
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      // `/app/travel-esim/jp` — travel SEO / marketing funnel; must win
      // over sessionStorage so the eSIM store opens on first paint.
      if (parseAppTravelEsimCountry(window.location.pathname)) {
        return Tab.ESIM;
      }
      const HASH_TO_TAB: Record<string, Tab> = {
        '#contact': Tab.DIALER,
        '#inbox': Tab.INBOX,
        '#profile': Tab.PROFILE,
        '#sim-card': Tab.SIM_CARD,
        '#bind-sim': Tab.SIM_CARD,
        '#esim': Tab.ESIM,
        '#shop': Tab.ESIM,
      };
      const fromHash = HASH_TO_TAB[window.location.hash.toLowerCase()];
      if (fromHash) return fromHash;
    }
    return (sessionStorage.getItem('evair-activeTab') as Tab) || Tab.SIM_CARD;
  });
  const previousTab = useRef<Tab>(Tab.SIM_CARD);
  const viewportMdUp = useViewportMinWidth(APP_WIDE_LAYOUT_MIN_PX);

  /** ISO-2 from `/app/travel-esim/{xx}` — passed to ShopView once, then cleared. */
  const [travelEsimOpenCode, setTravelEsimOpenCode] = useState<string | null>(() =>
    typeof window !== 'undefined' ? parseAppTravelEsimCountry(window.location.pathname) : null,
  );

  /**
   * `/app#bind-sim` — marketing "Activate my SIM" lands here so we open
   * the bind wizard directly instead of the Amazon storefront (`#sim-card`).
   */
  const [pendingBindSimDeepLink, setPendingBindSimDeepLink] = useState(() =>
    typeof window !== 'undefined' && window.location.hash.toLowerCase() === '#bind-sim',
  );

  const clearBindSimDeepLink = useCallback(() => {
    setPendingBindSimDeepLink(false);
    if (typeof window !== 'undefined' && window.location.hash.toLowerCase() === '#bind-sim') {
      const { pathname, search } = window.location;
      window.history.replaceState(null, '', pathname + (search || ''));
    }
  }, []);

  const handleTravelEsimDeepLinkConsumed = useCallback(() => {
    setTravelEsimOpenCode(null);
    if (typeof window !== 'undefined' && parseAppTravelEsimCountry(window.location.pathname)) {
      window.history.replaceState(null, '', '/app#esim');
    }
  }, []);

  // Full-bleed eSIM “store aisle” on every **non-native** viewport (legacy mobile-Safari UX).
  // Flutter WebView + `#app-preview` keep the **condensed** shell for eSIM so travel deep links
  // never open the wide multi-column shop inside a narrow / wrong-width webview.
  const isEsimStoreTab = activeTab === Tab.ESIM;
  const condensedCustomerChrome = runningInsideNativeApp() || isAppPreviewHash();
  const layoutFullBleed = condensedCustomerChrome
    ? !isEsimStoreTab && viewportMdUp && activeTab !== Tab.SIM_CARD
    : isEsimStoreTab || (viewportMdUp && activeTab !== Tab.SIM_CARD);

  useEffect(() => {
    const root = document.documentElement;
    if (layoutFullBleed) {
      root.classList.remove('app-shell');
    } else {
      root.classList.add('app-shell');
    }
    return () => { root.classList.remove('app-shell'); };
  }, [layoutFullBleed]);

  const showStoreLayout = layoutFullBleed;
  // Mirror activeTab into a ref so the hashchange listener (which we
  // wire once on mount) reads the *current* tab when remembering the
  // previous one — without this the listener captured the initial
  // activeTab and "back" jumped to the wrong place after the user had
  // navigated tabs in-app.
  const activeTabRef = useRef<Tab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  /** Wide-browser `/app`: profile + inbox float over the SIM/eSIM storefront (marketing drawer geometry). */
  const shellFloatEligible =
    viewportMdUp && !runningInsideNativeApp() && !isAppPreviewHash();
  const shellFloatOpen =
    shellFloatEligible && (activeTab === Tab.PROFILE || activeTab === Tab.INBOX);

  // Hash deep-links: external surfaces (help articles, marketing
  // page, third-party emails) can land users on a specific tab via
  // `/app#contact`, `/app#inbox`, etc. We honour the hash on mount
  // and on subsequent hashchange events. The hash is preserved (not
  // cleared) so the back button feels right.
  //
  // Mapping intentionally narrow — only the tabs we publish externally:
  //   #contact  → DIALER    (Contact Us / chat)
  //   #inbox    → INBOX     (notifications)
  //   #profile  → PROFILE
  //   #sim-card → SIM_CARD  (physical SIM shop — "Buy SIM card" → Amazon)
  //   #bind-sim → SIM_CARD  + open Add SIM wizard ("Activate my SIM" bind-only)
  //   #esim, #shop → ESIM   (digital eSIM catalogue — used by the
  //               marketing homepage "Travel eSIM" CTA)
  //
  // Important: the SIM_CARD / ESIM tabs are both rendered by
  // <ProductTab/>, which switches its content via a SEPARATE state
  // (`currentSimType`, sessionStorage-backed, default 'PHYSICAL').
  // Setting `activeTab` alone is not enough — if `currentSimType`
  // is still 'PHYSICAL' from a previous visit the customer lands
  // on the physical-SIM view despite `#esim` in the URL. We mirror
  // the hash into `currentSimType` so deep-links land on the
  // intended product every time.
  useEffect(() => {
    const HASH_TO_TAB: Record<string, Tab> = {
      '#contact': Tab.DIALER,
      '#inbox': Tab.INBOX,
      '#profile': Tab.PROFILE,
      '#sim-card': Tab.SIM_CARD,
      '#bind-sim': Tab.SIM_CARD,
      '#esim': Tab.ESIM,
      '#shop': Tab.ESIM,
    };
    const apply = () => {
      const rawHash = window.location.hash.toLowerCase();
      if (rawHash === '#bind-sim') {
        setPendingBindSimDeepLink(true);
      }
      const tab = HASH_TO_TAB[rawHash];
      if (tab) {
        previousTab.current = activeTabRef.current;
        setActiveTab(tab);
        if (tab === Tab.ESIM) {
          setCurrentSimType('ESIM');
        } else if (tab === Tab.SIM_CARD) {
          setCurrentSimType('PHYSICAL');
        }
      }
    };
    apply(); // honour initial hash on mount
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  /** Profile tab: same flowing sheet as `/top-up` checkout auth (not centre LoginModal). */
  const [profileSheetAuth, setProfileSheetAuth] = useState<'login' | 'register' | null>(null);
  
  const [activeSims, setActiveSims] = useState<ActiveSim[]>(() => {
    try {
      const saved = localStorage.getItem('evair_demo_sims');
      if (saved) {
        const parsed: ActiveSim[] = JSON.parse(saved);
        if (parsed.length > 0) return [...parsed, ...MOCK_ACTIVE_SIMS];
      }
    } catch { /* ignore */ }
    return MOCK_ACTIVE_SIMS;
  });
  const [serverSims, setServerSims] = useState<ActiveSim[]>([]);
  /**
   * After the first authenticated GET /users/sims (or immediately when logged out).
   * Prevents bouncing an empty persisted "My eSIMs" to Shop before bindings load.
   */
  const [simWalletHydrated, setSimWalletHydrated] = useState(() => !authService.isLoggedIn());
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  /** Profile → Link existing eSIM (browse ProductTab unmounts while Profile is open). */
  const [linkEsimProfileNonce, setLinkEsimProfileNonce] = useState(0);

  const mockSimIds = useMemo(() => new Set(MOCK_ACTIVE_SIMS.map(s => s.id)), []);
  useEffect(() => {
    if (!DEMO_MODE) return;
    const userSims = activeSims.filter(s => !mockSimIds.has(s.id));
    try {
      if (userSims.length > 0) localStorage.setItem('evair_demo_sims', JSON.stringify(userSims));
      else localStorage.removeItem('evair_demo_sims');
    } catch { /* storage full */ }
  }, [activeSims, mockSimIds]);

  // 转换后端 SIM 数据为前端格式
  // App-tier UserSimDto is a binding record with nested sim summary
  // (iccid, msisdn, status, supplierId). Plan/usage details come from
  // the live usage fetch (checkDataUsage) that runs immediately after.
  const convertUserSimToActiveSim = (userSim: UserSimDto): ActiveSim => {
    const physical = userSim.sim.supplierId === LARAVEL_SUPPLIER_ID_PCCW;
    const countryPhysical: Country = {
      id: 'us',
      name: 'United States',
      flag: '',
      countryCode: 'US',
      region: '',
      startPrice: 0,
      networkCount: 0,
      networks: [],
      vpmn: '',
      vpn: true,
      plans: [],
      isPopular: false,
    };
    const countryEsim: Country = {
      id: '',
      name: 'Travel eSIM',
      flag: '\u{1F30D}',
      countryCode: '',
      region: '',
      startPrice: 0,
      networkCount: 0,
      networks: [],
      vpmn: '',
      vpn: true,
      plans: [],
      isPopular: false,
    };
    return {
      id: String(userSim.id),
      simId: userSim.simId,
      iccid: userSim.sim.iccid,
      country: physical ? countryPhysical : countryEsim,
      plan: {
        id: String(userSim.id),
        name: '',
        data: '',
        days: 30,
        price: 0,
        features: [],
      },
      type: physical ? 'PHYSICAL' : 'ESIM',
      activationDate: userSim.boundAt || new Date().toISOString(),
      expiryDate: '',
      dataTotalGB: 0,
      dataUsedGB: 0,
      status: userSim.status === 'active' ? 'ACTIVE' : 'PENDING_ACTIVATION',
    };
  };

  // 从后端获取用户 SIM 卡绑定列表 + 实时用量
  //
  // `/app/users/sims` returns the user-SIM binding records with a nested
  // sim summary (iccid, msisdn, status, supplierId). Plan/usage details
  // are NOT included — those come from the live usage fetch per SIM.
  //
  // For live usage we hit the esim usage endpoint per SIM — that endpoint
  // dispatches to the right supplier provider (eSIM vs. physical) and
  // returns the real volume/usage from upstream.
  // We fan this out in parallel after getSims() and merge the result in.
  const fetchUserSims = useCallback(async () => {
    if (!authService.isLoggedIn()) {
      console.log('[fetchUserSims] Not logged in, skipping');
      return;
    }
    try {
      const response = await userService.getSims();
      const convertedSims = response.list.map(convertUserSimToActiveSim);
      // #region agent log
      fetch('http://127.0.0.1:7893/ingest/14d3c5f8-7d82-4f89-8791-2a5c027b03b6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '243df2' },
        body: JSON.stringify({
          sessionId: '243df2',
        runId: 'post-fix',
        hypothesisId: 'H2',
        location: 'App.tsx:fetchUserSims',
          message: 'GET /app/users/sims merged list length',
          data: { fetchedCount: convertedSims.length },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setServerSims(convertedSims);

      // Per-SIM merge: Laravel usage (sim_assets) plus Red Tea fallback inside
      // `checkDataUsage`, then supplier `queryProfile` for plan name + region
      // label — GET /app/users/sims only returns iccid/status/supplier id.
      const patchResults = await Promise.all(
        convertedSims.map(async (sim) => {
          if (!sim.iccid) return null;
          const patch: Partial<ActiveSim> = {};

          try {
            const usage = await checkDataUsage(sim.iccid);
            const totalGB = usage.totalVolume / (1024 * 1024 * 1024);
            const usedGB = usage.usedVolume / (1024 * 1024 * 1024);
            if (Number.isFinite(totalGB) && Number.isFinite(usedGB)) {
              patch.dataTotalGB = Math.round(totalGB * 10) / 10;
              patch.dataUsedGB = Math.round(usedGB * 100) / 100;
            }
            const exp = normaliseExpiryIso(usage.expiredTime);
            if (exp) patch.expiryDate = exp;
          } catch {
            /* keep zeros from convertUserSimToActiveSim */
          }

          if (sim.type === 'ESIM') {
            try {
              const profile = await queryProfile(sim.iccid);
              const name = profile.packageName?.trim();
              if (name) {
                patch.plan = {
                  ...sim.plan,
                  name: '',
                  days: profile.totalDuration > 0 ? profile.totalDuration : sim.plan.days,
                };
                const region = deriveEsimCountryOverlay(name);
                if (region) {
                  patch.country = { ...sim.country, ...region };
                }
              }
              const profExp = normaliseExpiryIso(profile.expiredTime);
              if (profExp && !patch.expiryDate) patch.expiryDate = profExp;
              if ((patch.dataTotalGB ?? 0) <= 0 && profile.totalVolume > 0) {
                patch.dataTotalGB = Math.round((profile.totalVolume / (1024 * 1024 * 1024)) * 10) / 10;
              }
              if (profile.status?.trim()) {
                patch.status = mapRedTeaStatus(profile.status);
              }
            } catch {
              /* supplier preview optional */
            }
          }

          return Object.keys(patch).length > 0 ? { id: sim.id, patch } : null;
        }),
      );
      const byId = new Map(
        patchResults.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => [r.id, r.patch]),
      );
      if (byId.size > 0) {
        setServerSims((prev) =>
          prev.map((sim) => {
            const fresh = byId.get(sim.id);
            return fresh ? { ...sim, ...fresh } : sim;
          }),
        );
      }
    } catch (err) {
      console.error('[fetchUserSims] Failed:', err);
    } finally {
      setSimWalletHydrated(true);
    }
  }, []);

  // 登录成功后获取 SIM 卡列表
  useEffect(() => {
    if (isLoggedIn) {
      setSimWalletHydrated(false);
      fetchUserSims();
    } else {
      setServerSims([]);
      setSimWalletHydrated(true);
    }
  }, [isLoggedIn, fetchUserSims]);

  useEffect(() => { prefetchPackages(); }, []);

  // Fetch real notifications from Supabase (if configured) and merge with mocks
  const notifFetched = useRef(false);
  useEffect(() => {
    if (notifFetched.current || !supabaseConfigured) return;
    notifFetched.current = true;
    const lang = localStorage.getItem('evair-lang') || 'en';
    fetchNotifications(lang)
      .then(serverNotifs => {
        if (serverNotifs.length > 0) {
          setNotifications(prev => {
            const localOnly = prev.filter(n => n.id.startsWith('auto-') || n.id.startsWith('N-'));
            return [...serverNotifs, ...localOnly.filter(n => n.id.startsWith('auto-'))];
          });
        }
      })
      .catch(err => {
        // Notifications are best-effort — Supabase being temporarily
        // unreachable shouldn't surface as an unhandled rejection in
        // production logs. Reset the latch so a later retry (e.g. via
        // user re-login) can try again.
        console.warn('[notifications] fetch failed', err);
        notifFetched.current = false;
      });
  }, []);

  const addNotification = useCallback((notif: AppNotification) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === notif.id)) return prev;
      return [notif, ...prev];
    });
  }, []);

  const healthCheckRan = useRef(false);

  useEffect(() => {
    if (healthCheckRan.current || !isLoggedIn) return;
    healthCheckRan.current = true;

    const esims = activeSims.filter(s => s.type === 'ESIM' && s.iccid && s.status === 'ACTIVE');
    if (esims.length === 0) return;

    esims.forEach(async (sim) => {
      try {
        const usage = await checkDataUsage(sim.iccid!);
        const totalBytes = usage.totalVolume || 0;
        const usedBytes = usage.usedVolume || 0;
        const remainingBytes = Math.max(0, totalBytes - usedBytes);
        const remainingPct = totalBytes > 0 ? (remainingBytes / totalBytes) * 100 : 100;

        const remainingGB = (remainingBytes / (1024 * 1024 * 1024)).toFixed(1);
        const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(1);

        if (remainingPct < 20) {
          addNotification({
            id: `auto-data-low-${sim.iccid}`,
            type: 'data_low',
            titleKey: 'inbox.data_low_title',
            bodyKey: 'inbox.data_low_body_auto',
            date: new Date().toISOString(),
            read: false,
            actionLabel: 'inbox.top_up_now',
            countryCode: sim.country.countryCode,
            planName: `${remainingGB} GB / ${totalGB} GB`,
          });
        }

        if (usage.expiredTime) {
          const expiryDate = new Date(usage.expiredTime);
          const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0 && daysLeft <= 5) {
            addNotification({
              id: `auto-expiring-${sim.iccid}`,
              type: 'expiring',
              titleKey: 'inbox.expiring_title',
              bodyKey: 'inbox.expiring_body_auto',
              date: new Date().toISOString(),
              read: false,
              actionLabel: 'inbox.renew_plan',
              countryCode: sim.country.countryCode,
              planName: `${daysLeft}`,
            });
          }
        }
      } catch {
        // API call failed silently -- don't block the app
      }
    });
  }, [isLoggedIn, activeSims, addNotification]);

  const clearLogoutStorage = () => {
    // Session/auth related keys only. Keep UX preferences (e.g. language, FAB position).
    const localKeys = [
      'pending_esim_order',
      'evair_demo_sims',
      'evair-chat-draft',
      'evair-customer-id',
      'evair_access_token',
      'evair_refresh_token',
    ];
    const sessionKeys = [
      'evair-activeTab',
      'evair-simType',
    ];

    try {
      localKeys.forEach((key) => localStorage.removeItem(key));
    } catch {
      /* noop */
    }
    try {
      sessionKeys.forEach((key) => sessionStorage.removeItem(key));
    } catch {
      /* noop */
    }
  };

  // Push token cached so we can detach it on explicit logout.
  const pushTokenRef = useRef<string | null>(null);

  // 登录成功回调 - 接收后端返回的用户信息
  const handleLoginSuccess = (userData: UserDto) => {
    setIsLoggedIn(true);
    setUser({
      id: String(userData.id),
      name: userData.name,
      email: userData.email,
    });
    setIsLoginModalOpen(false);
    setProfileSheetAuth(null);

    // Fire-and-forget: inside the native shell, ask for notification
    // permission and ship the APNs/FCM token to Laravel. No-op in a
    // regular browser. See services/pushService.ts.
    initPush()
      .then((token) => {
        if (token) pushTokenRef.current = token;
      })
      .catch((err) => {
        console.warn('[push] initPush failed', err);
      });
  };

  // 登出处理
  const handleLogout = async () => {
    try {
      const token = pushTokenRef.current;
      if (token) {
        // Fire-and-forget; don't block logout on a slow backend.
        void unregisterPush(token);
        pushTokenRef.current = null;
      }
      await authService.logout();
    } finally {
      setIsLoggedIn(false);
      setUser(undefined);
      setActiveSims([]);
      setServerSims([]);
      clearLogoutStorage();
    }
  };

  const handlePurchaseComplete = (purchaseInfo?: { planName?: string; countryCode?: string; locationCode?: string; type?: SimType; orderNo?: string; iccid?: string; dataTotalGB?: number; durationDays?: number }) => {
    const currentType: SimType = purchaseInfo?.type ?? (activeTab === Tab.SIM_CARD ? 'PHYSICAL' : 'ESIM');
    const cc = purchaseInfo?.countryCode || 'US';
    const ccToFlag = (code: string) => code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');

    // Clamp obviously broken volumes: no eSIM plan exceeds ~200 GB in practice
    const MAX_SANE_GB = 500;
    const rawGB = purchaseInfo?.dataTotalGB || 3.0;
    const dataGB = rawGB > MAX_SANE_GB ? 3.0 : rawGB;
    const days = purchaseInfo?.durationDays || 30;

    const CC_NAME: Record<string, string> = {
      US:'United States',CA:'Canada',MX:'Mexico',BR:'Brazil',CO:'Colombia',CR:'Costa Rica',
      DO:'Dominican Republic',AR:'Argentina',CL:'Chile',PE:'Peru',EC:'Ecuador',
      GB:'United Kingdom',DE:'Germany',FR:'France',ES:'Spain',IT:'Italy',NL:'Netherlands',
      CH:'Switzerland',SE:'Sweden',NO:'Norway',DK:'Denmark',FI:'Finland',AT:'Austria',
      BE:'Belgium',PL:'Poland',PT:'Portugal',GR:'Greece',IE:'Ireland',CZ:'Czech Republic',
      HU:'Hungary',RO:'Romania',BG:'Bulgaria',HR:'Croatia',SI:'Slovenia',SK:'Slovakia',
      RU:'Russia',TR:'Turkey',UA:'Ukraine',
      JP:'Japan',KR:'South Korea',CN:'China',TW:'Taiwan',HK:'Hong Kong',MO:'Macau',
      SG:'Singapore',TH:'Thailand',MY:'Malaysia',ID:'Indonesia',VN:'Vietnam',PH:'Philippines',
      IN:'India',AE:'United Arab Emirates',SA:'Saudi Arabia',IL:'Israel',
      AU:'Australia',NZ:'New Zealand',
      ZA:'South Africa',EG:'Egypt',NG:'Nigeria',KE:'Kenya',MA:'Morocco',
    };
    const countryName = CC_NAME[cc] || purchaseInfo?.planName || cc;

    const country = MOCK_COUNTRIES.find(c => c.countryCode === cc) || {
        id: cc.toLowerCase(),
        name: countryName,
        flag: ccToFlag(cc),
        countryCode: cc,
        region: '',
        startPrice: 0,
        networkCount: 0,
        networks: [],
        vpmn: '',
        vpn: false,
        plans: [],
        isPopular: false,
    };

    const isPhysical = currentType === 'PHYSICAL';
    const newSim: ActiveSim = {
        id: `${currentType}-${Math.floor(Math.random() * 10000)}`,
        iccid: purchaseInfo?.iccid,
        country,
        locationCode: purchaseInfo?.locationCode,
        plan: { id: `plan-${Date.now()}`, name: purchaseInfo?.planName || 'eSIM Plan', data: `${dataGB} GB`, days, price: 0, features: [] },
        type: currentType,
        activationDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        dataTotalGB: dataGB,
        dataUsedGB: 0.0,
        status: currentType === 'ESIM' ? 'NEW' : 'PENDING_ACTIVATION',
        ...(isPhysical && {
            orderNo: `ORD-${Date.now()}`,
            trackingNumber: `SF${Math.floor(1000000000 + Math.random() * 9000000000)}HK`,
            purchaseSource: 'IN_APP' as const,
        }),
    };
    setActiveSims([newSim, ...activeSims]);

    const planLabel = purchaseInfo?.planName || (currentType === 'ESIM' ? 'eSIM' : 'SIM Card');
    const isEsim = currentType === 'ESIM';

    addNotification({
      id: `N-${Date.now()}`,
      type: 'order',
      titleKey: isEsim ? 'inbox.esim_order_title' : 'inbox.sim_order_title',
      bodyKey: isEsim ? 'inbox.esim_order_body' : 'inbox.sim_order_body',
      date: new Date().toISOString(),
      read: false,
      actionLabel: isEsim ? 'inbox.install_now' : 'inbox.track_order',
      countryCode: purchaseInfo?.countryCode,
      planName: planLabel,
      orderNo: purchaseInfo?.orderNo,
    });
  };

  const handleDeleteSim = (simId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7893/ingest/14d3c5f8-7d82-4f89-8791-2a5c027b03b6', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '243df2' },
      body: JSON.stringify({
        sessionId: '243df2',
        runId: 'post-fix',
        hypothesisId: 'H3',
        location: 'App.tsx:handleDeleteSim',
        message: 'parent delete handler entry',
        data: {
          simId,
          serverSimsLen: serverSims.length,
          activeSimsLen: activeSims.length,
          serverBindingIdsSample: serverSims.slice(0, 5).map((s) => s.id),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    setActiveSims(prev => prev.filter(s => s.id !== simId));
    setServerSims(prev => prev.filter(s => s.id !== simId));
    // Re-fetch from server to ensure consistency
    fetchUserSims();
  };

  const handleUpdateSim = useCallback((simId: string, updates: Partial<ActiveSim>) => {
    setActiveSims(prev => prev.map(s => s.id === simId ? { ...s, ...updates } : s));
  }, []);

  const handleAddCard = async (iccid: string, profile?: EsimProfileResult, activationCode?: string) => {
    try {
      console.log('[handleAddCard] Calling bindSim API with iccid:', iccid);
      await bindSim(iccid, activationCode);
      console.log('[handleAddCard] bindSim succeeded, updating local state');
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('already bound') || msg.includes('already exist')) {
        console.warn('[handleAddCard] SIM already bound — treating as success, adding to wallet');
      } else {
        console.error('[handleAddCard] bindSim failed:', err);
        throw err;
      }
    }

    const pkgName = profile?.packageName || '';

    const COUNTRY_NAME_TO_CODE: Record<string, string> = {
      'united states': 'US', 'usa': 'US', 'china': 'CN', 'china mainland': 'CN',
      'japan': 'JP', 'korea': 'KR', 'south korea': 'KR', 'canada': 'CA',
      'mexico': 'MX', 'united kingdom': 'GB', 'uk': 'GB', 'australia': 'AU',
      'france': 'FR', 'germany': 'DE', 'italy': 'IT', 'spain': 'ES',
      'thailand': 'TH', 'singapore': 'SG', 'malaysia': 'MY', 'taiwan': 'TW',
      'hong kong': 'HK', 'macau': 'MO', 'india': 'IN', 'indonesia': 'ID',
      'vietnam': 'VN', 'philippines': 'PH', 'brazil': 'BR', 'turkey': 'TR',
      'dominican republic': 'DO', 'colombia': 'CO', 'costa rica': 'CR',
      'new zealand': 'NZ', 'ireland': 'IE', 'netherlands': 'NL', 'portugal': 'PT',
      'greece': 'GR', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
      'switzerland': 'CH', 'austria': 'AT', 'belgium': 'BE', 'poland': 'PL',
    };

    let countryCode = 'US';
    let countryName = 'United States';
    const lowerPkg = pkgName.toLowerCase();
    for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
      if (lowerPkg.startsWith(name)) {
        countryCode = code;
        countryName = pkgName.substring(0, name.length).replace(/\b\w/g, c => c.toUpperCase());
        break;
      }
    }

    let totalGB = profile?.totalVolume
      ? profile.totalVolume / (1024 * 1024 * 1024)
      : 10;
    if (totalGB > 500) totalGB = 10;
    const durationDays = profile?.totalDuration || 30;
    const redTeaStatus = mapRedTeaStatus(profile?.status || '');

    // Use functional update to avoid stale closure
    setActiveSims(prev => {
      const existingSim = prev.find(s => s.iccid === iccid);
      if (existingSim) {
        return prev.map(s => s.iccid === iccid ? {
          ...s,
          status: redTeaStatus,
          dataTotalGB: Math.round(totalGB * 10) / 10,
          dataUsedGB: profile?.usedVolume ? profile.usedVolume / (1024 * 1024 * 1024) : s.dataUsedGB,
        } : s);
      }

      const flag = countryCode.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
      const carrier = retailCarrierRowForIso(countryCode);

      const country = {
        id: countryCode.toLowerCase(),
        name: countryName,
        flag,
        countryCode,
        region: '',
        startPrice: 0,
        networkCount: 0,
        networks: carrier ? [carrier.carrier] : [],
        vpmn: '',
        vpn: true,
        plans: [],
        isPopular: false,
      };

      const plan = MOCK_PLANS_US[0];

      const newSim: ActiveSim = {
        id: `SIM-PHYS-${Math.floor(Math.random() * 10000)}`,
        iccid,
        country,
        plan,
        type: 'PHYSICAL',
        activationDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
        dataTotalGB: Math.round(totalGB * 10) / 10,
        dataUsedGB: profile?.usedVolume ? profile.usedVolume / (1024 * 1024 * 1024) : 0,
        status: redTeaStatus,
      };
      return [newSim, ...prev];
    });

    // Log activation to Supabase for analytics (fire-and-forget)
    logSimActivation({
      iccid,
      device: /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone' : /Android/i.test(navigator.userAgent) ? 'Android' : 'other',
      user_agent: navigator.userAgent.slice(0, 512),
    }).catch(() => {});

    // Re-fetch user SIMs to ensure serverSims is in sync
    fetchUserSims();
  };

  const ProtectedView = ({ title }: { title: string }) => (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center pt-10">
      <div className="w-24 h-24 bg-white/40 backdrop-blur-xl border border-white/50 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-black/5">
        <Lock size={32} className="text-slate-400" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 mb-8 leading-relaxed">Please sign in to access your {title.toLowerCase()}.</p>
      <button 
        onClick={() => setIsLoginModalOpen(true)}
        className="w-full max-w-xs bg-brand-orange hover:bg-orange-600 text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
      >
        Sign In
      </button>
    </div>
  );

  // Resolve initial SimType from URL hash first, then sessionStorage.
  // Same rationale as activeTab above — without this a customer
  // landing on `/app#esim` would briefly see the PHYSICAL view (the
  // SIM-Card landing) before the hash effect rewrote currentSimType.
  // `#sim-card`, `#bind-sim`, and `#esim` map onto SimType; other hashes
  // leave the previous selection alone.
  const [currentSimType, setCurrentSimType] = useState<SimType>(() => {
    if (typeof window !== 'undefined') {
      if (parseAppTravelEsimCountry(window.location.pathname)) return 'ESIM';
      const hash = window.location.hash.toLowerCase();
      if (hash === '#esim' || hash === '#shop') return 'ESIM';
      if (hash === '#sim-card' || hash === '#bind-sim') return 'PHYSICAL';
    }
    return (sessionStorage.getItem('evair-simType') as SimType) || 'PHYSICAL';
  });

  useEffect(() => {
    if (currentSimType === 'ESIM') {
      setPendingBindSimDeepLink(false);
    }
  }, [currentSimType]);

  useEffect(() => {
    const persist =
      shellFloatOpen
        ? (currentSimType === 'PHYSICAL' ? Tab.SIM_CARD : Tab.ESIM)
        : activeTab;
    sessionStorage.setItem('evair-activeTab', persist);
  }, [shellFloatOpen, currentSimType, activeTab]);

  useEffect(() => {
    sessionStorage.setItem('evair-simType', currentSimType);
  }, [currentSimType]);

  const syncAppHash = useCallback((tab: Tab) => {
    if (typeof window === 'undefined') return;
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search || ''}${hashFragmentForTab(tab)}`);
  }, []);

  const closeShellFloat = useCallback(() => {
    const base = currentSimType === 'PHYSICAL' ? Tab.SIM_CARD : Tab.ESIM;
    setActiveTab(base);
    syncAppHash(base);
    window.scrollTo(0, 0);
  }, [currentSimType, syncAppHash]);

  const handleTabChange = useCallback(
    (tab: Tab) => {
      previousTab.current = activeTabRef.current;
      setActiveTab(tab);
      syncAppHash(tab);
      window.scrollTo(0, 0);
    },
    [syncAppHash],
  );

  /** Shop header Live Chat: `activeTab` can be INBOX/PROFILE (wide floater) while Store is visible — `handleTabChange(DIALER)` would save INBOX as previous. */
  const openContactFromBrowseShop = useCallback(() => {
    const backTab = currentSimType === 'PHYSICAL' ? Tab.SIM_CARD : Tab.ESIM;
    previousTab.current = backTab;
    setActiveTab(Tab.DIALER);
    syncAppHash(Tab.DIALER);
    window.scrollTo(0, 0);
  }, [currentSimType, syncAppHash]);

  useEffect(() => {
    const openFromEdgeTab = () => {
      openContactFromBrowseShop();
    };
    window.addEventListener(EVAIR_OPEN_APP_SHELL_CHAT, openFromEdgeTab);
    return () => window.removeEventListener(EVAIR_OPEN_APP_SHELL_CHAT, openFromEdgeTab);
  }, [openContactFromBrowseShop]);

  const handleProfileLinkExistingEsim = useCallback(() => {
    if (currentSimType !== 'ESIM') return;
    handleTabChange(Tab.ESIM);
    queueMicrotask(() => setLinkEsimProfileNonce((n) => n + 1));
  }, [currentSimType, handleTabChange]);

  const handleSwitchSimType = (type: SimType) => {
    setCurrentSimType(type);
    if (type === 'PHYSICAL') {
      setActiveTab(Tab.SIM_CARD);
      syncAppHash(Tab.SIM_CARD);
    } else {
      setActiveTab(Tab.ESIM);
      syncAppHash(Tab.ESIM);
    }
    window.scrollTo(0, 0);
  };

  const renderBrowseProductTab = () => (
    <ProductTab
      key={currentSimType}
      type={currentSimType}
      isLoggedIn={isLoggedIn}
      user={user}
      onLoginRequest={() => setIsLoginModalOpen(true)}
      onPurchaseComplete={handlePurchaseComplete}
      onAddCard={handleAddCard}
      onDeleteSim={handleDeleteSim}
      onUpdateSim={handleUpdateSim}
      activeSims={serverSims.length > 0 ? serverSims : activeSims}
      onNavigate={handleTabChange}
      onSwitchSimType={handleSwitchSimType}
      notifications={notifications}
      testMode={testMode}
      initialEsimLocationCode={travelEsimOpenCode}
      onInitialEsimDeepLinkConsumed={handleTravelEsimDeepLinkConsumed}
      initialBindSimDeepLink={pendingBindSimDeepLink && currentSimType === 'PHYSICAL'}
      onBindSimDeepLinkConsumed={clearBindSimDeepLink}
      onLinkedEsimRefresh={fetchUserSims}
      simWalletHydrated={simWalletHydrated}
      externalLinkExistingEsimNonce={linkEsimProfileNonce}
    />
  );

  const renderContent = () => {
    if (shellFloatOpen) {
      return (
        <>
          {renderBrowseProductTab()}
          <AppShellFloater
            open
            onClose={closeShellFloat}
            ariaLabel={activeTab === Tab.PROFILE ? t('profile.title') : t('profile.inbox')}
          >
            {activeTab === Tab.PROFILE ? (
              <ProfileView
                embedded
                isLoggedIn={isLoggedIn}
                user={user}
                onLogin={() => {
                  setProfileSheetAuth('login');
                }}
                onSignup={() => {
                  setProfileSheetAuth('register');
                }}
                onLogout={handleLogout}
                onOpenDialer={() => {
                  handleTabChange(Tab.DIALER);
                }}
                onOpenInbox={() => {
                  handleTabChange(Tab.INBOX);
                }}
                notifications={notifications}
                onBack={closeShellFloat}
                onUserUpdate={(updatedUser) =>
                  setUser(prev => (prev ? { ...prev, ...updatedUser } : undefined))
                }
                onLinkExistingEsim={
                  currentSimType === 'ESIM' ? handleProfileLinkExistingEsim : undefined
                }
              />
            ) : (
              <InboxView
                embedded
                notifications={notifications}
                onUpdateNotifications={setNotifications}
                onNavigate={(tabStr) => {
                  if (tabStr === 'ESIM') handleTabChange(Tab.ESIM);
                  else if (tabStr === 'SIM_CARD') handleTabChange(Tab.SIM_CARD);
                }}
                onBack={closeShellFloat}
              />
            )}
          </AppShellFloater>
        </>
      );
    }

    switch (activeTab) {
      case Tab.SIM_CARD:
      case Tab.ESIM:
        return renderBrowseProductTab();
      case Tab.INBOX:
        return (
          <InboxView
            notifications={notifications}
            onUpdateNotifications={setNotifications}
            onNavigate={(tabStr) => {
              if (tabStr === 'ESIM') handleTabChange(Tab.ESIM);
              else if (tabStr === 'SIM_CARD') handleTabChange(Tab.SIM_CARD);
            }}
            onBack={() => handleTabChange(previousTab.current)}
          />
        );
      case Tab.PROFILE:
        return (
          <ProfileView
            isLoggedIn={isLoggedIn}
            user={user}
            onLogin={() => {
              setProfileSheetAuth('login');
            }}
            onSignup={() => {
              setProfileSheetAuth('register');
            }}
            onLogout={handleLogout}
            onOpenDialer={() => {
              previousTab.current = activeTab;
              handleTabChange(Tab.DIALER);
            }}
            onOpenInbox={() => {
              previousTab.current = activeTab;
              handleTabChange(Tab.INBOX);
            }}
            notifications={notifications}
            onBack={() =>
              handleTabChange(currentSimType === 'PHYSICAL' ? Tab.SIM_CARD : Tab.ESIM)
            }
            onUserUpdate={(updatedUser) =>
              setUser(prev => (prev ? { ...prev, ...updatedUser } : undefined))
            }
            onLinkExistingEsim={
              currentSimType === 'ESIM' ? handleProfileLinkExistingEsim : undefined
            }
          />
        );
      case Tab.DIALER:
        return (
          <ContactUsView
            onBack={() => {
              handleTabChange(previousTab.current);
            }}
            userName={user?.name}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={
        showStoreLayout
          ? 'min-h-screen bg-white font-sans antialiased selection:bg-orange-100'
          : 'lg:bg-[#E5E5E5] lg:h-full lg:min-h-screen lg:flex lg:items-center lg:justify-center lg:p-8 font-sans antialiased selection:bg-orange-100'
      }
    >

      {/* Phone preview frame vs full-bleed store.
          Native shell / `#app-preview`: eSIM uses the **condensed** chrome (same as SIM Card).
          Normal browsers: eSIM stays full-bleed at all widths; other tabs use full-bleed from `md`+. */}
      <div
        ref={phoneRef}
        className={
          showStoreLayout
            ? 'w-full bg-white relative'
            : 'phone-frame-fit w-full bg-[#F2F4F7] lg:rounded-[3.5rem] lg:overflow-hidden lg:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] relative lg:border-[8px] lg:border-slate-900 lg:ring-1 lg:ring-black/50'
        }
      >

        {/* Generic status bar — only visible in desktop phone frame.
            Hidden entirely in store layout because there is no
            phone frame to put a status bar inside of. */}
        {!showStoreLayout && (
          <div className="hidden lg:block relative z-50 shrink-0 bg-[#F2F4F7]">
            <div className="relative h-[54px]">
              <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-[24px] z-10" />
              <span className="absolute left-5 top-4 text-[15px] font-semibold text-[#1a1a1a]" style={{ fontFamily: 'system-ui, sans-serif' }}>12:18</span>
              <div className="absolute right-5 top-[18px] flex items-center gap-[6px]">
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="5" width="3" height="7" rx="1" fill="#1a1a1a"/><rect x="4.5" y="3" width="3" height="9" rx="1" fill="#1a1a1a"/><rect x="9" y="1" width="3" height="11" rx="1" fill="#1a1a1a"/><rect x="13" y="0" width="3" height="12" rx="1" fill="#1a1a1a" opacity="0.3"/></svg>
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 2.5C5.5 2.5 3.3 3.5 1.7 5.1L0.3 3.7C2.3 1.7 4.9 0.5 8 0.5s5.7 1.2 7.7 3.2L14.3 5.1C12.7 3.5 10.5 2.5 8 2.5z" fill="#1a1a1a" opacity="0.3"/><path d="M8 6.5c-1.7 0-3.2.7-4.3 1.8L2.3 6.9C3.8 5.4 5.8 4.5 8 4.5s4.2.9 5.7 2.4L12.3 8.3C11.2 7.2 9.7 6.5 8 6.5z" fill="#1a1a1a"/><circle cx="8" cy="11" r="1.5" fill="#1a1a1a"/></svg>
                <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0" y="0.5" width="21" height="11" rx="2.5" stroke="#1a1a1a" strokeWidth="1"/><rect x="1.5" y="2" width="16" height="8" rx="1.5" fill="#1a1a1a"/><rect x="22" y="3.5" width="2.5" height="5" rx="1" fill="#1a1a1a" opacity="0.4"/></svg>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area.
            In phone-mock mode we subtract the 54-px status bar from
            the parent's height so the inner scroll fits exactly.
            In store mode there is no status bar, so we let the page
            grow naturally (`min-h-screen`) and rely on the body's
            normal scroll. */}
        <main
          className={
            showStoreLayout
              ? 'w-full relative flex flex-col min-h-screen'
              : 'w-full relative lg:overflow-hidden flex flex-col'
          }
          style={showStoreLayout ? undefined : { height: 'calc(100% - 54px)' }}
        >
          {testMode ? (
            <div className="shrink-0 bg-amber-400 text-amber-950 px-3 py-2 z-50 border-b border-amber-500/30 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide">
                <Zap size={14} className="shrink-0" aria-hidden />
                {t('app.test_mode_banner')}
              </span>
              <span className="text-[11px] font-medium text-amber-900/90 w-full sm:w-auto sm:inline">
                {t('app.test_mode_subline')}
              </span>
              <button
                type="button"
                onClick={exitTestMode}
                className="text-[10px] font-bold uppercase tracking-wide bg-amber-950/15 hover:bg-amber-950/25 px-2 py-1 rounded-md transition-colors"
              >
                {t('app.test_mode_exit')}
              </button>
            </div>
          ) : activeTab !== Tab.DIALER ? (
            // When the test banner is hidden, inject a safe-area spacer so
            // the iPhone notch / Android status bar doesn't overlap the
            // first row of UI (e.g. the "Hello New Friend" greeting).
            // Contact Support fills its own orange header with inset — skip
            // this white strip so the chat bar meets the viewport edge.
            // Desktop (lg) is inside a mock phone frame so it doesn't
            // need the inset; `lg:hidden` keeps the mock pixel-perfect.
            <div
              className="shrink-0 lg:hidden bg-white"
              style={{ height: 'env(safe-area-inset-top, 0px)' }}
              aria-hidden
            />
          ) : null}
          {/* Inner content wrapper.
              Phone-mock: `min-h-0 overflow-hidden` so the inner view
              owns its own scroll inside the fixed-height phone frame.
              Store layout: drop the height/overflow constraints so
              the eSIM catalogue can grow freely and the body
              provides the page-level scroll. */}
          <div className={showStoreLayout ? 'flex-1' : 'flex-1 min-h-0 overflow-hidden'}>
            {renderContent()}
          </div>
        </main>

        <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLogin={handleLoginSuccess}
            initialMode={loginModalMode}
        />

        <GuestAuthSheet
            open={profileSheetAuth !== null}
            initialMode={profileSheetAuth === 'register' ? 'register' : 'login'}
            onClose={() => setProfileSheetAuth(null)}
            onSuccess={handleLoginSuccess}
        />

        <MobileOnlyNotice
          open={desktopAppQr.open}
          onClose={desktopAppQr.onClose}
          onContinueAnyway={desktopAppQr.onContinueAnyway}
        />

      </div>
    </div>
  );
}

export default App;
