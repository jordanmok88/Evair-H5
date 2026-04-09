import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, AppNotification } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  notifications?: AppNotification[];
}

const SimCardIcon = ({ active }: { active: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="16" rx="3" 
      stroke={active ? '#FF6600' : '#8E8E93'} 
      strokeWidth="1.8"
      fill={active ? '#FFF3EB' : 'none'}
    />
    <rect x="4.5" y="9.5" width="7" height="5" rx="1.2" 
      stroke={active ? '#FF6600' : '#8E8E93'} 
      strokeWidth="1.4"
      fill={active ? '#FFE0CC' : 'none'}
    />
    <line x1="8" y1="9.5" x2="8" y2="14.5" stroke={active ? '#FF6600' : '#8E8E93'} strokeWidth="0.8" />
    <line x1="4.5" y1="12" x2="11.5" y2="12" stroke={active ? '#FF6600' : '#8E8E93'} strokeWidth="0.8" />
    <line x1="14" y1="8" x2="19" y2="8" stroke={active ? '#FF6600' : '#8E8E93'} strokeWidth="1.4" strokeLinecap="round" />
    <line x1="14" y1="11.5" x2="19" y2="11.5" stroke={active ? '#FF6600' : '#8E8E93'} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const EsimIcon = ({ active }: { active: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="2" width="14" height="20" rx="3" 
      stroke={active ? '#FF6600' : '#8E8E93'} 
      strokeWidth="1.8"
      fill={active ? '#FFF3EB' : 'none'}
    />
    <rect x="8" y="5" width="8" height="10" rx="1" 
      stroke={active ? '#FF6600' : '#8E8E93'} 
      strokeWidth="1.2" 
      fill="none"
    />
    <circle cx="12" cy="18" r="1.2" fill={active ? '#FF6600' : '#8E8E93'} />
    <path d="M10 8.5h4M10 10.5h4" stroke={active ? '#FF6600' : '#8E8E93'} strokeWidth="0.9" strokeLinecap="round" />
  </svg>
);

const InboxIcon = ({ active }: { active: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 7C4 5.34315 5.34315 4 7 4H17C18.6569 4 20 5.34315 20 7V14C20 15.6569 18.6569 17 17 17H7C5.34315 17 4 15.6569 4 14V7Z" 
      stroke={active ? '#FF6600' : '#8E8E93'} 
      strokeWidth="1.8"
      fill={active ? '#FFF3EB' : 'none'}
    />
    <path d="M4 10H8.5L10 12.5H14L15.5 10H20" 
      stroke={active ? '#FF6600' : '#8E8E93'} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8.5" r="3.5" 
      stroke={active ? '#FF6600' : '#8E8E93'} 
      strokeWidth="1.8"
      fill={active ? '#FFE0CC' : 'none'}
    />
    <path d="M4.5 20.5C4.5 16.5 7.5 14 12 14C16.5 14 19.5 16.5 19.5 20.5" 
      stroke={active ? '#FF6600' : '#8E8E93'} 
      strokeWidth="1.8" 
      strokeLinecap="round"
      fill={active ? '#FFF3EB' : 'none'}
    />
  </svg>
);

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, notifications = [] }) => {
  const { t } = useTranslation();
  const [tooltipTab, setTooltipTab] = useState<Tab | null>(null);
  const unreadCount = notifications.filter(n => !n.read).length;
  const tabs = [
    { id: Tab.SIM_CARD, label: t('nav.sim_card'), Icon: SimCardIcon, badge: 0 },
    { id: Tab.INBOX, label: t('nav.inbox'), Icon: InboxIcon, badge: unreadCount },
    { id: Tab.PROFILE, label: t('nav.profile'), Icon: ProfileIcon, badge: 0 },
  ];

  const handleTabTap = (id: Tab) => {
    onTabChange(id);
    setTooltipTab(id);
  };

  useEffect(() => {
    if (!tooltipTab) return;
    const timer = setTimeout(() => setTooltipTab(null), 1000);
    return () => clearTimeout(timer);
  }, [tooltipTab]);

  return (
    <div className="fixed md:absolute bottom-0 left-0 right-0 md:left-auto md:right-auto w-full bg-white/90 backdrop-blur-2xl backdrop-saturate-150 border-t border-orange-100/60 px-4 z-50 pb-safe-bottom">
      <div className="flex justify-around items-center">
        {tabs.map(({ id, label, Icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleTabTap(id)}
              className="flex-1 flex flex-col items-center justify-center pt-1.5 pb-0.5 relative"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {tooltipTab === id && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-3 py-1.5 rounded-lg bg-slate-800/90 text-white text-xs font-semibold whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
                  style={{ zIndex: 60 }}
                >
                  {label}
                </div>
              )}
              {active && (
                <div style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 2.5, borderRadius: 2,
                  background: 'linear-gradient(90deg, #FF6600, #FF8533)',
                }} />
              )}
              <div
                className="relative"
                style={{
                  width: 30, height: 30, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: active ? '#FFF3EB' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                <Icon active={active} />
                {badge > 0 && (
                  <div style={{
                    position: 'absolute', top: -2, right: -4,
                    minWidth: 15, height: 15, borderRadius: 8,
                    backgroundColor: '#EF4444', color: '#fff',
                    fontSize: 8, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px',
                    border: '2px solid white',
                  }}>
                    {badge > 9 ? '9+' : badge}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? '#FF6600' : '#8E8E93',
                letterSpacing: '-0.02em',
                transition: 'color 0.2s',
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
