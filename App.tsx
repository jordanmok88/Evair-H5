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

function MobilePreview() {
  const src = window.location.origin + '/';
  const phoneW = 393;
  const phoneH = 852;
  const [scale, setScale] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastScrollY = useRef(0);
  const sf = { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' };
  const t = '0.3s ease';

  useEffect(() => {
    const update = () => setScale(Math.min(1, (window.innerHeight - 40) / (phoneH + 24)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const onScroll = () => {
          const y = doc.documentElement.scrollTop || doc.body.scrollTop;
          if (y > lastScrollY.current && y > 50) setCollapsed(true);
          else if (y < lastScrollY.current) setCollapsed(false);
          if (y <= 0) setCollapsed(false);
          lastScrollY.current = y;
        };
        doc.addEventListener('scroll', onScroll, { passive: true });
      } catch {}
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#E5E5E5', overflow: 'hidden' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <div style={{ position: 'relative', width: phoneW, height: phoneH, borderRadius: 55, background: '#1a1a1a', padding: 12, boxShadow: '0 50px 100px -20px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
          {/* Side buttons */}
          <div style={{ position: 'absolute', left: -3, top: 160, width: 3, height: 32, background: '#2a2a2a', borderRadius: '4px 0 0 4px' }} />
          <div style={{ position: 'absolute', left: -3, top: 220, width: 3, height: 60, background: '#2a2a2a', borderRadius: '4px 0 0 4px' }} />
          <div style={{ position: 'absolute', left: -3, top: 290, width: 3, height: 60, background: '#2a2a2a', borderRadius: '4px 0 0 4px' }} />
          <div style={{ position: 'absolute', right: -3, top: 240, width: 3, height: 80, background: '#2a2a2a', borderRadius: '0 4px 4px 0' }} />
          {/* Screen */}
          <div style={{ width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden', background: '#F2F4F7', display: 'flex', flexDirection: 'column' }}>

            {/* Status bar + Dynamic Island */}
            <div style={{ position: 'relative', height: 54, background: '#F2F4F7', flexShrink: 0, zIndex: 2 }}>
              <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 126, height: 37, background: '#000', borderRadius: 24 }} />
              <span style={{ position: 'absolute', left: 20, top: 15, fontSize: 15, fontWeight: 600, color: '#1a1a1a', ...sf }}>9:41</span>
              <div style={{ position: 'absolute', right: 20, top: 17, display: 'flex', gap: 5, alignItems: 'center' }}>
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="0.5" y="3" width="3" height="9" rx="1" fill="#1a1a1a"/><rect x="5" y="2" width="3" height="10" rx="1" fill="#1a1a1a"/><rect x="9.5" y="1" width="3" height="11" rx="1" fill="#1a1a1a"/><rect x="14" y="0" width="3" height="12" rx="1" fill="#1a1a1a"/></svg>
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 3C9.9 3 11.6 3.8 12.8 5L14.2 3.6C12.6 2 10.5 1 8 1S3.4 2 1.8 3.6L3.2 5C4.4 3.8 6.1 3 8 3ZM8 7C9.1 7 10.1 7.4 10.9 8.1L12.3 6.7C11.1 5.6 9.6 5 8 5S4.9 5.6 3.7 6.7L5.1 8.1C5.9 7.4 6.9 7 8 7ZM10 10.5L8 9L6 10.5L8 12.5L10 10.5Z" fill="#1a1a1a"/></svg>
                <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0" y="1" width="23" height="11" rx="3" stroke="#1a1a1a" strokeWidth="1"/><rect x="1.5" y="2.5" width="18" height="8" rx="2" fill="#34C759"/><rect x="24" y="4" width="2.5" height="5" rx="1" fill="#1a1a1a"/></svg>
              </div>
              {/* Collapsed address bar (compact pill) */}
              <div style={{ position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)', background: '#E8E8ED', borderRadius: 18, padding: '4px 14px', opacity: collapsed ? 1 : 0, transition: `opacity ${t}`, pointerEvents: collapsed ? 'auto' : 'none', zIndex: 3 }}>
                <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500, ...sf }}>evair-h5.netlify.app</span>
              </div>
            </div>

            {/* Safari address bar (expanded) */}
            <div style={{ flexShrink: 0, padding: '0 16px 8px', background: '#F2F4F7', overflow: 'hidden', maxHeight: collapsed ? 0 : 50, opacity: collapsed ? 0 : 1, transition: `max-height ${t}, opacity ${t}, padding ${t}`, paddingBottom: collapsed ? 0 : 8, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#E8E8ED', borderRadius: 12, height: 36, padding: '0 12px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5V6C3 3.8 4.8 2 7 2s4 1.8 4 4v1.5" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round"/><rect x="2" y="7" width="10" height="6" rx="1.5" fill="#8E8E93"/></svg>
                <span style={{ fontSize: 15, color: '#1a1a1a', fontWeight: 400, ...sf }}>evair-h5.netlify.app</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto' }}><path d="M13 8C13 8 12 4 8 4C4 4 3 8 3 8" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 6.5L3 8L5 9.5" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>

            {/* App content */}
            <iframe ref={iframeRef} src={src} style={{ width: '100%', flex: 1, border: 'none' }} title="iPhone Preview" />

            {/* Safari bottom toolbar */}
            <div style={{ flexShrink: 0, background: '#F2F4F7', borderTop: '0.5px solid #C6C6C8', overflow: 'hidden', maxHeight: collapsed ? 0 : 80, opacity: collapsed ? 0 : 1, transition: `max-height ${t}, opacity ${t}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: collapsed ? '0' : '8px 0 30px' }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <svg width="13" height="21" viewBox="0 0 13 21" fill="none"><path d="M11.5 1.5L2 10.5L11.5 19.5" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <svg width="13" height="21" viewBox="0 0 13 21" fill="none"><path d="M1.5 1.5L11 10.5L1.5 19.5" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none"><path d="M10 1V15" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"/><path d="M6 5L10 1L14 5" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 9H3C1.9 9 1 9.9 1 11V21C1 22.1 1.9 23 3 23H17C18.1 23 19 22.1 19 21V11C19 9.9 18.1 9 17 9H16" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"/></svg>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 1H17C18.1 1 19 1.9 19 3V21L11 17L3 21V3C3 1.9 3.9 1 5 1Z" stroke="#007AFF" strokeWidth="2" strokeLinejoin="round"/></svg>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="1" y="5" width="16" height="16" rx="3" stroke="#007AFF" strokeWidth="2"/><path d="M5 5V3C5 1.9 5.9 1 7 1H19C20.1 1 21 1.9 21 3V15C21 16.1 20.1 17 19 17H17" stroke="#007AFF" strokeWidth="2"/></svg>
            </div>

            {/* Home indicator */}
            <div style={{ flexShrink: 0, background: '#F2F4F7', display: 'flex', justifyContent: 'center', paddingBottom: collapsed ? 8 : 0, transition: `padding ${t}` }}>
              <div style={{ width: 134, height: 5, background: '#1a1a1a', borderRadius: 3, opacity: 0.2 }} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const isMobilePreview = new URLSearchParams(window.location.search).has('mobile');
  if (isMobilePreview) return <MobilePreview />;

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
    <div className="bg-[#F2F4F7] sm:bg-[#E5E5E5] sm:h-full sm:min-h-screen sm:flex sm:items-center sm:justify-center sm:p-8 font-sans antialiased selection:bg-orange-100">
      
      <div className="w-full sm:max-w-[430px] sm:h-[880px] bg-[#F2F4F7] sm:rounded-[3.5rem] sm:overflow-hidden sm:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] relative sm:border-[8px] sm:border-slate-900 sm:ring-1 sm:ring-black/50">
        
        {/* Main Content Area */}
        <main className="sm:h-full w-full relative sm:overflow-hidden">
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