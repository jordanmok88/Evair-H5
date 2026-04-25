import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import BottomNav from './components/BottomNav';
import ProductTab from './views/ProductTab';
import ProfileView from './views/ProfileView';
import LoginModal from './views/LoginModal';
import DialerView from './views/DialerView';
import ContactUsView from './views/ContactUsView';
import InboxView from './views/InboxView';
import ApiTestPage from './views/ApiTestPage';
import ActivatePage from './views/ActivatePage';
import TopUpPage from './views/TopUpPage';
import MarketingPage from './views/MarketingPage';
import DeviceLandingPage from './views/DeviceLandingPage';
import TravelEsimPage from './views/TravelEsimPage';
import HelpCenterPage from './views/HelpCenterPage';
import BlogPage from './views/BlogPage';
import { Tab, ActiveSim, SimType, User, AppNotification, EsimProfileResult } from './types';
import { Lock } from 'lucide-react';
import { MOCK_COUNTRIES, MOCK_PLANS_US, MOCK_ACTIVE_SIMS, MOCK_NOTIFICATIONS, CARRIER_MAP } from './constants';
import { checkDataUsage, prefetchPackages, DEMO_MODE, mapRedTeaStatus, bindSim } from './services/dataService';
import { supabaseConfigured, fetchNotifications, logSimActivation } from './services/supabase';
import { authService, userService, type UserDto } from './services/api';
import { initPush, unregisterPush } from './services/pushService';
import { computeTestModeEnabled, dismissTestModeForSession, isAppPath, isAppPreviewHash, stripTestModeFromUrl } from './utils/testMode';
import { getRoute, type Route } from './utils/routing';

function App() {

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

  // Tab title override. Three surfaces own the document title:
  //   1. /activate(*)    → "Activate your Evair SIM"
  //   2. /app(*) or
  //      desktop dev-only `#app-preview` hash → "Evair APP"
  //      (the latter is what start-all-previews.sh opens for QA).
  //   3. anything else   → "Evair H5"
  useEffect(() => {
    const applyTitle = () => {
      if (route.kind === 'activate') {
        document.title = 'Activate your Evair SIM';
      } else if (route.kind === 'topup') {
        document.title = 'Top up your Evair SIM';
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
      } else if (isAppPreviewHash() || isAppPath()) {
        document.title = 'Evair APP';
      } else if (document.title === 'Evair APP') {
        document.title = 'Evair H5';
      }
    };
    applyTitle();
  }, [route]);

  if (route.kind === 'apiTest') return <ApiTestPage />;
  if (route.kind === 'activate') return <ActivatePage iccid={route.iccid} />;
  if (route.kind === 'topup') return <TopUpPage iccid={route.iccid} />;
  if (route.kind === 'marketing') return <MarketingPage />;
  if (route.kind === 'device') return <DeviceLandingPage category={route.category} />;
  if (route.kind === 'travel') return <TravelEsimPage countryCode={route.countryCode} />;
  if (route.kind === 'help') return <HelpCenterPage slug={route.slug} />;
  if (route.kind === 'blog') return <BlogPage slug={route.slug} />;

  return <CustomerApp />;
}

function CustomerApp() {
  const { t } = useTranslation();
  const phoneRef = useRef<HTMLDivElement>(null);
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
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
        });
      })
      .catch(() => {
        // 如果获取失败，清除 token 让用户重新登录
        authService.logout();
        userFetched.current = false;
      });
  }, []);


  const [activeTab, setActiveTab] = useState<Tab>(
    () => (sessionStorage.getItem('evair-activeTab') as Tab) || Tab.SIM_CARD
  );
  const previousTab = useRef<Tab>(Tab.SIM_CARD);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
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
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);

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
  const convertUserSimToActiveSim = (userSim: {
    id: string;
    iccid: string;
    type: 'ESIM' | 'PHYSICAL';
    packageName: string;
    countryCode: string | null;
    status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'INACTIVE';
    totalVolume: number;
    usedVolume: number;
    expiredTime: string;
    activationDate: string | null;
  }): ActiveSim => {
    let totalGB = userSim.totalVolume / (1024 * 1024 * 1024);
    let usedGB = userSim.usedVolume / (1024 * 1024 * 1024);
    if (totalGB > 500) totalGB = 3;
    if (usedGB > totalGB) usedGB = 0;

    // 国家码到信息映射
    const countryCodeToInfo: Record<string, { name: string; flag: string }> = {
      'US': { name: 'United States', flag: '🇺🇸' },
      'CN': { name: 'China', flag: '🇨🇳' },
      'JP': { name: 'Japan', flag: '🇯🇵' },
      'KR': { name: 'South Korea', flag: '🇰🇷' },
      'GB': { name: 'United Kingdom', flag: '🇬🇧' },
      'AU': { name: 'Australia', flag: '🇦🇺' },
      'CA': { name: 'Canada', flag: '🇨🇦' },
      'DE': { name: 'Germany', flag: '🇩🇪' },
      'FR': { name: 'France', flag: '🇫🇷' },
      'SG': { name: 'Singapore', flag: '🇸🇬' },
      'TH': { name: 'Thailand', flag: '🇹🇭' },
      'MY': { name: 'Malaysia', flag: '🇲🇾' },
      'ID': { name: 'Indonesia', flag: '🇮🇩' },
      'VN': { name: 'Vietnam', flag: '🇻🇳' },
      'PH': { name: 'Philippines', flag: '🇵🇭' },
      'TW': { name: 'Taiwan', flag: '🇹🇼' },
      'HK': { name: 'Hong Kong', flag: '🇭🇰' },
      'IN': { name: 'India', flag: '🇮🇳' },
      'BR': { name: 'Brazil', flag: '🇧🇷' },
      'TR': { name: 'Turkey', flag: '🇹🇷' },
      'MX': { name: 'Mexico', flag: '🇲🇽' },
      'ES': { name: 'Spain', flag: '🇪🇸' },
      'IT': { name: 'Italy', flag: '🇮🇹' },
      'NL': { name: 'Netherlands', flag: '🇳🇱' },
      'CH': { name: 'Switzerland', flag: '🇨🇭' },
      'SE': { name: 'Sweden', flag: '🇸🇪' },
      'NO': { name: 'Norway', flag: '🇳🇴' },
      'DK': { name: 'Denmark', flag: '🇩🇰' },
      'FI': { name: 'Finland', flag: '🇫🇮' },
      'NZ': { name: 'New Zealand', flag: '🇳🇿' },
    };

    // 从 packageName 提取国家信息（如 "United States 1GB 7Days" -> "US"）
    const extractCountryFromPackageName = (packageName: string): { code: string; name: string; flag: string } => {
      // 匹配包名开头可能是国家名的地方
      for (const [code, info] of Object.entries(countryCodeToInfo)) {
        if (packageName.toLowerCase().startsWith(info.name.toLowerCase()) ||
            packageName.toLowerCase().startsWith(code.toLowerCase())) {
          return { code, ...info };
        }
      }
      return { code: '', name: 'Unknown', flag: '🌍' };
    };

    // 优先使用 countryCode，否则从 packageName 提取
    const countryCode = userSim.countryCode ||
      (userSim.packageName.startsWith('United States') || userSim.packageName.startsWith('USA') ? 'US' : '');
    const countryInfo = countryCode && countryCodeToInfo[countryCode]
      ? { code: countryCode, ...countryCodeToInfo[countryCode] }
      : extractCountryFromPackageName(userSim.packageName);

    // 转换状态：inactive/INACTIVE -> PENDING_ACTIVATION
    const mapStatus = (status: string): ActiveSim['status'] => {
      const upper = status.toUpperCase();
      if (upper === 'PENDING' || upper === 'INACTIVE') return 'PENDING_ACTIVATION';
      return status as ActiveSim['status'];
    };

    return {
      id: userSim.id,
      iccid: userSim.iccid,
      country: {
        id: countryInfo.code.toLowerCase(),
        name: countryInfo.name,
        flag: countryInfo.flag,
        countryCode: countryInfo.code,
        region: '',
        startPrice: 0,
        networkCount: 0,
        networks: [],
        vpmn: '',
        vpn: true,
        plans: [],
        isPopular: false,
      },
      plan: {
        id: userSim.id,
        name: userSim.packageName,
        data: `${totalGB.toFixed(1)} GB`,
        days: 30, // 默认值
        price: 0,
        features: [],
      },
      type: userSim.type,
      activationDate: userSim.activationDate || new Date().toISOString(),
      expiryDate: userSim.expiredTime,
      dataTotalGB: Math.round(totalGB * 10) / 10,
      dataUsedGB: Math.round(usedGB * 10) / 10,
      status: mapStatus(userSim.status),
    };
  };

  // 从后端获取用户 SIM 卡列表 + 实时用量
  //
  // `/h5/user/sims` returns the bound-SIM list with the cached
  // `traffic_limit` / `traffic_usage` columns from our DB — which for PCCW
  // physical SIMs is usually the purchased-plan total with `used=0`, so the
  // UI would show "3 GB / 3 GB remaining, 0 used" even when the card has
  // actually consumed data.
  //
  // For live usage we hit `/h5/esim/{iccid}/usage` per SIM — that endpoint
  // dispatches to the right supplier provider (EsimAccess for eSIMs, PCCW
  // for physical SIMs) and returns the real volume/usage from upstream.
  // We fan this out in parallel after getSims() and merge the result in.
  const fetchUserSims = useCallback(async () => {
    if (!authService.isLoggedIn()) {
      console.log('[fetchUserSims] Not logged in, skipping');
      return;
    }
    try {
      const response = await userService.getSims();
      const convertedSims = response.list.map(convertUserSimToActiveSim);
      setServerSims(convertedSims);

      // Fan-out live usage refresh (PCCW / EsimAccess) — best-effort; on
      // any single-SIM failure we keep the cached DB values rather than
      // blanking the card.
      const usageResults = await Promise.all(
        convertedSims.map(async (sim) => {
          if (!sim.iccid) return null;
          try {
            const usage = await checkDataUsage(sim.iccid);
            const totalGB = usage.totalVolume / (1024 * 1024 * 1024);
            const usedGB = usage.usedVolume / (1024 * 1024 * 1024);
            if (!Number.isFinite(totalGB) || !Number.isFinite(usedGB)) return null;
            return {
              id: sim.id,
              dataTotalGB: Math.round(totalGB * 10) / 10,
              dataUsedGB: Math.round(usedGB * 100) / 100,
              expiryDate: usage.expiredTime || sim.expiryDate,
            };
          } catch {
            return null;
          }
        }),
      );
      const byId = new Map(
        usageResults.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => [r.id, r]),
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
    }
  }, []);

  // 登录成功后获取 SIM 卡列表
  useEffect(() => {
    if (isLoggedIn) {
      fetchUserSims();
    } else {
      setServerSims([]);
    }
  }, [isLoggedIn, fetchUserSims]);

  useEffect(() => { prefetchPackages(); }, []);

  // Fetch real notifications from Supabase (if configured) and merge with mocks
  const notifFetched = useRef(false);
  useEffect(() => {
    if (notifFetched.current || !supabaseConfigured) return;
    notifFetched.current = true;
    const lang = localStorage.getItem('evair-lang') || 'en';
    fetchNotifications(lang).then(serverNotifs => {
      if (serverNotifs.length > 0) {
        setNotifications(prev => {
          const localOnly = prev.filter(n => n.id.startsWith('auto-') || n.id.startsWith('N-'));
          return [...serverNotifs, ...localOnly.filter(n => n.id.startsWith('auto-'))];
        });
      }
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

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  // Push token cached so we can detach it on explicit logout.
  const pushTokenRef = useRef<string | null>(null);

  // 登录成功回调 - 接收后端返回的用户信息
  const handleLoginSuccess = (userData: UserDto) => {
    setIsLoggedIn(true);
    setUser({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
    });
    setIsLoginModalOpen(false);

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
      const carrier = CARRIER_MAP[countryCode];

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

  const [currentSimType, setCurrentSimType] = useState<SimType>(
    () => (sessionStorage.getItem('evair-simType') as SimType) || 'PHYSICAL'
  );

  useEffect(() => {
    sessionStorage.setItem('evair-activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('evair-simType', currentSimType);
  }, [currentSimType]);

  const handleSwitchSimType = (type: SimType) => {
    setCurrentSimType(type);
    if (type === 'PHYSICAL') setActiveTab(Tab.SIM_CARD);
    else setActiveTab(Tab.ESIM);
    window.scrollTo(0, 0);
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.SIM_CARD:
      case Tab.ESIM:
        return (
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
            />
        );
      case Tab.INBOX:
        return <InboxView notifications={notifications} onUpdateNotifications={setNotifications} onNavigate={(tab) => setActiveTab(tab as Tab)} onBack={() => { setActiveTab(previousTab.current); window.scrollTo(0,0); }} />;
      case Tab.PROFILE:
        return (
            <ProfileView
                isLoggedIn={isLoggedIn}
                user={user}
                onLogin={() => { setLoginModalMode('LOGIN'); setIsLoginModalOpen(true); }}
                onSignup={() => { setLoginModalMode('REGISTER'); setIsLoginModalOpen(true); }}
                onLogout={handleLogout}
                onOpenDialer={() => { previousTab.current = activeTab; setActiveTab(Tab.DIALER); }}
                onOpenInbox={() => { previousTab.current = activeTab; setActiveTab(Tab.INBOX); }}
                notifications={notifications}
                onBack={() => { setActiveTab(currentSimType === 'PHYSICAL' ? Tab.SIM_CARD : Tab.ESIM); window.scrollTo(0,0); }}
                onUserUpdate={(updatedUser) => setUser(prev => prev ? { ...prev, ...updatedUser } : undefined)}
            />
        );
      case Tab.DIALER:
        return <ContactUsView onBack={() => { setActiveTab(previousTab.current); window.scrollTo(0,0); }} userName={user?.name} />;
      default:
        return null;
    }
  };

  return (
    <div className="lg:bg-[#E5E5E5] lg:h-full lg:min-h-screen lg:flex lg:items-center lg:justify-center lg:p-8 font-sans antialiased selection:bg-orange-100">
      
      <div ref={phoneRef} className="w-full lg:max-w-[430px] lg:h-[880px] bg-[#F2F4F7] lg:rounded-[3.5rem] lg:overflow-hidden lg:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] relative lg:border-[8px] lg:border-slate-900 lg:ring-1 lg:ring-black/50">
        
        {/* Generic status bar — only visible in desktop phone frame */}
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

        {/* Main Content Area */}
        <main className="w-full relative lg:overflow-hidden flex flex-col" style={{ height: 'calc(100% - 54px)' }}>
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
          ) : (
            // When the test banner is hidden, inject a safe-area spacer so
            // the iPhone notch / Android status bar doesn't overlap the
            // first row of UI (e.g. the "Hello New Friend" greeting).
            // Desktop (lg) is inside a mock phone frame so it doesn't
            // need the inset; `lg:hidden` keeps the mock pixel-perfect.
            <div
              className="shrink-0 lg:hidden bg-white"
              style={{ height: 'env(safe-area-inset-top, 0px)' }}
              aria-hidden
            />
          )}
          <div className="flex-1 min-h-0 overflow-hidden">{renderContent()}</div>
        </main>

        <LoginModal 
            isOpen={isLoginModalOpen} 
            onClose={() => setIsLoginModalOpen(false)} 
            onLogin={handleLoginSuccess}
            initialMode={loginModalMode}
        />
        
      </div>
    </div>
  );
}

export default App;