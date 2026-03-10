import React from 'react';
import { QrCode, Keyboard, Phone, Zap, ShoppingBag, Settings, Smartphone, Plus } from 'lucide-react';
import { Tab } from '../types';

interface HomeViewProps {
  isLoggedIn: boolean;
  onNavigate: (tab: Tab) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ isLoggedIn, onNavigate }) => {
  
  // Thin Material Grid Action
  const GridAction = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
    <button 
      onClick={onClick}
      className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 p-4 active:scale-95 transition-all hover:bg-white/80 group shadow-sm shadow-black/5"
    >
      {/* Icon floats on glass */}
      <div className="w-14 h-14 rounded-full bg-white/80 border border-white/50 shadow-sm flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform duration-300">
        <Icon size={26} strokeWidth={1.5} className="text-brand-orange" />
      </div>
      <span className="font-semibold text-slate-700 text-[15px] tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7]">
      
      {/* 1. Spatial Hero Card (Floating, Depth) */}
      <div className="pt-safe px-5 pb-4 shrink-0">
          <div className="relative w-full aspect-[4/5] max-h-[420px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-orange-900/20 ring-1 ring-black/5 isolate">
            
            {/* Mesh Gradient Background (Dark Slate to Orange) */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-orange"></div>
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50 blur-3xl"></div>

            {/* Header Content on Card */}
            <div className="relative z-20 p-6 flex justify-between items-start text-white">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">EvairSIM</h1>
                    <p className="text-orange-100 text-sm font-medium tracking-wide uppercase opacity-80 mt-1">Global Connect</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => onNavigate(Tab.SHOP)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                        <ShoppingBag size={20} />
                    </button>
                    <button onClick={() => onNavigate(Tab.SETTINGS)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Center Visual */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 top-6">
                 {/* Floating Glass Icon Container */}
                 <div className="relative mb-6 group cursor-pointer" onClick={() => onNavigate(Tab.SHOP)}>
                     <div className="relative z-10 w-40 h-40 bg-gradient-to-tr from-white/10 to-white/5 backdrop-blur-sm rounded-[2.5rem] border border-white/20 shadow-2xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                        <Smartphone size={80} className="text-white drop-shadow-md" strokeWidth={1} />
                     </div>
                     {/* Background Glow */}
                     <div className="absolute inset-4 bg-brand-orange rounded-[2rem] blur-2xl opacity-40 animate-pulse"></div>

                     {/* Action Badge */}
                     <div className="absolute -bottom-3 -right-3 bg-brand-orange text-white p-3 rounded-full shadow-lg border-4 border-slate-900 z-20">
                         <Plus size={24} strokeWidth={3} />
                     </div>
                 </div>

                 <h2 className="text-3xl font-bold text-white mb-2 tracking-tight text-center drop-shadow-sm">Get Connected</h2>
                 <p className="text-orange-50/80 text-sm mb-8 text-center max-w-[220px] font-medium">Instant high-speed data for 190+ countries.</p>

                 <button 
                    onClick={() => onNavigate(Tab.SHOP)}
                    className="bg-white text-brand-orange px-8 py-3.5 rounded-2xl font-bold text-base shadow-xl active:scale-95 transition-transform flex items-center gap-2 hover:bg-orange-50"
                >
                    Activate eSIM
                </button>
            </div>
          </div>
      </div>

      {/* 2. Secondary Action Grid - Floating Glass Tiles */}
      <div className="flex-1 px-5 py-2">
         <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-3 ml-2">Quick Actions</h3>
         <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full max-h-[300px]">
            <GridAction icon={QrCode} label="Scan QR" onClick={() => onNavigate(Tab.MYSIMS)} />
            <GridAction icon={Zap} label="Top Up" onClick={() => onNavigate(Tab.MYSIMS)} />
            <GridAction icon={Keyboard} label="Enter Code" onClick={() => onNavigate(Tab.MYSIMS)} />
            <GridAction icon={Phone} label="Dialer" onClick={() => onNavigate(Tab.DIALER)} />
         </div>
      </div>

    </div>
  );
};

export default HomeView;