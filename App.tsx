import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import BottomNav from './components/BottomNav';
import ProductTab from './views/ProductTab';
import ProfileView from './views/ProfileView';
import LoginModal from './views/LoginModal';
import DialerView from './views/DialerView';
import ContactUsView from './views/ContactUsView';
import InboxView from './views/InboxView';
import AdminApp from './views/admin/AdminApp';
import ApiTestPage from './views/ApiTestPage';
import { Tab, ActiveSim, SimType, User, AppNotification, EsimProfileResult } from './types';
import { Lock } from 'lucide-react';
import { MOCK_COUNTRIES, MOCK_PLANS_US, MOCK_ACTIVE_SIMS, MOCK_NOTIFICATIONS, CARRIER_MAP } from './constants';
import { checkDataUsage, prefetchPackages, DEMO_MODE, mapRedTeaStatus } from './services/dataService';
import { supabaseConfigured, fetchNotifications } from './services/supabase';
import { authService, userService, type UserDto } from './services/api';

function App() {

  // Admin mode: detected via URL hash
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash.includes('admin'));

  // API Test mode: detected via URL hash
  const [isApiTest, setIsApiTest] = useState(() => window.location.hash.includes('api-test'));

  useEffect(() => {
    const onHash = () => {
      setIsAdmin(window.location.hash.includes('admin'));
      setIsApiTest(window.location.hash.includes('api-test'));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (isAdmin) return <AdminApp />;
  if (isApiTest) return <ApiTestPage />;

  return <CustomerApp />;
}

function CustomerApp() {
  const phoneRef = useRef<HTMLDivElement>(null);

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


  const [activeTab, setActiveTab] = useState<Tab>(Tab.SIM_CARD);
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
    countryCode: string;
    status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
    totalVolume: number;
    usedVolume: number;
    expiredTime: string;
    activationDate: string | null;
  }): ActiveSim => {
    const totalGB = userSim.totalVolume / (1024 * 1024 * 1024);
    const usedGB = userSim.usedVolume / (1024 * 1024 * 1024);

    // 转换国家码到国家信息
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

    const countryInfo = countryCodeToInfo[userSim.countryCode] || {
      name: userSim.countryCode,
      flag: '🌍',
    };

    return {
      id: userSim.id,
      iccid: userSim.iccid,
      country: {
        id: userSim.countryCode.toLowerCase(),
        name: countryInfo.name,
        flag: countryInfo.flag,
        countryCode: userSim.countryCode,
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
      status: userSim.status === 'PENDING' ? 'PENDING_ACTIVATION' : userSim.status,
    };
  };

  // 从后端获取用户 SIM 卡列表
  const fetchUserSims = useCallback(async () => {
    if (!authService.isLoggedIn()) return;
    try {
      const response = await userService.getSims();
      const convertedSims = response.list.map(convertUserSimToActiveSim);
      setServerSims(convertedSims);
    } catch (err) {
      console.error('Failed to fetch user SIMs:', err);
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

    // TODO: 登录成功后可以从 userService.getSims() 获取用户的 SIM 卡列表
  };

  // 登出处理
  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setIsLoggedIn(false);
      setUser(undefined);
      setActiveSims([]);
      setServerSims([]);
    }
  };

  const handlePurchaseComplete = (purchaseInfo?: { planName?: string; countryCode?: string; type?: SimType; orderNo?: string; iccid?: string; dataTotalGB?: number; durationDays?: number }) => {
    const currentType: SimType = purchaseInfo?.type ?? (activeTab === Tab.SIM_CARD ? 'PHYSICAL' : 'ESIM');
    const cc = purchaseInfo?.countryCode || 'US';
    const ccToFlag = (code: string) => code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
    const dataGB = purchaseInfo?.dataTotalGB || 3.0;
    const days = purchaseInfo?.durationDays || 30;
    
    const country = MOCK_COUNTRIES.find(c => c.countryCode === cc) || {
        id: cc.toLowerCase(),
        name: purchaseInfo?.planName || cc,
        flag: ccToFlag(cc),
        countryCode: cc,
        region: '',
        startPrice: 0,
        networkCount: 0,
        networks: [],
        vpmn: '',
        vpn: false,
        plans: [],
    };

    const isPhysical = currentType === 'PHYSICAL';
    const newSim: ActiveSim = {
        id: `${currentType}-${Math.floor(Math.random() * 10000)}`,
        iccid: purchaseInfo?.iccid,
        country,
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
  };

  const handleUpdateSim = useCallback((simId: string, updates: Partial<ActiveSim>) => {
    setActiveSims(prev => prev.map(s => s.id === simId ? { ...s, ...updates } : s));
  }, []);

  const handleAddCard = (iccid: string, profile?: EsimProfileResult) => {
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

    const totalGB = profile?.totalVolume
      ? profile.totalVolume / (1024 * 1024 * 1024)
      : 10;
    const durationDays = profile?.totalDuration || 30;
    const redTeaStatus = mapRedTeaStatus(profile?.status || '');

    const existingSim = activeSims.find(s => s.iccid === iccid);
    if (existingSim) {
      setActiveSims(prev => prev.map(s => s.iccid === iccid ? {
        ...s,
        status: redTeaStatus,
        dataTotalGB: Math.round(totalGB * 10) / 10,
        dataUsedGB: profile?.usedVolume ? profile.usedVolume / (1024 * 1024 * 1024) : s.dataUsedGB,
      } : s));
      return;
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
    setActiveSims([newSim, ...activeSims]);
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

  const [currentSimType, setCurrentSimType] = useState<SimType>('PHYSICAL');

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
        <main className="w-full relative lg:overflow-hidden" style={{ height: 'calc(100% - 54px)' }}>
           {renderContent()}
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