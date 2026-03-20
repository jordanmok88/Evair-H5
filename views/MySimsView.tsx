import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, Phone, Zap, ChevronDown, CheckCircle2, QrCode, Copy, X, Calendar, Clock, SignalHigh, Smartphone, RefreshCw, Plus, ShoppingBag, Settings, MoreHorizontal, Trash2, Check, AlertTriangle, Loader2, Globe, Database } from 'lucide-react';
import { ActiveSim, Tab, SimType, EsimPackage } from '../types';
import FlagIcon from '../components/FlagIcon';
import { CARRIER_MAP } from '../constants';
import { topUp, formatVolume, formatPrice, retailPrice } from '../services/esimApi';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { packageService, esimService } from '../services/api';
import type { PackageDto, TopupRequest } from '../services/api/types';

// ─── 后端套餐数据转换为前端格式 ────────────────────────────────────────

function convertPackageDtoToEsimPackage(dto: PackageDto): EsimPackage {
  // volume: backend returns GB, need to convert to bytes
  const volumeBytes = dto.volume * 1024 * 1024 * 1024;

  return {
    packageCode: dto.packageCode,
    name: dto.name,
    price: dto.price * 10000, // backend returns USD, convert to micro-cents
    currencyCode: dto.currency,
    volume: volumeBytes,
    unusedValidTime: 0,
    duration: dto.duration,
    durationUnit: dto.durationUnit,
    location: dto.location,
    description: dto.description || '',
    activeType: 1,
  };
}

interface MySimsViewProps {
  activeSims: ActiveSim[];
  onNavigate: (tab: Tab) => void;
  filterType: SimType;
  onSwitchToShop?: () => void;
  onDeleteSim?: (simId: string) => void;
  onSwitchToSetup?: () => void;
  onUpdateSim?: (simId: string, updates: Partial<ActiveSim>) => void;
}

const CARD_HEIGHT = 72;
const CARD_PEEK = 50;

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

function resolveIccid(sim: ActiveSim): string {
  return sim.iccid || `898520002633221${sim.id.replace(/\D/g, '').slice(0, 5)}`;
}

const MySimsView: React.FC<MySimsViewProps> = ({ activeSims, onNavigate, filterType, onSwitchToShop, onDeleteSim, onSwitchToSetup, onUpdateSim }) => {
  const { t } = useTranslation();
  const swipeBack = useCallback(() => { onSwitchToShop?.(); }, [onSwitchToShop]);
  useEdgeSwipeBack(swipeBack);
  const filteredSims = activeSims.filter(s => s.type === filterType);
  
  const [selectedSimId, setSelectedSimId] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<'smdp' | 'activation' | 'qr' | null>(null);
  const [deleteConfirmSimId, setDeleteConfirmSimId] = useState<string | null>(null);

  // eSIM API states for top-up
  const [topUpPackages, setTopUpPackages] = useState<EsimPackage[]>([]);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [selectedTopUp, setSelectedTopUp] = useState<EsimPackage | null>(null);
  const [topUpProcessing, setTopUpProcessing] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  const currentSim = filteredSims.find(s => s.id === selectedSimId) || filteredSims[0];

  useEffect(() => {
    if (filteredSims.length > 0 && (!selectedSimId || !filteredSims.find(s => s.id === selectedSimId))) {
        setSelectedSimId(filteredSims[0].id);
    }
  }, [filteredSims, selectedSimId]);

  useEffect(() => {
    if (isRechargeModalOpen && topUpPackages.length === 0 && !topUpLoading && currentSim) {
      setTopUpLoading(true);
      const iccid = resolveIccid(currentSim);
      if (currentSim.type === 'ESIM') {
        // 优先使用后端 API 获取充值套餐
        packageService.getRechargePackages(iccid)
          .then(res => {
            const converted = res.packages.map(convertPackageDtoToEsimPackage);
            setTopUpPackages(converted);
          })
          .catch(() => {
            // 失败时使用 legacy API
            import('../services/esimApi').then(({ fetchTopUpPackages }) => {
              fetchTopUpPackages(iccid).then(setTopUpPackages).catch(() => {});
            });
          })
          .finally(() => setTopUpLoading(false));
      } else {
        import('../services/esimApi').then(({ fetchPackages }) => {
          fetchPackages({ locationCode: currentSim.country.countryCode })
            .then(setTopUpPackages)
            .catch(() => {})
            .finally(() => setTopUpLoading(false));
        });
      }
    }
  }, [isRechargeModalOpen, currentSim]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (currentSim?.type === 'ESIM') {
        const iccid = resolveIccid(currentSim);
        // 优先使用后端 API 获取用量
        await esimService.getUsage(iccid).catch(() => {
          // 失败时使用 legacy API
          return import('../services/esimApi').then(({ checkDataUsage }) => checkDataUsage(iccid));
        });
      }
    } finally {
      setTimeout(() => setIsSyncing(false), 1500);
    }
  };

  const handleCopyIccid = (sim: ActiveSim) => {
      const iccid = resolveIccid(sim);
      navigator.clipboard.writeText(iccid).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleCardClick = (simId: string) => {
    if (isExpanded) {
      setSelectedSimId(simId);
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  };

  // EMPTY STATE
  if (!currentSim) {
      return (
          <div className="sm:h-full min-h-[60vh] flex flex-col items-center justify-center px-8 text-center bg-[#F2F4F7]">
              <div className="relative mb-10">
                  <div className="w-60 h-36 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-5 relative overflow-hidden">
                      <div className="w-12 h-16 rounded-lg border-2 border-slate-100 bg-slate-50 mb-3 grid grid-cols-2 gap-0.5 p-1">
                          <div className="border border-slate-200 rounded-sm"></div>
                          <div className="border border-slate-200 rounded-sm"></div>
                          <div className="border border-slate-200 rounded-sm"></div>
                          <div className="border border-slate-200 rounded-sm"></div>
                      </div>
                      <div className="flex gap-2 mt-auto">
                          <div className="h-3 w-12 bg-slate-100 rounded-full"></div>
                          <div className="h-3 w-20 bg-slate-100 rounded-full"></div>
                      </div>
                  </div>
                  <div className="absolute -bottom-6 -right-4 z-10">
                      <button 
                         onClick={onSwitchToShop}
                         className="w-16 h-16 rounded-full bg-[#E8EAEF] flex items-center justify-center border-4 border-[#F2F4F7] shadow-md active:scale-95 transition-transform text-slate-400"
                      >
                          <Plus size={32} strokeWidth={3} />
                      </button>
                  </div>
              </div>
              <p className="text-slate-500 mb-8 font-medium text-base tracking-tight">
                  {filterType === 'ESIM' ? t('my_sims.no_esims') : t('my_sims.no_sims')}
              </p>
              {onSwitchToShop && (
                <button 
                    onClick={onSwitchToShop}
                    className="bg-brand-orange hover:bg-orange-600 text-white w-40 py-3 rounded-xl font-bold text-base shadow-lg shadow-orange-500/15 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={20} strokeWidth={3} />
                    {t('my_sims.add')}
                </button>
              )}
          </div>
      )
  }

  // --- RING GAUGE LOGIC ---
  const dataUsed = currentSim.dataUsedGB;
  const dataTotal = currentSim.dataTotalGB;
  const dataRemaining = Math.max(0, dataTotal - dataUsed);
  const percentRemaining = Math.min((dataRemaining / dataTotal) * 100, 100);
  const percentUsed = 100 - percentRemaining;
  const ringRadius = 80;
  const ringStroke = 22;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const totalSegs = 46;
  const segArc = ringCircumference / totalSegs;
  const gapArc = segArc * 0.3;
  const fillArc = segArc - gapArc;
  const remainingSegs = Math.round((percentRemaining / 100) * totalSegs);
  const usedSegs = totalSegs - remainingSegs;

  const handleCopy = (text: string, field: 'smdp' | 'activation' | 'qr') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  if (isInstallModalOpen) {
    return (
      <div className="sm:h-full flex flex-col bg-[#1c1c1e]">
          <div className="px-4 pt-safe pb-3 flex items-center justify-between shrink-0 sticky top-0 bg-[#1c1c1e] z-10 border-b border-white/10">
              <h2 className="text-white text-lg font-bold tracking-tight">{t('my_sims.install_esim')}</h2>
              <button onClick={() => { setIsInstallModalOpen(false); setCopiedField(null); }} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-colors">
                  <X size={18} />
              </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col px-5 pb-2 gap-4 overflow-y-auto no-scrollbar">

              {/* Method 1: QR Code */}
              <div>
                  <p className="text-white/50 text-[11px] uppercase font-bold tracking-wider mb-2 px-1">{t('my_sims.method_qr')}</p>
                  <div className="bg-white rounded-2xl px-5 py-4 flex flex-col items-center">
                      <div className="bg-slate-50 p-2 rounded-xl mb-2.5 border border-slate-100">
                          <div className="w-28 h-28 bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                              <div className="absolute inset-1.5 border-[3px] border-white rounded flex flex-wrap content-center justify-center p-1 gap-0.5 bg-white">
                                  {Array.from({length: 81}).map((_, i) => (
                                      <div key={i} className={`w-2 h-2 bg-black ${Math.random() > 0.6 ? 'opacity-0' : 'opacity-100'}`}></div>
                                  ))}
                              </div>
                          </div>
                      </div>
                      <p className="text-center text-slate-500 text-xs mb-2.5 max-w-[240px] leading-relaxed font-medium">
                          {t('my_sims.scan_instructions')}
                      </p>
                      <button
                          onClick={() => handleCopy('LPA:1$rsp.evairsim.com$ABCD-1234', 'qr')}
                          className={`flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95 border ${
                            copiedField === 'qr'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-orange-50 text-brand-orange border-orange-100 hover:bg-orange-100'
                          }`}
                      >
                          {copiedField === 'qr' ? <Check size={16} /> : <Copy size={16} />}
                          {copiedField === 'qr' ? t('my_sims.copied') : t('my_sims.copy_qr_data')}
                      </button>
                  </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 px-1">
                   <div className="h-px bg-white/15 flex-1"></div>
                   <span className="text-white/30 text-[11px] font-bold uppercase tracking-wider">{t('my_sims.or_enter_manually')}</span>
                   <div className="h-px bg-white/15 flex-1"></div>
              </div>

              {/* Method 2: Manual Entry — Step by Step */}
              <div>
                  <p className="text-white/50 text-[11px] uppercase font-bold tracking-wider mb-2 px-1">{t('my_sims.method_manual')}</p>
                  <div className="space-y-2.5">

                      {/* Step 1 */}
                      <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-brand-orange/20 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-brand-orange text-xs font-bold">1</span>
                          </div>
                          <p className="text-white/70 text-sm leading-relaxed">{t('my_sims.install_step1')}</p>
                      </div>

                      {/* Step 2: SM-DP+ Address */}
                      <div className={`rounded-xl p-3.5 border transition-colors ${copiedField === 'smdp' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex gap-3 mb-2.5">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${copiedField === 'smdp' ? 'bg-emerald-500/30' : 'bg-brand-orange/20'}`}>
                                  {copiedField === 'smdp' ? <Check size={12} className="text-emerald-400" /> : <span className="text-brand-orange text-xs font-bold">2</span>}
                              </div>
                              <p className="text-white/70 text-sm leading-relaxed">{t('my_sims.install_step2')}</p>
                          </div>
                          <button
                              onClick={() => handleCopy('rsp.evairsim.com', 'smdp')}
                              className="w-full flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5 active:scale-[0.98] transition-transform"
                          >
                              <code className="text-white font-mono text-sm truncate mr-3">rsp.evairsim.com</code>
                              <span className="flex items-center gap-1.5 shrink-0">
                                  {copiedField === 'smdp' ? (
                                      <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1"><Check size={14} />{t('my_sims.copied')}</span>
                                  ) : (
                                      <span className="text-brand-orange text-xs font-semibold flex items-center gap-1"><Copy size={14} />{t('my_sims.tap_to_copy')}</span>
                                  )}
                              </span>
                          </button>
                      </div>

                      {/* Step 3: Activation Code */}
                      <div className={`rounded-xl p-3.5 border transition-colors ${copiedField === 'activation' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex gap-3 mb-2.5">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${copiedField === 'activation' ? 'bg-emerald-500/30' : 'bg-brand-orange/20'}`}>
                                  {copiedField === 'activation' ? <Check size={12} className="text-emerald-400" /> : <span className="text-brand-orange text-xs font-bold">3</span>}
                              </div>
                              <p className="text-white/70 text-sm leading-relaxed">{t('my_sims.install_step3')}</p>
                          </div>
                          <button
                              onClick={() => handleCopy('LPA:1$rsp.evairsim.com$ABCD-1234', 'activation')}
                              className="w-full flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5 active:scale-[0.98] transition-transform"
                          >
                              <code className="text-white font-mono text-[13px] truncate mr-3">LPA:1$rsp.evairsim.com$ABCD-1234</code>
                              <span className="flex items-center gap-1.5 shrink-0">
                                  {copiedField === 'activation' ? (
                                      <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1"><Check size={14} />{t('my_sims.copied')}</span>
                                  ) : (
                                      <span className="text-brand-orange text-xs font-semibold flex items-center gap-1"><Copy size={14} />{t('my_sims.tap_to_copy')}</span>
                                  )}
                              </span>
                          </button>
                      </div>

                  </div>
              </div>
          </div>
          <div className="shrink-0 px-5 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
               <button 
                  onClick={() => { setIsInstallModalOpen(false); setCopiedField(null); }}
                  className="w-full bg-brand-orange text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
               >
                   {t('my_sims.done')}
               </button>
          </div>
      </div>
    );
  }

  return (
    <div className={`sm:h-full flex flex-col bg-[#F2F4F7] no-scrollbar relative ${isRechargeModalOpen ? 'overflow-hidden' : 'sm:overflow-y-auto'}`}>
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl pt-safe px-4 pb-3 flex items-center justify-between shrink-0 sticky top-0 z-10 border-b border-slate-100">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">{filterType === 'ESIM' ? t('my_sims.title_esims') : t('my_sims.title_sims')}</h1>
          <div className="flex gap-2">
             <button onClick={handleSync} className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 active:scale-95 transition-transform">
                 <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
             </button>
             {onSwitchToShop && (
                <button onClick={onSwitchToShop} className="w-9 h-9 bg-brand-orange text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
                    <Plus size={18} />
                </button>
             )}
          </div>
      </div>

      {/* SIM cards — stacked or expanded flat list */}
      <div className="px-4 mb-6">
        <div style={{
          position: 'relative',
          height: isExpanded
            ? filteredSims.length * (CARD_HEIGHT + 4) - 4
            : (filteredSims.length - 1) * CARD_PEEK + CARD_HEIGHT,
          transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {(isExpanded ? filteredSims : [currentSim, ...filteredSims.filter(s => s.id !== selectedSimId)]).map((sim, index) => {
              const isSelected = sim.id === selectedSimId;
              const simRemaining = Math.max(0, sim.dataTotalGB - sim.dataUsedGB);
              const simUsagePercent = sim.dataTotalGB > 0 ? (sim.dataUsedGB / sim.dataTotalGB) * 100 : 0;
              const isDataLow = simUsagePercent >= 80 && sim.status === 'ACTIVE';
              return (
                <div
                  key={sim.id}
                  onClick={() => handleCardClick(sim.id)}
                  style={{
                    position: 'absolute',
                    top: isExpanded ? index * (CARD_HEIGHT + 4) : index * CARD_PEEK,
                    left: 0,
                    right: 0,
                    height: CARD_HEIGHT,
                    zIndex: isExpanded ? 1 : filteredSims.length - index,
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    opacity: isExpanded ? 1 : (index === 0 ? 1 : 0.85 + index * 0.05),
                  }}
                >
                  <div style={{
                    height: '100%',
                    borderRadius: 20,
                    backgroundColor: '#ffffff',
                    border: isExpanded
                      ? isDataLow ? '1.5px solid #fbbf24' : '1px solid #e2e8f0'
                      : isSelected ? '2px solid #FF6600' : isDataLow ? '1.5px solid #fbbf24' : '1px solid #e2e8f0',
                    boxShadow: isExpanded
                      ? '0 2px 8px rgba(0,0,0,0.05)'
                      : isSelected ? '0 8px 30px rgba(255, 102, 0, 0.15), 0 2px 8px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: 12,
                    overflow: 'hidden',
                    transition: 'border 0.2s, box-shadow 0.2s',
                  }}>
                    <div className="relative shrink-0">
                      <FlagIcon countryCode={sim.country.countryCode} size="md" />
                      {isDataLow && (
                        <div style={{
                          position: 'absolute', bottom: -2, right: -2,
                          width: 14, height: 14, borderRadius: 7,
                          backgroundColor: '#FEF3C7', border: '1.5px solid #FBBF24',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <AlertTriangle size={8} color="#D97706" />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 70, overflow: 'hidden' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sim.country.name}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isDataLow ? '#D97706' : '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isDataLow ? `⚠ ${simRemaining.toFixed(1)} GB ${t('my_sims.gb_remaining')}` : `${simRemaining.toFixed(1)} / ${sim.dataTotalGB.toFixed(0)} GB ${t('my_sims.gb_remaining')}`}
                      </div>
                    </div>
                    <div
                      onClick={(e) => {
                        if ((sim.status === 'PENDING_ACTIVATION' || sim.status === 'NOT_ACTIVATED') && onSwitchToSetup) {
                          e.stopPropagation();
                          onSwitchToSetup();
                        }
                      }}
                      style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      whiteSpace: 'nowrap',
                      backgroundColor: sim.status === 'ACTIVE' ? '#dcfce7'
                        : (sim.status === 'PENDING_ACTIVATION' || sim.status === 'NOT_ACTIVATED') ? '#fef9c3'
                        : '#fee2e2',
                      color: sim.status === 'ACTIVE' ? '#15803d'
                        : (sim.status === 'PENDING_ACTIVATION' || sim.status === 'NOT_ACTIVATED') ? '#a16207'
                        : '#b91c1c',
                      flexShrink: 0,
                      cursor: (sim.status === 'PENDING_ACTIVATION' || sim.status === 'NOT_ACTIVATED') ? 'pointer' : 'default',
                    }}>
                      {sim.status === 'ACTIVE' ? t('my_sims.active')
                        : (sim.status === 'PENDING_ACTIVATION' || sim.status === 'NOT_ACTIVATED') ? t('my_sims.pending')
                        : t('my_sims.expired')}
                    </div>
                    {onDeleteSim && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmSimId(sim.id); }}
                        style={{
                          width: 26, height: 26, borderRadius: 8,
                          backgroundColor: '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: 'none', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <Trash2 size={13} color="#94a3b8" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* DATA USAGE CARD — Ring gauge for selected SIM */}
      <div className="px-4 mb-5">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">

              {/* Ring gauge with text in center */}
              <div className="flex justify-center pt-8 pb-2">
                  <div className="relative" style={{ width: 200, height: 200 }}>
                      <svg width={200} height={200} viewBox="0 0 200 200">
                          {Array.from({ length: totalSegs }).map((_, i) => {
                              const startAngle = (i / totalSegs) * 360 - 90;
                              const endAngle = startAngle + (fillArc / ringCircumference) * 360;
                              const startRad = (startAngle * Math.PI) / 180;
                              const endRad = (endAngle * Math.PI) / 180;
                              const x1 = 100 + ringRadius * Math.cos(startRad);
                              const y1 = 100 + ringRadius * Math.sin(startRad);
                              const x2 = 100 + ringRadius * Math.cos(endRad);
                              const y2 = 100 + ringRadius * Math.sin(endRad);

                              const isRemaining = i < remainingSegs;
                              let color = '#D1D5DB';
                              if (isRemaining) {
                                  const t = remainingSegs > 1 ? i / (remainingSegs - 1) : 0;
                                  if (t < 0.25) {
                                      color = lerpColor('#FBBF24', '#F97316', t / 0.25);
                                  } else if (t < 0.5) {
                                      color = lerpColor('#F97316', '#EF4444', (t - 0.25) / 0.25);
                                  } else if (t < 0.75) {
                                      color = lerpColor('#EF4444', '#EC4899', (t - 0.5) / 0.25);
                                  } else {
                                      color = lerpColor('#EC4899', '#A855F7', (t - 0.75) / 0.25);
                                  }
                              }

                              return (
                                  <path
                                      key={i}
                                      d={`M ${x1} ${y1} A ${ringRadius} ${ringRadius} 0 0 1 ${x2} ${y2}`}
                                      fill="none"
                                      stroke={color}
                                      strokeWidth={ringStroke}
                                      strokeLinecap="butt"
                                  />
                              );
                          })}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-slate-400 text-[12px] font-bold uppercase tracking-widest mb-1">{t('my_sims.remaining')}</p>
                          <span className="text-4xl font-bold text-slate-900 tracking-tight leading-none">
                              {dataRemaining % 1 === 0 ? dataRemaining.toFixed(0) : dataRemaining.toFixed(1)}
                          </span>
                          <span className="text-sm font-semibold text-slate-400 mt-0.5">
                              / {dataTotal % 1 === 0 ? dataTotal.toFixed(0) : dataTotal.toFixed(1)} GB
                          </span>
                      </div>
                  </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-center gap-5 pb-5">
                  <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-orange"></span>
                      <span className="text-sm font-semibold text-slate-500">
                          {dataUsed % 1 === 0 ? dataUsed.toFixed(0) : dataUsed.toFixed(1)} {t('my_sims.gb_used')}
                      </span>
                  </div>
                  <div className="w-px h-4 bg-slate-200"></div>
                  <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-brand-orange" />
                      <span className="text-sm font-semibold text-slate-500">
                          {new Date(currentSim.expiryDate).toLocaleDateString()}
                      </span>
                  </div>
              </div>

              {/* ICCID row */}
              <div 
                className="flex items-center justify-center gap-2 py-4 px-6 border-t border-slate-100 bg-slate-50/50 cursor-pointer hover:bg-slate-100/80 transition-colors active:opacity-70" 
                onClick={() => handleCopyIccid(currentSim)}
              >
                  <span className="text-slate-500 text-sm font-mono tracking-wide">ICCID: {resolveIccid(currentSim)}</span>
                  {copied ? <CheckCircle2 size={16} className="text-green-500 shrink-0" /> : <Copy size={14} className="text-slate-400 shrink-0" />}
              </div>

          </div>
      </div>
      {/* Low data warning banner */}
      {currentSim.status === 'ACTIVE' && percentUsed >= 80 && (
        <div className="px-4 mb-4">
          <button
            onClick={() => setIsRechargeModalOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 active:scale-[0.99] transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-amber-900">{t('my_sims.data_low_warning')}</p>
              <p className="text-[11px] text-amber-700/70">{t('my_sims.data_low_hint')}</p>
            </div>
            <span className="text-[11px] font-semibold text-white bg-brand-orange px-3 py-1.5 rounded-full shrink-0">
              {t('my_sims.top_up')}
            </span>
          </button>
        </div>
      )}

      {/* Action Grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
          <button 
             onClick={() => setIsRechargeModalOpen(true)}
             className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center gap-2 border border-slate-100 active:scale-[0.98] transition-all hover:border-brand-orange/30 group"
          >
              <img src="/icon-add-data.png" alt={t('my_sims.add_data')} loading="lazy" width={56} height={56} style={{ width: 56, height: 56 }} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-slate-700">{t('my_sims.add_data')}</span>
          </button>
          
          <button 
             onClick={() => onNavigate(Tab.DIALER)}
             className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center gap-2 border border-slate-100 active:scale-[0.98] transition-all hover:border-brand-orange/30 group"
          >
              <img src="/icon-contact-us.png" alt={t('my_sims.contact_us')} loading="lazy" width={56} height={56} style={{ width: 56, height: 56 }} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-slate-700">{t('my_sims.contact_us')}</span>
          </button>
      </div>
      {/* Details List */}
      <div className="px-4 pb-6 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t('my_sims.plan_details')}</h3>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <SignalHigh size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{t('my_sims.network_status')}</span>
                  </div>
                  <span className={`text-sm font-bold px-2 py-1 rounded-md ${currentSim.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {currentSim.status === 'ACTIVE' ? t('my_sims.active') : t('my_sims.inactive')}
                  </span>
              </div>

              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Smartphone size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{t('my_sims.plan_type')}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">{currentSim.plan.name}</span>
              </div>

              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Database size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Data Allowance</span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">{currentSim.dataTotalGB} GB</span>
              </div>

              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Calendar size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Validity</span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">{currentSim.plan.days} Days</span>
              </div>

              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Clock size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Expires</span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">{new Date(currentSim.expiryDate).toLocaleDateString()}</span>
              </div>

              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Globe size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Coverage</span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">{currentSim.country.name}</span>
              </div>

              {currentSim.type === 'ESIM' && (
                  <button 
                    onClick={() => setIsInstallModalOpen(true)}
                    className="w-full flex justify-between items-center pt-2 border-t border-slate-100 mt-2"
                  >
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                              <QrCode size={16} />
                          </div>
                          <span className="text-sm font-bold text-slate-900">{t('my_sims.install_esim')}</span>
                      </div>
                      <ChevronDown className="-rotate-90 text-slate-300" size={16} />
                  </button>
              )}
          </div>
      </div>
      
      {/* --- MODALS (Recharge, Share, Install) --- */}
      
      {isRechargeModalOpen && (() => {
          const carrierInfo = CARRIER_MAP[currentSim.country.countryCode] || { carrier: 'Carrier', network: '4G' };
          const iccid = resolveIccid(currentSim);

          const handleTopUpPurchase = async () => {
            if (!selectedTopUp) return;
            setTopUpProcessing(true);
            try {
              const iccid = resolveIccid(currentSim);

              // 优先使用后端 API
              try {
                const topupData: TopupRequest = {
                  packageCode: selectedTopUp.packageCode,
                  amount: selectedTopUp.price / 10000, // 转换回 USD
                };
                await esimService.topup(iccid, topupData);
              } catch (apiErr) {
                // 失败时使用 legacy API
                const txnId = `topup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                await topUp({
                  iccid,
                  packageCode: selectedTopUp.packageCode,
                  transactionId: txnId,
                  amount: selectedTopUp.price,
                });
              }

              const addedGB = selectedTopUp.volume / (1024 * 1024 * 1024);
              onUpdateSim?.(currentSim.id, {
                dataTotalGB: currentSim.dataTotalGB + addedGB,
                status: 'ACTIVE',
              });

              setTopUpSuccess(true);
              setTimeout(() => {
                setTopUpSuccess(false);
                setIsRechargeModalOpen(false);
                setSelectedTopUp(null);
                setTopUpPackages([]);
              }, 2000);
            } catch (err: any) {
              alert(err.message || 'Top-up failed');
            } finally {
              setTopUpProcessing(false);
            }
          };

          const filtered = topUpPackages.filter(pkg => !(pkg.durationUnit === 'DAY' && (pkg.duration === 1 || pkg.duration === 7 || pkg.duration === 15 || pkg.duration === 365)));

          const grouped = new Map<string, EsimPackage[]>();
          filtered.forEach(pkg => {
            const key = `${pkg.duration} ${pkg.durationUnit === 'DAY' ? (pkg.duration === 1 ? 'Day' : 'Days') : (pkg.duration === 1 ? 'Month' : 'Months')}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(pkg);
          });
          for (const [key, pkgs] of grouped) {
            const best = new Map<number, EsimPackage>();
            for (const pkg of pkgs) {
              const existing = best.get(pkg.volume);
              if (!existing || pkg.price < existing.price) {
                best.set(pkg.volume, pkg);
              }
            }
            const deduped = Array.from(best.values()).sort((a, b) => a.volume - b.volume);
            grouped.set(key, deduped);
          }
          const sections = Array.from(grouped.entries()).map(([label, pkgs]) => {
            const duration = pkgs[0]?.duration ?? 0;
            const bestCode = pkgs.length > 1
              ? pkgs.reduce((best, pkg) => {
                  const gbPrice = pkg.volume > 0 ? pkg.price / (pkg.volume / (1024 * 1024 * 1024)) : Infinity;
                  const bestGbPrice = best.volume > 0 ? best.price / (best.volume / (1024 * 1024 * 1024)) : Infinity;
                  return gbPrice < bestGbPrice ? pkg : best;
                }).packageCode
              : '';
            return { label, pkgs, bestCode, duration };
          }).sort((a, b) => a.duration - b.duration);

          const closeModal = () => { setIsRechargeModalOpen(false); setSelectedTopUp(null); setTopUpPackages([]); };

          return (
          <div className="fixed md:absolute inset-0 z-[60] bg-white flex flex-col" style={{ touchAction: 'pan-y' }}>
              {/* Header */}
              <div className="shrink-0 px-4 pt-safe">
                <div className="flex justify-between items-center py-3">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t('my_sims.top_up_data')}</h3>
                  <button onClick={closeModal} className="bg-gray-100 p-2 rounded-full text-slate-500 active:scale-95 transition-transform"><X size={18}/></button>
                </div>

                {/* Compact SIM info */}
                <div className="pb-3 border-b border-slate-100 flex items-center gap-3">
                  <FlagIcon countryCode={currentSim.country.countryCode} size="lg" />
                  <span className="text-lg font-bold text-slate-900 whitespace-nowrap">{currentSim.country.name}</span>
                  <div className="flex flex-col ml-auto items-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-500">{carrierInfo.carrier}</span>
                      <span className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1 py-0.5">{carrierInfo.network}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 cursor-pointer active:opacity-70" onClick={() => handleCopyIccid(currentSim)}>
                      <span className="text-[11px] font-mono text-slate-400">{iccid}</span>
                      {copied ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <Copy size={12} className="text-slate-300 shrink-0" />}
                    </div>
                  </div>
                </div>
              </div>

              {topUpSuccess ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 size={32} className="text-[#34C759]" />
                  </div>
                  <p className="font-bold text-slate-900">Top-up successful!</p>
                </div>
              ) : (
                <>
                  {/* All plans — scrollable with section headers */}
                  <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
                    {topUpLoading && (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-brand-orange" />
                      </div>
                    )}

                    {!topUpLoading && filtered.length === 0 && (
                      <p className="text-center text-slate-400 py-16 text-sm">No top-up plans available</p>
                    )}

                    {!topUpLoading && sections.map(({ label, pkgs, bestCode }, idx) => (
                      <div key={label} className={idx > 0 ? 'mt-6' : ''}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-brand-orange text-white text-sm font-bold px-3 py-1 rounded-lg">{label}</span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          {pkgs.map(pkg => {
                            const isSelected = selectedTopUp?.packageCode === pkg.packageCode;
                            const priceRetail = retailPrice(pkg.price);
                            const isBestValue = pkg.packageCode === bestCode;
                            return (
                              <button
                                key={pkg.packageCode}
                                onClick={() => setSelectedTopUp(pkg)}
                                className={`relative flex flex-col items-start px-3 py-2.5 rounded-xl transition-all ${isSelected ? 'border-2 border-brand-orange bg-orange-50/40' : 'border border-slate-200 bg-white active:border-brand-orange'}`}
                              >
                                {isBestValue && (
                                  <span className="absolute top-0 right-0 bg-brand-orange text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-bl-lg rounded-tr-xl">BEST</span>
                                )}
                                <span className="text-base font-bold text-slate-900 leading-tight">{formatVolume(pkg.volume)}</span>
                                <span className="text-[15px] font-bold text-brand-orange mt-1">${priceRetail.toFixed(2)}</span>
                                <span className="text-[9px] text-slate-300 mt-0.5 leading-tight truncate w-full">{pkg.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sticky purchase button */}
                  <div className="shrink-0 px-4 pb-6 pt-3 border-t border-slate-100 bg-white">
                    <button
                      onClick={selectedTopUp ? handleTopUpPurchase : closeModal}
                      disabled={topUpProcessing || !selectedTopUp}
                      className="w-full bg-brand-orange text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {topUpProcessing ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : selectedTopUp ? (
                        <>{t('my_sims.purchase_top_up')} — ${retailPrice(selectedTopUp.price).toFixed(2)}</>
                      ) : (
                        t('my_sims.purchase_top_up')
                      )}
                    </button>
                  </div>
                </>
              )}
          </div>
          );
      })()}


      {/* Delete Confirmation Modal */}
      {deleteConfirmSimId && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 200,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 32px',
          }}
          onClick={() => setDeleteConfirmSimId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 320,
              backgroundColor: '#fff', borderRadius: 20,
              padding: '28px 24px 20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Trash2 size={22} color="#64748b" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {t('my_sims.delete_sim')}
            </h3>
            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.5, marginBottom: 24 }}>
              {t('my_sims.delete_confirm')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteConfirmSimId(null)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  backgroundColor: '#f1f5f9', border: 'none',
                  fontSize: 15, fontWeight: 600, color: '#475569',
                  cursor: 'pointer',
                }}
              >
                {t('my_sims.cancel')}
              </button>
              <button
                onClick={() => {
                  onDeleteSim?.(deleteConfirmSimId);
                  setDeleteConfirmSimId(null);
                }}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 14,
                  backgroundColor: '#ef4444', border: 'none',
                  fontSize: 15, fontWeight: 600, color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {t('my_sims.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MySimsView;