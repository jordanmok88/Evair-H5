import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronRight, ArrowLeft, Globe, Star, X, MapPin, Loader2, Smartphone, Truck, CheckCircle, Calendar, Wifi, Signal, Info, CreditCard, ArrowDown, ShoppingBag } from 'lucide-react';
import { Country, Plan, SimType, User } from '../types';
import { MOCK_COUNTRIES } from '../constants';
import FlagIcon from '../components/FlagIcon';

interface ShopViewProps {
  isLoggedIn: boolean;
  user?: User;
  onLoginRequest: () => void;
  onPurchaseComplete: () => void;
  simType: SimType;
  onSwitchToMySims?: () => void;
  hasActiveSims?: boolean;
  onSwitchToSetup?: () => void;
  onAddCard?: (iccid: string) => void;
}

const ShopView: React.FC<ShopViewProps> = ({ isLoggedIn, user, onLoginRequest, onPurchaseComplete, simType, onSwitchToMySims, hasActiveSims, onSwitchToSetup, onAddCard }) => {
  const { t } = useTranslation();
  const TOP_COUNTRY_COUNT = 10;
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCountries, setShowAllCountries] = useState(false);
  
  // Checkout State
  const [address, setAddress] = useState('123 Tech Park, San Francisco, CA'); 
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Filter countries
  const filteredCountries = MOCK_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const shouldLimitCountries = !searchQuery && !showAllCountries;
  const visibleCountries = shouldLimitCountries
    ? filteredCountries.slice(0, TOP_COUNTRY_COUNT)
    : filteredCountries;
  const hiddenCountryCount = Math.max(filteredCountries.length - TOP_COUNTRY_COUNT, 0);

  const handlePlanClick = (plan: Plan) => {
    if (!isLoggedIn) {
      onLoginRequest();
    } else {
      setSelectedPlan(plan);
    }
  };

  const handleCheckout = () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
        setIsProcessing(false);
        setShowSuccess(true);
        
        // Wait for animation then redirect
        setTimeout(() => {
           setShowSuccess(false);
           setSelectedPlan(null);
           setSelectedCountry(null);
           onPurchaseComplete();
        }, 2000);
    }, 1500);
  };

  // --- SUCCESS OVERLAY (Ultra Thick Material) ---
  if (showSuccess) {
      return (
          <div className="absolute inset-0 z-[70] bg-white/60 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-lg">
                  <CheckCircle size={48} className="text-[#34C759]" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">{t('shop.order_confirmed')}</h2>
              <p className="text-slate-500 text-center mb-8 font-medium">
                  {simType === 'ESIM' ? t('shop.esim_generating') : t('shop.sim_preparing')}.
              </p>
              <Loader2 className="animate-spin text-brand-orange" />
          </div>
      );
  }

  // --- SUB-VIEW: Country Details & Plans ---
  if (selectedCountry) {
    const discountedPrice = selectedPlan ? selectedPlan.price * 0.5 : 0;
    const shippingCost = simType === 'PHYSICAL' ? 5.99 : 0;
    const total = discountedPrice + shippingCost;

    return (
      <div className="h-full flex flex-col relative bg-[#F2F4F7]">
        {/* Checkout Modal - inlined to avoid remounting on each keystroke (fixes input focus loss) */}
        {selectedPlan && (
          <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm">
             <div className="bg-white/95 backdrop-blur-2xl border-t border-white/50 w-full sm:w-[90%] sm:max-w-sm max-h-[90vh] sm:max-h-[85vh] rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl overflow-y-auto overscroll-contain">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('shop.checkout')}</h2>
                    <button onClick={() => setSelectedPlan(null)} className="p-2 bg-gray-100 rounded-full text-slate-500 hover:bg-gray-200">
                        <X size={20} />
                    </button>
                </div>

                {/* Plan Summary - Inset Card */}
                <div className="bg-white/50 border border-white/60 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{t('shop.selected_plan')}</p>
                        <p className="font-bold text-slate-900 text-lg">{selectedCountry?.name} - {selectedPlan.name}</p>
                        <p className="text-sm text-slate-500 font-medium">{selectedPlan.data} / {selectedPlan.days} Days</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-sm text-slate-300 line-through">${selectedPlan.price.toFixed(2)}</span>
                        <span className="text-xl font-bold text-brand-red">${discountedPrice.toFixed(2)}</span>
                        <span className="text-[11px] font-bold text-white bg-brand-red px-1.5 py-0.5 rounded mt-0.5">50% OFF</span>
                    </div>
                </div>

                {/* Type Summary */}
                <div className="mb-6 bg-orange-50/50 border border-orange-100 p-4 rounded-xl flex items-center gap-3 text-brand-orange">
                     {simType === 'ESIM' ? <Smartphone size={24} /> : <CreditCard size={24} />}
                     <div className="flex-1">
                         <p className="text-sm font-bold uppercase tracking-wider opacity-70">{t('shop.product_type')}</p>
                         <p className="font-bold">{simType === 'ESIM' ? t('shop.esim_digital') : t('shop.physical_sim_card')}</p>
                     </div>
                </div>

                {/* Email Address */}
                <div className="mb-6">
                     <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('shop.email_address')}</label>
                     <div className="relative">
                        <svg className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        <input 
                            type="email"
                            placeholder={t('shop.email_placeholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                        />
                     </div>
                </div>

                {/* Address Input for Physical */}
                {simType === 'PHYSICAL' && (
                    <div className="mb-6">
                         <label className="block text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('shop.shipping_address')}</label>
                         <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" size={18} />
                            <input 
                                type="text"
                                placeholder={t('shop.address_placeholder')}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                autoComplete="street-address"
                                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                            />
                         </div>
                    </div>
                )}

                {/* Payment Button */}
                <button 
                    onClick={handleCheckout}
                    disabled={isProcessing || !email.includes('@') || (simType === 'PHYSICAL' && address.length < 5)}
                    className="w-full bg-brand-orange text-white py-4 rounded-[1.2rem] font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600"
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : (
                        <>{t('shop.pay')} ${total.toFixed(2)}</>
                    )}
                </button>
             </div>
          </div>
        )}

        {/* Header - Thick Glass */}
        <div className="bg-white/80 backdrop-blur-xl backdrop-saturate-150 px-5 pt-safe pb-4 border-b border-gray-200/50 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center">
                <button 
                    onClick={() => setSelectedCountry(null)}
                    className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-black/5 text-slate-900 transition-colors"
                >
                    <ArrowLeft size={24} strokeWidth={2.5} />
                </button>
                <h1 className="text-xl font-bold text-slate-900 ml-1 tracking-tight">{selectedCountry.name}</h1>
            </div>
            <button className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-brand-orange">
                <Info size={20} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32 px-5 pt-6">
          
          {/* Visual Country Header */}
          <div className="flex items-center gap-5 mb-8 px-2">
              <FlagIcon countryCode={selectedCountry.countryCode} size="lg" />
              <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="bg-[#34C759]/10 backdrop-blur-sm text-[#34C759] px-2 py-0.5 rounded-md text-[13px] font-bold uppercase tracking-wide flex items-center gap-1 border border-[#34C759]/20">
                          <Signal size={10} /> {selectedCountry.networks?.length || 0} {t('shop.networks')}
                      </div>
                      {(selectedCountry.vpn || selectedCountry.vpmn) && (
                        <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[13px] font-bold uppercase tracking-wide border border-blue-100">
                          VPN{selectedCountry.vpmn ? ` · ${selectedCountry.vpmn}` : ''}
                        </div>
                      )}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{selectedCountry.name}</h2>
                  <p className="text-sm text-slate-400 mt-1">{selectedCountry.networks?.join(' · ')}</p>
              </div>
          </div>

          <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t('shop.select_plan')}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-white bg-brand-red px-2 py-1 rounded-lg">{t('shop.first_order_discount')}</span>
                <span className="text-sm font-bold text-brand-orange bg-orange-50 px-2 py-1 rounded-lg">{t('shop.instant_activation')}</span>
              </div>
          </div>
          
          <div className="space-y-4">
            {selectedCountry.plans.map((plan) => (
              <div 
                key={plan.id}
                onClick={() => handlePlanClick(plan)}
                className={`group relative bg-white/70 backdrop-blur-xl rounded-[1.75rem] p-6 border transition-all cursor-pointer ${plan.isBestValue ? 'border-brand-orange/50 shadow-lg shadow-orange-100/50 ring-2 ring-brand-orange/20' : 'border-white/60 shadow-sm hover:bg-white/90'}`}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-brand-red text-white text-[12px] font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-[1.55rem] uppercase tracking-wide z-10 shadow-sm">
                    {t('shop.most_popular')}
                  </div>
                )}
                {plan.isBestValue && (
                  <div className="absolute top-0 right-0 bg-brand-orange text-white text-[12px] font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-[1.55rem] uppercase tracking-wide z-10 shadow-sm">
                    {t('shop.best_value')}
                  </div>
                )}

                <div className={`flex justify-between items-end mb-6 ${(plan.isPopular || plan.isBestValue) ? 'pt-8' : ''}`}>
                  <div>
                    <p className="text-slate-400 font-bold text-[12px] uppercase tracking-widest mb-1">{plan.name}</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-5xl font-bold text-slate-900 tracking-tighter">{plan.data.split(' ')[0]}</h3>
                        <span className="text-xl font-bold text-slate-400">GB</span>
                    </div>
                  </div>
                  <div className="text-right">
                     <div className="flex flex-col items-end gap-2">
                         <span className="text-sm font-bold text-slate-300 line-through">${plan.price.toFixed(2)}</span>
                         <span className="text-3xl font-bold text-brand-red group-hover:text-brand-orange transition-colors leading-none">${(plan.price * 0.5).toFixed(2)}</span>
                         <span className="text-slate-400 text-sm font-bold">{t('shop.usd_first_order')}</span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white/40 rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-1 border border-white/50">
                        <Calendar size={18} className="text-slate-500" />
                        <span className="font-semibold text-slate-700 text-sm">{plan.days} {t('shop.days')}</span>
                    </div>
                    <div className="bg-white/40 rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-1 border border-white/50">
                        <Signal size={18} className="text-slate-500" />
                        <span className="font-semibold text-slate-700 text-sm">5G</span>
                    </div>
                    <div className="bg-white/40 rounded-2xl py-3 px-2 flex flex-col items-center justify-center gap-1 border border-white/50">
                        <Wifi size={18} className="text-slate-500" />
                        <span className="font-semibold text-slate-700 text-sm">{t('shop.hotspot')}</span>
                    </div>
                </div>

                <button 
                  className={`w-full py-3.5 rounded-[1rem] font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${plan.isBestValue ? 'bg-brand-orange text-white shadow-lg shadow-orange-200' : 'bg-slate-50 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 shadow-sm'}`}
                >
                  {t('shop.choose')} {plan.data}
                  <ChevronRight size={16} className="opacity-60" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center pb-6">
              <p className="text-slate-400 text-sm flex items-center justify-center gap-1">
                  <Globe size={12} /> {t('shop.global_roaming')}
              </p>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN VIEW: Shop Home ---
  return (
    <div className="h-full flex flex-col relative bg-[#F2F4F7]">
      {/* Header - Thick Glass */}
      <div className="bg-white/80 backdrop-blur-xl backdrop-saturate-150 px-6 pt-safe pb-4 sticky top-0 z-40 border-b border-gray-200/50">
        <div className="flex justify-between items-end mb-4">
            <div>
                <p className="text-sm font-bold text-brand-orange uppercase tracking-wider mb-1">
                    {t('shop.hello')} {isLoggedIn && user ? user.name : t('shop.new_friend')},
                </p>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                    {simType === 'ESIM' ? t('shop.welcome_esim') : t('shop.welcome_sim')}
                </h1>
            </div>
            {hasActiveSims && onSwitchToMySims && (
                <button 
                  onClick={onSwitchToMySims}
                  className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform shadow-lg shadow-slate-900/20 mb-1"
                >
                   {simType === 'ESIM' ? t('shop.my_esims') : t('shop.my_sims')}
                </button>
            )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          {/* iOS Style Search Bar */}
          <input 
            type="text" 
            placeholder={t('shop.search_placeholder')} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#E3E3E8] border-none text-slate-900 pl-10 pr-4 py-2.5 rounded-[10px] text-[17px] leading-5 focus:outline-none focus:ring-0 placeholder-gray-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-5 pt-6">
        
        {/* HERO SECTION: 'Purchase' for eSIM, 'Bind' for Physical */}
        {!searchQuery && (
            <div className="mb-8">
                {simType === 'ESIM' ? (
                    // eSIM purchase banner — brand colors: #FF6600, #CC0000, #FFCC33
                    <div className="relative rounded-[2rem] overflow-hidden shadow-xl shadow-[#CC0000]/20" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #CC0000 100%)' }}>
                        {/* Soft golden glow accent */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #FFCC33 0%, transparent 70%)' }} />
                        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #FF6600 0%, transparent 70%)' }} />

                        <div className="relative z-10 p-7 pb-8">
                            {/* Top row */}
                            <div className="flex items-center justify-between mb-8">
                                <p className="text-[22px] font-extrabold text-white tracking-tight">
                                    Evair<span className="text-[#FFCC33]">SIM</span>
                                </p>
                                <div className="bg-white/15 backdrop-blur-sm border border-white/20 px-3.5 py-1.5 rounded-full">
                                    <span className="text-[11px] font-bold text-white/90 uppercase tracking-[0.12em]">{t('shop.official_store')}</span>
                                </div>
                            </div>

                            {/* Heading */}
                            <h2 className="text-[34px] font-extrabold text-white mb-3 tracking-tight leading-[1.08]">
                                {t('shop.purchase_your_esim')}<br/>
                                <span className="text-[#FFCC33]">{t('shop.your_esim')}</span>
                            </h2>

                            {/* Subtext */}
                            <p className="text-white/75 font-medium text-[14px] leading-relaxed max-w-[260px]">
                                {t('shop.esim_subtitle')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' }}>
                                <CreditCard size={22} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('shop.bind_sim')}</h2>
                                <p className="text-slate-400 text-sm font-medium mt-0.5">Track delivery, activate &amp; get started</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-[13px] text-slate-400 mb-5">
                            <span className="flex items-center gap-1.5"><Truck size={14} className="text-brand-orange" /> Delivery Tracking</span>
                            <span className="flex items-center gap-1.5"><Smartphone size={14} className="text-brand-orange" /> SIM Activation</span>
                        </div>

                        <button
                            onClick={() => {
                                if (!isLoggedIn) {
                                    onLoginRequest();
                                } else {
                                    onSwitchToSetup?.();
                                }
                            }}
                            className="w-full py-4 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)',
                                color: '#fff',
                                boxShadow: '0 4px 14px rgba(255,102,0,0.25)',
                            }}
                        >
                            Set Up SIM Card
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* All Countries List - Inset Grouped Style */}
        <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">
          {searchQuery ? t('shop.search_results') : (simType === 'ESIM' ? t('shop.buy_new_esim') : t('shop.buy_new_sim'))}
        </h3>
        <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] border border-white/60 divide-y divide-gray-200/50 overflow-hidden shadow-sm mb-6">
          {visibleCountries.map((country) => (
             <button 
                key={country.id}
                onClick={() => setSelectedCountry(country)}
                className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors text-left group"
             >
                <div className="flex items-center gap-4">
                  <FlagIcon countryCode={country.countryCode} size="md" />
                  <div>
                    <p className="font-semibold text-slate-900 text-[15px]">{country.name}</p>
                    <p className="text-sm text-slate-400">
                      {country.networks?.join(' · ') || `${country.plans.length} Plans`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                   <span className="text-sm font-medium text-slate-400 group-hover:text-brand-orange transition-colors whitespace-nowrap">{t('shop.from')} ${country.startPrice.toFixed(2)}</span>
                   <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </div>
             </button>
          ))}
        </div>
        {!searchQuery && !showAllCountries && hiddenCountryCount > 0 && (
          <button
            onClick={() => setShowAllCountries(true)}
            className="w-full py-3.5 rounded-[1rem] bg-slate-900 text-white font-semibold text-sm shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform mb-6"
          >
            {t('shop.view_all_countries')} ({hiddenCountryCount} {t('shop.more')})
          </button>
        )}
      </div>
    </div>
  );
};

export default ShopView;