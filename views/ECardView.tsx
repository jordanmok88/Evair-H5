import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Smartphone, Monitor, ChevronRight, ChevronDown, CheckCircle2, Loader2, Info, Layers, ArrowDownToLine, Shield, Globe, Signal, Zap, ShoppingBag, Power, Trash2, Plus } from 'lucide-react';
import { ECard, ECardProfile } from '../types';
import { MOCK_ECARDS } from '../constants';
import FlagIcon from '../components/FlagIcon';
import { formatGB } from '../services/dataService';

interface ECardViewProps {
  onBack: () => void;
  onNavigateToEsimShop?: () => void;
}

type ECardTab = 'BIND' | 'PROFILES' | 'GUIDE';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);
const isMobile = isIOS || isAndroid;

const ECardView: React.FC<ECardViewProps> = ({ onBack, onNavigateToEsimShop }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ECardTab>('BIND');
  const [boundCards, setBoundCards] = useState<ECard[]>(MOCK_ECARDS);
  const [eidInput, setEidInput] = useState('');
  const [isBinding, setIsBinding] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(MOCK_ECARDS[0]?.id || null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  const selectedCard = useMemo(() => boundCards.find(c => c.id === selectedCardId), [boundCards, selectedCardId]);

  const handleBind = () => {
    if (!eidInput.trim() || eidInput.length < 10) return;
    setIsBinding(true);
    setTimeout(() => {
      const newCard: ECard = {
        id: `EC-${Date.now()}`,
        eid: eidInput.trim(),
        cardType: 'E2',
        label: `eCard ${boundCards.length + 1}`,
        status: 'BOUND',
        boundDate: new Date().toISOString(),
        profiles: [],
        maxProfiles: 15,
        downloadCount: 0,
        maxDownloads: -1,
      };
      setBoundCards([...boundCards, newCard]);
      setSelectedCardId(newCard.id);
      setEidInput('');
      setIsBinding(false);
      setActiveTab('PROFILES');
    }, 1500);
  };

  const tabs: { key: ECardTab; label: string }[] = [
    { key: 'BIND', label: t('ecard.tab_bind') },
    { key: 'PROFILES', label: t('ecard.tab_profiles') },
    { key: 'GUIDE', label: t('ecard.tab_guide') },
  ];

  const renderStatusBadge = (profile: ECardProfile) => {
    const cfg = {
      ACTIVE: { bg: '#dcfce7', color: '#15803d', label: t('ecard.profile_active') },
      INACTIVE: { bg: '#f1f5f9', color: '#64748b', label: t('ecard.profile_inactive') },
      DOWNLOADING: { bg: '#fef9c3', color: '#a16207', label: t('ecard.profile_downloading') },
    }[profile.status];
    return (
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, backgroundColor: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    );
  };

  const renderBind = () => (
    <div className="space-y-5">
      {/* Hero Banner */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 40%, #FEF3C7 100%)' }}>
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 14px, #FF660012 14px, #FF660012 15px)' }} />
        <div className="absolute top-0 right-0 w-40 h-40 opacity-20" style={{ background: 'radial-gradient(circle at 70% 30%, #FF6600 0%, transparent 70%)' }} />
        <div className="relative p-6 pb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' }}>
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.15em]">Evair eCard</p>
              <p className="text-[10px] font-semibold" style={{ color: '#FF6600' }}>GSMA Certified · SGP.22 V2.5</p>
            </div>
          </div>
          <h2 className="text-[26px] font-extrabold leading-tight tracking-tight mb-2 text-slate-900">
            {t('ecard.hero_headline')}
          </h2>
          <p className="text-slate-600 text-[13px] font-semibold mb-2">{t('ecard.hero_subheadline')}</p>
          <p className="text-slate-500 text-[12.5px] leading-[1.6]">
            {t('ecard.hero_desc')}
          </p>
        </div>
      </div>

      {/* Spec Highlights Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: <Layers size={16} />, title: t('ecard.spec_profiles'), desc: t('ecard.spec_profiles_desc'), color: '#FF6600' },
          { icon: <Shield size={16} />, title: t('ecard.spec_security'), desc: t('ecard.spec_security_desc'), color: '#10B981' },
          { icon: <Globe size={16} />, title: t('ecard.spec_certified'), desc: t('ecard.spec_certified_desc'), color: '#6366F1' },
          { icon: <Signal size={16} />, title: t('ecard.spec_5g'), desc: t('ecard.spec_5g_desc'), color: '#F59E0B' },
        ].map((spec, i) => (
          <div key={i} className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${spec.color}15`, color: spec.color }}>
              {spec.icon}
            </div>
            <p className="text-[12px] font-bold text-slate-900 mb-0.5">{spec.title}</p>
            <p className="text-[10px] text-slate-400 leading-relaxed">{spec.desc}</p>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Zap size={14} className="text-brand-orange" />
          {t('ecard.how_it_works')}
        </h3>
        <div className="space-y-3">
          {[t('ecard.how_step_1'), t('ecard.how_step_2'), t('ecard.how_step_3'), t('ecard.how_step_4')].map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' }}>
                <span className="text-white text-[10px] font-bold">{i + 1}</span>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bind Card Form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="text-base font-bold text-slate-900 mb-1">{t('ecard.bind_title')}</h3>
        <p className="text-slate-400 text-xs mb-4 leading-relaxed">{t('ecard.bind_subtitle')}</p>

        <div className="relative mb-3">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
            <CreditCard size={18} />
          </div>
          <input
            type="text"
            value={eidInput}
            onChange={e => setEidInput(e.target.value)}
            placeholder={t('ecard.eid_placeholder')}
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-slate-300"
          />
        </div>

        <button
          onClick={handleBind}
          disabled={!eidInput.trim() || eidInput.length < 10 || isBinding}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)', boxShadow: '0 4px 14px rgba(255,102,0,0.2)' }}
        >
          {isBinding ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
          {isBinding ? 'Binding...' : t('ecard.bind_button')}
        </button>
      </div>

      {/* eCard Image */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-center">
        <div className="w-full aspect-[1.6/1] bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl flex items-center justify-center mb-3 border border-orange-100/50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #FF6600 10px, #FF6600 11px)' }} />
          <div className="text-center relative">
            <CreditCard size={40} className="text-brand-orange mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Evair eCard</p>
            <p className="text-[11px] text-slate-400 mt-1">EID is printed on the back of the card</p>
          </div>
        </div>
      </div>

      {boundCards.length > 0 && (() => {
        const ECARD_HEIGHT = 72;
        const ECARD_PEEK = 50;
        const selected = boundCards.find(c => c.id === selectedCardId);
        const ordered = selected
          ? [selected, ...boundCards.filter(c => c.id !== selectedCardId)]
          : boundCards;
        return (
          <div>
            <h4 className="text-sm font-bold text-slate-500 tracking-wider mb-3 px-1">{t('ecard.bound_cards')}</h4>
            <div style={{
              position: 'relative',
              height: (boundCards.length - 1) * ECARD_PEEK + ECARD_HEIGHT,
            }}>
              {ordered.map((card, index) => {
                const isSelected = card.id === selectedCardId;
                return (
                  <div
                    key={card.id}
                    onClick={() => { setSelectedCardId(card.id); setActiveTab('PROFILES'); }}
                    style={{
                      position: 'absolute',
                      top: index * ECARD_PEEK,
                      left: 0, right: 0,
                      height: ECARD_HEIGHT,
                      zIndex: boundCards.length - index,
                      cursor: 'pointer',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: index === 0 ? 1 : 0.85 + index * 0.05,
                    }}
                  >
                    <div style={{
                      height: '100%',
                      borderRadius: 20,
                      backgroundColor: '#ffffff',
                      border: isSelected ? '2px solid #FF6600' : '1px solid #e2e8f0',
                      boxShadow: isSelected
                        ? '0 8px 30px rgba(255,102,0,0.15), 0 2px 8px rgba(0,0,0,0.06)'
                        : '0 2px 8px rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                      gap: 12,
                      overflow: 'hidden',
                      transition: 'border 0.2s, box-shadow 0.2s',
                    }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' }}>
                        <CreditCard size={18} className="text-white" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {card.label}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {card.eid}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-semibold text-brand-orange">{card.cardType.replace('_', ' ')}</p>
                        <p className="text-[10px] text-slate-400">{card.profiles.length}/{card.maxProfiles}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );

  const renderProfiles = () => {
    if (!selectedCard) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-semibold mb-1">{t('ecard.no_cards')}</p>
          <p className="text-slate-400 text-sm mb-4">{t('ecard.no_cards_hint')}</p>
          <button
            onClick={() => setActiveTab('BIND')}
            className="text-brand-orange font-bold text-sm"
          >
            {t('ecard.tab_bind')} &rarr;
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Selected card summary */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' }}>
              <CreditCard size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{selectedCard.label}</p>
              <p className="text-[11px] text-slate-400 font-mono">{selectedCard.cardType.replace('_', ' ')} &middot; {selectedCard.eid.slice(0, 8)}...{selectedCard.eid.slice(-4)}</p>
            </div>
          </div>
          <div className="flex gap-3 text-[11px]">
            <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-slate-400 mb-0.5">{t('ecard.profiles_count')}</p>
              <p className="font-bold text-slate-900">{selectedCard.profiles.length}/{selectedCard.maxProfiles}</p>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-slate-400 mb-0.5">{t('ecard.downloads')}</p>
              <p className="font-bold text-slate-900">{selectedCard.maxDownloads === -1 ? t('ecard.unlimited') : `${selectedCard.downloadCount}/${selectedCard.maxDownloads}`}</p>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
              <p className="text-slate-400 mb-0.5">{t('ecard.card_type')}</p>
              <p className="font-bold text-slate-900">{selectedCard.cardType.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Profile list */}
        {selectedCard.profiles.length > 0 ? (
          <div>
            <h4 className="text-sm font-bold text-slate-500 tracking-wider mb-3 px-1">{t('ecard.profiles_title')}</h4>
            <div className="space-y-2.5">
              {selectedCard.profiles.map(profile => {
                const isExpanded = expandedProfileId === profile.id;
                const usagePercent = profile.dataTotalGB > 0 ? Math.min((profile.dataUsedGB / profile.dataTotalGB) * 100, 100) : 0;
                const dataRemaining = Math.max(profile.dataTotalGB - profile.dataUsedGB, 0);
                const isLow = usagePercent > 80 || profile.daysLeft <= 3;

                return (
                  <div key={profile.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                    {/* Collapsed row — always visible */}
                    <button
                      onClick={() => setExpandedProfileId(isExpanded ? null : profile.id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <FlagIcon countryCode={profile.country.countryCode} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{profile.name}</p>
                        <p className="text-[11px] text-slate-400">{formatGB(profile.dataUsedGB)}/{formatGB(profile.dataTotalGB)} &middot; {profile.daysLeft} {t('ecard.days_left')}</p>
                      </div>
                      {renderStatusBadge(profile)}
                      <ChevronDown size={16} className={`text-slate-300 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-slate-50">
                        {/* Usage progress bar */}
                        <div className="pt-3">
                          <div className="flex justify-between items-baseline mb-1.5">
                            <p className="text-[11px] font-semibold text-slate-500">{t('ecard.data_usage')}</p>
                            <p className="text-[11px] font-bold text-slate-700">{dataRemaining.toFixed(1)} GB {t('ecard.data_remaining')}</p>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${usagePercent}%`,
                                background: isLow
                                  ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                                  : 'linear-gradient(90deg, #FF6600, #FF8A3D)',
                              }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <p className="text-[10px] text-slate-400">{formatGB(profile.dataUsedGB)} {t('ecard.data_used')}</p>
                            <p className="text-[10px] text-slate-400">{formatGB(profile.dataTotalGB)} {t('ecard.data_total')}</p>
                          </div>
                        </div>

                        {/* Info row */}
                        <div className="flex gap-2">
                          <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-slate-400 mb-0.5">{t('ecard.profile_region')}</p>
                            <p className="text-[12px] font-bold text-slate-800">{profile.country.name}</p>
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-slate-400 mb-0.5">{t('ecard.profile_expires')}</p>
                            <p className={`text-[12px] font-bold ${isLow ? 'text-red-500' : 'text-slate-800'}`}>{profile.daysLeft} {t('ecard.days_left')}</p>
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
                            <p className="text-[10px] text-slate-400 mb-0.5">{t('ecard.profile_status_label')}</p>
                            <p className={`text-[12px] font-bold ${profile.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-500'}`}>
                              {profile.status === 'ACTIVE' ? t('ecard.profile_active') : t('ecard.profile_inactive')}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                            profile.status === 'ACTIVE'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-brand-orange text-white shadow-sm shadow-orange-500/20'
                          }`}>
                            <Power size={13} />
                            {profile.status === 'ACTIVE' ? t('ecard.deactivate') : t('ecard.activate')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onNavigateToEsimShop?.(); }}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-brand-orange/10 text-brand-orange border border-orange-200 active:scale-[0.98] transition-all"
                          >
                            <Plus size={13} />
                            {t('ecard.top_up')}
                          </button>
                          <button className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 bg-red-50 text-red-500 active:scale-[0.98] transition-all">
                            <Trash2 size={13} />
                            {t('ecard.delete_profile')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <Layers size={32} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-semibold text-sm mb-1">{t('ecard.no_profiles')}</p>
            <p className="text-slate-400 text-xs">{t('ecard.no_profiles_hint')}</p>
          </div>
        )}

        {/* Buy New eSIM */}
        <button
          onClick={() => onNavigateToEsimShop?.()}
          className="w-full bg-white rounded-2xl p-4 border border-dashed border-slate-200 flex items-center gap-3 active:scale-[0.99] transition-all hover:border-brand-orange hover:bg-orange-50/30"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100/50">
            <ShoppingBag size={18} className="text-brand-orange" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-slate-900">{t('ecard.buy_new_esim')}</p>
            <p className="text-[11px] text-slate-400">{t('ecard.buy_new_esim_hint')}</p>
          </div>
          <ChevronRight size={16} className="text-slate-300 shrink-0" />
        </button>
      </div>
    );
  };

  const renderGuideStep = (num: number, text: string) => (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-brand-orange/15 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-brand-orange text-xs font-bold">{num}</span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
    </div>
  );

  const renderGuide = () => (
    <div className="space-y-4">
      {!isMobile && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
          <Monitor size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">{t('ecard.guide_desktop_note')}</p>
        </div>
      )}

      {/* Android Guide */}
      <div className={`bg-white rounded-2xl p-5 border shadow-sm ${isAndroid ? 'border-green-200 shadow-green-50' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAndroid ? 'bg-green-100' : 'bg-slate-100'}`}>
            <Smartphone size={16} className={isAndroid ? 'text-green-600' : 'text-slate-400'} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{t('ecard.guide_android_title')}</h4>
            {isAndroid && <p className="text-[10px] text-green-600 font-semibold">{t('ecard.guide_auto_detected')}</p>}
          </div>
        </div>
        <div className="space-y-3">
          {renderGuideStep(1, t('ecard.guide_android_step1'))}
          {renderGuideStep(2, t('ecard.guide_android_step2'))}
          {renderGuideStep(3, t('ecard.guide_android_step3'))}
          {renderGuideStep(4, t('ecard.guide_android_step4'))}
        </div>
      </div>

      {/* iOS Guide */}
      <div className={`bg-white rounded-2xl p-5 border shadow-sm ${isIOS ? 'border-blue-200 shadow-blue-50' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isIOS ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <Smartphone size={16} className={isIOS ? 'text-blue-600' : 'text-slate-400'} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{t('ecard.guide_ios_title')}</h4>
            {isIOS && <p className="text-[10px] text-blue-600 font-semibold">{t('ecard.guide_auto_detected')}</p>}
          </div>
        </div>
        <div className="space-y-3">
          {renderGuideStep(1, t('ecard.guide_ios_step1'))}
          {renderGuideStep(2, t('ecard.guide_ios_step2'))}
          {renderGuideStep(3, t('ecard.guide_ios_step3'))}
          {renderGuideStep(4, t('ecard.guide_ios_step4'))}
          {renderGuideStep(5, t('ecard.guide_ios_step5'))}
        </div>
        <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
          <p className="text-xs text-amber-700 leading-relaxed flex items-start gap-2">
            <Info size={13} className="shrink-0 mt-0.5" />
            {t('ecard.guide_ios_note')}
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100/50">
        <h4 className="text-sm font-bold text-slate-900 mb-3">{t('ecard.features_header')}</h4>
        <div className="space-y-2.5">
          {[t('ecard.feature_1'), t('ecard.feature_2'), t('ecard.feature_3'), t('ecard.feature_4'), t('ecard.feature_5'), t('ecard.feature_6')].map((f, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-brand-orange shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">{f}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#F2F4F7]">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl pt-safe px-4 pb-3 shrink-0 sticky top-0 z-10 border-b border-slate-100">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">{t('ecard.title')}</h1>
      </div>

      {/* Tab Switcher */}
      <div className="px-5 mb-5 shrink-0">
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pb-6">
        {activeTab === 'BIND' && renderBind()}
        {activeTab === 'PROFILES' && renderProfiles()}
        {activeTab === 'GUIDE' && renderGuide()}
      </div>
    </div>
  );
};

export default ECardView;
