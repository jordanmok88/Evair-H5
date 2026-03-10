import React, { useState } from 'react';
import BottomNav from './components/BottomNav';
import StatusBar from './components/StatusBar';
import ProductTab from './views/ProductTab';
import ProfileView from './views/ProfileView';
import LoginModal from './views/LoginModal';
import DialerView from './views/DialerView';
import ContactUsView from './views/ContactUsView';
import InboxView from './views/InboxView';
import { Tab, ActiveSim, SimType, User } from './types';
import { Lock } from 'lucide-react';
import { MOCK_COUNTRIES, MOCK_PLANS_US, MOCK_ACTIVE_SIMS } from './constants';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.ESIM); // Default to eSIM tab
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [user, setUser] = useState<User | undefined>({ id: 'u1', name: 'Jordan', email: 'jordan@example.com', role: 'OWNER' });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  // Mock State for Active SIMs - pre-loaded for preview
  const [activeSims, setActiveSims] = useState<ActiveSim[]>(MOCK_ACTIVE_SIMS);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setUser({ id: 'u1', name: 'Jordan', email: 'jordan@example.com', role: 'OWNER' });
    setIsLoginModalOpen(false);
    
    // Simulate fetching existing user data
    if (activeSims.length === 0) {
        setActiveSims(MOCK_ACTIVE_SIMS);
    }
  };

  const handlePurchaseComplete = () => {
    const currentType: SimType = activeTab === Tab.SIM_CARD ? 'PHYSICAL' : 'ESIM';
    
    const newSim: ActiveSim = {
        id: `${currentType}-${Math.floor(Math.random() * 10000)}`,
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
  };

  const handleDeleteSim = (simId: string) => {
    setActiveSims(prev => prev.filter(s => s.id !== simId));
  };

  const handleAddCard = (iccid: string) => {
    const country = MOCK_COUNTRIES[4]; // Mexico — matched from ICCID prefix
    const plan = MOCK_PLANS_US[3]; // Unlimited 10GB

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

  const renderContent = () => {
    switch (activeTab) {
      case Tab.SIM_CARD:
        return (
            <ProductTab 
                key="SIM_CARD"
                type="PHYSICAL"
                isLoggedIn={isLoggedIn}
                user={user}
                onLoginRequest={() => setIsLoginModalOpen(true)}
                onPurchaseComplete={handlePurchaseComplete}
                onAddCard={handleAddCard}
                onDeleteSim={handleDeleteSim}
                activeSims={activeSims}
                onNavigate={handleTabChange}
            />
        );
      case Tab.ESIM:
        return (
            <ProductTab 
                key="ESIM"
                type="ESIM"
                isLoggedIn={isLoggedIn}
                user={user}
                onLoginRequest={() => setIsLoginModalOpen(true)}
                onPurchaseComplete={handlePurchaseComplete}
                onAddCard={handleAddCard}
                onDeleteSim={handleDeleteSim}
                activeSims={activeSims}
                onNavigate={handleTabChange}
            />
        );
      case Tab.INBOX:
        return <InboxView />;
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
            />
        );
      case Tab.DIALER:
        return <ContactUsView onBack={() => setActiveTab(Tab.ESIM)} userName={user?.name} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F7] md:bg-[#E5E5E5] flex items-center justify-center p-0 md:p-8 font-sans antialiased selection:bg-orange-100">
      
      {/* Mobile: full screen, no frame. Desktop: phone frame for preview */}
      <div className="w-full md:max-w-[430px] h-[100dvh] md:h-[880px] bg-[#F2F4F7] md:rounded-[3.5rem] overflow-hidden md:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] relative md:border-[8px] md:border-slate-900 md:ring-1 md:ring-black/50">
        
        {/* Dynamic Island — desktop preview only */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[36px] bg-black rounded-b-[20px] z-[60]"></div>

        {/* Fake status bar — desktop preview only */}
        <div className="hidden md:block">
          <StatusBar />
        </div>

        {/* Main Content Area - System Background */}
        <main className="h-full w-full relative overflow-hidden">
           {renderContent()}
        </main>

        {/* Bottom Nav - Thick Material */}
        {activeTab !== Tab.DIALER && (
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        )}

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