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
  return (
    <div style={{ margin: '0 auto', maxWidth: 390, height: '100vh', background: '#F2F4F7' }}>
      <iframe src={src} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title="iPhone Preview" />
    </div>
  );
}

function App() {
  const isMobilePreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('mobile');
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