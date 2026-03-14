import React, { useState, useEffect, useRef, useCallback } from 'react';
import BottomNav from './components/BottomNav';
import ProductTab from './views/ProductTab';
import ProfileView from './views/ProfileView';
import LoginModal from './views/LoginModal';
import DialerView from './views/DialerView';
import ContactUsView from './views/ContactUsView';
import InboxView from './views/InboxView';
import AdminApp from './views/admin/AdminApp';
import { Tab, ActiveSim, SimType, User, AppNotification } from './types';
import { Lock } from 'lucide-react';
import { MOCK_COUNTRIES, MOCK_PLANS_US, MOCK_ACTIVE_SIMS, MOCK_NOTIFICATIONS } from './constants';
import { checkDataUsage, prefetchPackages } from './services/esimApi';
import { supabaseConfigured, fetchNotifications } from './services/supabase';

function App() {

  // Admin mode: detected via URL hash
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash.includes('admin'));

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash.includes('admin'));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (isAdmin) return <AdminApp />;

  return <CustomerApp />;
}

function CustomerApp() {
  const [safariCollapsed, setSafariCollapsed] = useState(false);
  const lastSafariScrollY = useRef(0);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      if (!phoneRef.current) return;
      const target = e.target as HTMLElement;
      if (!phoneRef.current.contains(target)) return;
      const y = target.scrollTop ?? 0;
      if (y > lastSafariScrollY.current + 20 && y > 50) setSafariCollapsed(true);
      else if (y < lastSafariScrollY.current - 20) setSafariCollapsed(false);
      if (y <= 0) setSafariCollapsed(false);
      lastSafariScrollY.current = y;
    };
    document.addEventListener('scroll', handler, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', handler, { capture: true });
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>(Tab.SIM_CARD);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [user, setUser] = useState<User | undefined>({ id: 'u1', name: 'Jordan', email: 'jordan@example.com', role: 'OWNER' });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  const [activeSims, setActiveSims] = useState<ActiveSim[]>(MOCK_ACTIVE_SIMS);
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);

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

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setUser({ id: 'u1', name: 'Jordan', email: 'jordan@example.com', role: 'OWNER' });
    setIsLoginModalOpen(false);
    
    // Real SIMs will be populated from API / purchases
  };

  const handlePurchaseComplete = (purchaseInfo?: { planName?: string; countryCode?: string; type?: SimType; orderNo?: string; iccid?: string }) => {
    const currentType: SimType = purchaseInfo?.type ?? (activeTab === Tab.SIM_CARD ? 'PHYSICAL' : 'ESIM');
    
    const newSim: ActiveSim = {
        id: `${currentType}-${Math.floor(Math.random() * 10000)}`,
        iccid: purchaseInfo?.iccid,
        country: MOCK_COUNTRIES[0],
        plan: MOCK_PLANS_US[1],
        type: currentType,
        activationDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        dataTotalGB: 3.0,
        dataUsedGB: 0.0,
        status: 'PENDING_ACTIVATION'
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

  const handleAddCard = (iccid: string) => {
    const country = MOCK_COUNTRIES[0]; // United States
    const plan = MOCK_PLANS_US[0];

    const newSim: ActiveSim = {
        id: `SIM-PHYS-${Math.floor(Math.random() * 10000)}`,
        country,
        plan,
        type: 'PHYSICAL',
        activationDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        dataTotalGB: 10.0,
        dataUsedGB: 0,
        status: 'PENDING_ACTIVATION'
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
                activeSims={activeSims}
                onNavigate={handleTabChange}
                onSwitchSimType={handleSwitchSimType}
                notifications={notifications}
            />
        );
      case Tab.INBOX:
        return <InboxView notifications={notifications} onUpdateNotifications={setNotifications} onNavigate={(tab) => setActiveTab(tab as Tab)} onBack={() => { setActiveTab(currentSimType === 'PHYSICAL' ? Tab.SIM_CARD : Tab.ESIM); window.scrollTo(0,0); }} />;
      case Tab.PROFILE:
        return (
            <ProfileView 
                isLoggedIn={isLoggedIn}
                user={user}
                onLogin={() => { setLoginModalMode('LOGIN'); setIsLoginModalOpen(true); }}
                onSignup={() => { setLoginModalMode('REGISTER'); setIsLoginModalOpen(true); }}
                onLogout={() => {
                  setIsLoggedIn(false);
                  setUser(undefined);
                }}
                onOpenDialer={() => setActiveTab(Tab.DIALER)}
                onOpenInbox={() => setActiveTab(Tab.INBOX)}
                notifications={notifications}
                onBack={() => { setActiveTab(currentSimType === 'PHYSICAL' ? Tab.SIM_CARD : Tab.ESIM); window.scrollTo(0,0); }}
            />
        );
      case Tab.DIALER:
        return <ContactUsView onBack={() => { setActiveTab(currentSimType === 'PHYSICAL' ? Tab.SIM_CARD : Tab.ESIM); window.scrollTo(0,0); }} userName={user?.name} />;
      default:
        return null;
    }
  };

  return (
    <div className="sm:bg-[#E5E5E5] sm:h-full sm:min-h-screen sm:flex sm:items-center sm:justify-center sm:p-8 font-sans antialiased selection:bg-orange-100">
      
      <div ref={phoneRef} className="w-full sm:max-w-[430px] sm:h-[880px] bg-[#F2F4F7] sm:rounded-[3.5rem] sm:overflow-hidden sm:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] relative sm:border-[8px] sm:border-slate-900 sm:ring-1 sm:ring-black/50">
        
        {/* Safari chrome — only visible in tablet/desktop phone frame */}
        <div className="hidden sm:block relative z-50 shrink-0" style={{ transition: 'all 0.3s ease' }}>
          {/* Collapsed: transparent status bar + floating compact pill */}
          {safariCollapsed && (
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
              <div className="relative h-[54px]">
                <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-[24px]" />
                <span className="absolute left-5 top-4 text-[15px] font-semibold" style={{ fontFamily: '-apple-system, sans-serif' }}>11:00</span>
                <div className="absolute right-5 top-[18px] flex items-center gap-[5px]">
                  <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="0.5" y="3" width="3" height="9" rx="1" fill="#1a1a1a"/><rect x="5" y="2" width="3" height="10" rx="1" fill="#1a1a1a"/><rect x="9.5" y="1" width="3" height="11" rx="1" fill="#1a1a1a"/><rect x="14" y="0" width="3" height="12" rx="1" fill="#1a1a1a"/></svg>
                  <span className="text-xs font-bold" style={{ fontFamily: '-apple-system, sans-serif' }}>LTE</span>
                  <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0" y="1" width="23" height="11" rx="3" stroke="#1a1a1a" strokeWidth="1"/><rect x="1.5" y="2.5" width="18" height="8" rx="2" fill="#34C759"/><rect x="24" y="4" width="2.5" height="5" rx="1" fill="#1a1a1a"/></svg>
                </div>
              </div>
              <div className="flex justify-center pb-1.5">
                <div className="rounded-[18px] px-4 py-[5px]" style={{ background: 'rgba(232,232,237,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                  <span className="text-[13px] font-medium whitespace-nowrap text-[#1a1a1a]" style={{ fontFamily: '-apple-system, sans-serif' }}>evair-h5.netlify.app</span>
                </div>
              </div>
            </div>
          )}

          {/* Expanded: full status bar + address bar (in normal flow) */}
          <div className="bg-[#F2F4F7] overflow-hidden" style={{ maxHeight: safariCollapsed ? 0 : 200, opacity: safariCollapsed ? 0 : 1, transition: 'max-height 0.3s ease, opacity 0.3s ease' }}>
            <div className="relative h-[54px]">
              <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-[24px] z-10" />
              <span className="absolute left-5 top-4 text-[15px] font-semibold" style={{ fontFamily: '-apple-system, sans-serif' }}>11:00</span>
              <div className="absolute right-5 top-[18px] flex items-center gap-[5px]">
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="0.5" y="3" width="3" height="9" rx="1" fill="#1a1a1a"/><rect x="5" y="2" width="3" height="10" rx="1" fill="#1a1a1a"/><rect x="9.5" y="1" width="3" height="11" rx="1" fill="#1a1a1a"/><rect x="14" y="0" width="3" height="12" rx="1" fill="#1a1a1a"/></svg>
                <span className="text-xs font-bold" style={{ fontFamily: '-apple-system, sans-serif' }}>LTE</span>
                <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0" y="1" width="23" height="11" rx="3" stroke="#1a1a1a" strokeWidth="1"/><rect x="1.5" y="2.5" width="18" height="8" rx="2" fill="#34C759"/><rect x="24" y="4" width="2.5" height="5" rx="1" fill="#1a1a1a"/></svg>
              </div>
            </div>
            <div className="px-4 pb-[10px] flex items-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr-2 shrink-0"><path d="M3 7.5V6C3 3.8 4.8 2 7 2s4 1.8 4 4v1.5" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round"/><rect x="2" y="7" width="10" height="6" rx="1.5" fill="#8E8E93"/></svg>
              <div className="flex-1 bg-[#E8E8ED] rounded-xl h-9 flex items-center justify-center">
                <span className="text-[15px] text-[#1a1a1a]" style={{ fontFamily: '-apple-system, sans-serif' }}>evair-h5.netlify.app</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-2 shrink-0"><path d="M8 2v8M8 2L5 5M8 2l3 3" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 9v4h10V9" stroke="#007AFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="w-full relative sm:overflow-hidden" style={{ height: safariCollapsed ? '100%' : 'calc(100% - 104px)' }}>
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