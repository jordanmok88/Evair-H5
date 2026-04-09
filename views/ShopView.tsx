import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronRight, Loader2, Smartphone, Truck, CreditCard, RefreshCw, Globe } from 'lucide-react';
import { SimType, User, EsimPackage, ActiveSim } from '../types';
import FlagIcon from '../components/FlagIcon';
import { retailPrice } from '../services/dataService';
import { Bell, UserCircle } from 'lucide-react';
import { AppNotification } from '../types';

interface ShopViewProps {
  isLoggedIn: boolean;
  user?: User;
  onLoginRequest: () => void;
  simType: SimType;
  onSwitchToMySims?: () => void;
  hasActiveSims?: boolean;
  activeSims?: ActiveSim[];
  onSwitchToSetup?: () => void;
  onNavigate?: (tab: string) => void;
  notifications?: AppNotification[];
  // 套餐数据由 ProductTab 传入，避免视图切换时数据丢失
  homepagePackages: EsimPackage[];
  packagesLoading: boolean;
  packagesError: string | null;
  onLoadPackages: () => void;
  // 充值流程：点击套餐时调用此方法
  onSelectTopUpPackage?: (pkg: EsimPackage) => void;
}

const ShopView: React.FC<ShopViewProps> = ({
  isLoggedIn, user, onLoginRequest, simType,
  onSwitchToMySims, hasActiveSims, activeSims = [],
  onSwitchToSetup, onNavigate, notifications = [],
  homepagePackages, packagesLoading, packagesError, onLoadPackages,
  onSelectTopUpPackage,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 挂载时触发加载
  useEffect(() => {
    onLoadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在首次挂载时触发

  useEffect(() => {
    const onScroll = (y: number) => {
      if (y > lastScrollY.current + scrollThreshold && y > 60) {
        setHeaderHidden(true);
      } else if (y < lastScrollY.current - scrollThreshold) {
        setHeaderHidden(false);
      }
      lastScrollY.current = y;
    };

    const onWindowScroll = () => onScroll(window.scrollY);
    const onContainerScroll = () => {
      if (scrollContainerRef.current) onScroll(scrollContainerRef.current.scrollTop);
    };

    window.addEventListener('scroll', onWindowScroll, { passive: true });
    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', onContainerScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onWindowScroll);
      container?.removeEventListener('scroll', onContainerScroll);
    };
  }, []);

  // Filter packages by search query
  const filteredPackages = homepagePackages.filter(pkg =>
    !searchQuery || pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derive unique locations from packages for the country header
  const uniqueLocations = [...new Set(filteredPackages.map(p => p.location || ''))];
  const firstLocation = uniqueLocations[0] || '';
  const isSingleCountry = uniqueLocations.length === 1 && !!firstLocation && !firstLocation.includes(',');
  const primaryCountryCode = firstLocation.split(',')[0]?.trim().toUpperCase() || 'US';

  // Country code display names
  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const countryName = (code: string) => {
    try { return displayNames.of(code.toUpperCase()) ?? code; } catch { return code; }
  };

  // Determine "Best Value" — the package with the lowest price per GB
  const bestValuePackageCode = filteredPackages.length > 0
    ? filteredPackages.reduce((best, pkg) => {
        const gb = pkg.volume / (1024 * 1024 * 1024);
        const pricePerGb = gb > 0 ? retailPrice(pkg.price) / gb : Infinity;
        const bestGb = best.volume / (1024 * 1024 * 1024);
        const bestPricePerGb = bestGb > 0 ? retailPrice(best.price) / bestGb : Infinity;
        return pricePerGb < bestPricePerGb ? pkg : best;
      }).packageCode
    : '';

  const handlePackageClick = (pkg: EsimPackage) => {
    if (!isLoggedIn) {
      onLoginRequest();
      return;
    }
    onSelectTopUpPackage?.(pkg);
  };

  // --- MAIN VIEW: Shop Home ---
  return (
    <div className="lg:h-full relative bg-[#F2F4F7]">
      <div ref={scrollContainerRef} className="h-full lg:overflow-y-auto no-scrollbar">

        {/* Header */}
        <div
          className="bg-white px-4 pt-safe pb-3 sticky top-0 z-40 border-b border-slate-100 transition-transform duration-300 ease-out"
          style={{ transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)' }}
        >
          {/* Row 1: Greeting + action buttons */}
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-base font-bold text-slate-900 tracking-tight">
                {t('shop.hello')} {isLoggedIn && user ? user.name : t('shop.new_friend')}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Find the perfect plan for your trip</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate?.('INBOX')} className="relative w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center active:scale-95 transition-all" style={{ WebkitTapHighlightColor: 'transparent' }}>
                <Bell size={18} className="text-slate-700" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white shadow-sm">
                    {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              <button onClick={() => onNavigate?.('PROFILE')} className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6600, #FF8A3D)', WebkitTapHighlightColor: 'transparent' }}>
                {isLoggedIn && user ? (
                  <span className="text-sm font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <UserCircle size={20} className="text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Row 2: "My SIMs" bar — only when user has active SIMs */}
          {(() => {
            const mySims = activeSims.filter(s => s.type === simType);
            if (!hasActiveSims || mySims.length === 0 || !onSwitchToMySims) return null;
            const simCount = mySims.length;
            const uniqueCountries = [...new Map(mySims.map(s => [s.country.countryCode, s.country.countryCode])).values()];
            const visibleFlags = uniqueCountries.slice(0, 3);
            const extraCount = uniqueCountries.length - visibleFlags.length;
            const FLAG_W = 32;
            const OVERLAP = 14;
            const stackWidth = FLAG_W + (visibleFlags.length - 1) * (FLAG_W - OVERLAP) + (extraCount > 0 ? (FLAG_W - OVERLAP) : 0);
            return (
              <button
                onClick={onSwitchToMySims}
                className="w-full flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 mt-2 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative" style={{ width: stackWidth, height: 22 }}>
                    {visibleFlags.map((cc, i) => (
                      <span key={cc} className="absolute top-0" style={{ left: i * (FLAG_W - OVERLAP), zIndex: visibleFlags.length - i }}>
                        <FlagIcon countryCode={cc} size="sm" />
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span
                        className="absolute top-0 flex items-center justify-center bg-slate-200 text-[10px] font-bold text-slate-600 rounded"
                        style={{ left: visibleFlags.length * (FLAG_W - OVERLAP), zIndex: 0, width: 32, height: 22, border: '1px solid #e5e7eb' }}
                      >
                        +{extraCount}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {simCount} SIM{simCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-slate-500">· {t('shop.my_sims')}</span>
                </div>
                <ChevronRight size={16} className="text-brand-orange" />
              </button>
            );
          })()}
        </div>

        <div className="pb-6 px-4 md:px-8 lg:px-4 pt-4">

          {/* HERO SECTION: Bind SIM — hidden when user already has SIMs */}
          {!searchQuery && !hasActiveSims && (
            <div className="mb-5">
              <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #FF6600 0%, transparent 70%)' }} />
                <div className="relative z-10 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' }}>
                      <CreditCard size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-white tracking-tight">{t('shop.bind_sim')}</h2>
                      <p className="text-sm text-slate-400 mt-1 leading-snug">Track delivery & activate your physical SIM card</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300"><Truck size={14} className="text-brand-orange" /> Delivery Tracking</span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300"><Smartphone size={14} className="text-brand-orange" /> SIM Activation</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!isLoggedIn) { onLoginRequest(); } else { onSwitchToSetup?.(); }
                    }}
                    className="w-full mt-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(255,102,0,0.3)',
                    }}
                  >
                    Set Up Now
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={t('shop.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-3 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Loading state */}
          {packagesLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-brand-orange mb-3" />
              <p className="text-slate-400 text-sm font-medium">{t('shop.loading_plans')}</p>
            </div>
          )}

          {/* Error state */}
          {packagesError && !packagesLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-slate-500 text-sm mb-3">{t('shop.load_error')}</p>
              <button
                onClick={onLoadPackages}
                className="flex items-center gap-2 bg-brand-orange text-white px-5 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
              >
                <RefreshCw size={16} />
                {t('shop.retry')}
              </button>
            </div>
          )}

          {/* Package cards from API */}
          {!packagesLoading && !packagesError && filteredPackages.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">{t('shop.purchase_sim_cards')}</h3>

              {/* Region header — dynamically derived from package locations */}
              {(() => {
                const regionLabel = isSingleCountry
                  ? countryName(primaryCountryCode)
                  : uniqueLocations.length === 1
                    ? `${uniqueLocations[0].split(',').length} Countries`
                    : `${uniqueLocations.length} Regions`;
                const flagCode = isSingleCountry ? primaryCountryCode : null;
                return (
                  <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                      {flagCode ? (
                        <FlagIcon countryCode={flagCode} size="sm" />
                      ) : (
                        <div className="w-8 h-[22px] rounded flex items-center justify-center bg-blue-50 border border-blue-100">
                          <Globe size={16} className="text-blue-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-base font-semibold text-slate-900 leading-tight">{regionLabel}</p>
                          <span className="text-[11px] font-semibold text-brand-orange bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 shrink-0">{filteredPackages.length} {filteredPackages.length === 1 ? 'Plan' : 'Plans'}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isSingleCountry
                            ? '3G/4G/5G'
                            : uniqueLocations.map(loc => {
                                const codes = loc.split(',').map(c => c.trim());
                                return codes.length === 1 ? countryName(codes[0]) : `${codes.length} Countries`;
                              }).join(' · ')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Plan cards grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 mb-5">
                {filteredPackages.map((pkg) => {
                  const priceUsd = retailPrice(pkg.price);
                  const gb = pkg.volume / (1024 * 1024 * 1024);
                  const pricePerGb = gb > 0 ? priceUsd / gb : priceUsd;
                  const isBestValue = pkg.packageCode === bestValuePackageCode;
                  const validityDays = pkg.durationUnit === 'MONTH' ? pkg.duration * 30 : pkg.duration;

                  return (
                    <button
                      key={pkg.packageCode}
                      onClick={() => handlePackageClick(pkg)}
                      className={`relative bg-white rounded-xl p-4 text-left transition-all active:scale-[0.97] shadow-sm border ${isBestValue ? 'border-brand-orange ring-1 ring-brand-orange/30' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      {isBestValue && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          Best Value
                        </div>
                      )}
                      <p className="text-lg font-extrabold text-slate-900 tracking-tight">
                        {gb >= 1 ? (gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)) : '0'} <span className="text-sm font-bold text-slate-400">GB</span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{validityDays} Days</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-brand-orange">${priceUsd.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">${pricePerGb.toFixed(2)}/GB</p>
                      <div className="mt-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-100">
                          Reloadable
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredPackages.length === 0 && searchQuery && (
                <div className="text-center py-10 text-slate-400 text-sm">{t('shop.no_results')}</div>
              )}
            </>
          )}

          {!packagesLoading && !packagesError && filteredPackages.length === 0 && !searchQuery && (
            <div className="text-center py-10 text-slate-400 text-sm">No plans available</div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ShopView;
