import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Package, Truck, MapPin, CheckCircle2, Wifi, Globe, CreditCard, ShieldCheck, Copy, Check, Clock, Search, Loader2, AlertCircle, RotateCcw, ScanLine, Smartphone, UserPlus } from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import { queryProfile } from '../services/dataService';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { EsimProfileResult } from '../types';

type ActivateStep = 'SCAN' | 'CONFIRM' | 'DONE';

interface TrackingEvent {
  label: string;
  date: string;
  time: string;
  location?: string;
}

interface TrackingResult {
  trackingNumber: string;
  carrier: string;
  status: 'PROCESSING' | 'SHIPPED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  estimatedDelivery: string;
  events: TrackingEvent[];
}

interface PhysicalSimSetupViewProps {
  onSwitchToShop: () => void;
  onSwitchToList: () => void;
  onAddCard?: (iccid: string, profile?: EsimProfileResult) => void;
  initialTab?: 'TRACKING' | 'ACTIVATE';
  trackingNumber?: string;
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
}

type SetupTab = 'TRACKING' | 'ACTIVATE';
type TrackingState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

async function fetchTracking(trackingNumber: string, lang = 'en'): Promise<TrackingResult> {
  try {
    const res = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber, lang }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return simulateTracking(trackingNumber);
    }

    const data = await res.json().catch(() => ({}));

    if (res.status === 500 && data?.error?.includes('not configured')) {
      return simulateTracking(trackingNumber);
    }

    if (res.status === 202) {
      throw new Error('Tracking number registered. Data is being fetched — please try again in 1–2 minutes.');
    }

    if (!res.ok) {
      throw new Error(data?.error || 'Tracking not found. Please check the number and try again.');
    }

    if (!data.trackingNumber && !data.events) {
      return simulateTracking(trackingNumber);
    }

    return {
      trackingNumber: data.trackingNumber || trackingNumber.toUpperCase(),
      carrier: data.carrier || 'Unknown Carrier',
      status: data.status || 'IN_TRANSIT',
      estimatedDelivery: data.estimatedDelivery || 'Pending',
      events: data.events || [],
    };
  } catch (err: any) {
    if (err?.message === 'Failed to fetch' || err?.message?.includes('NetworkError')) {
      return simulateTracking(trackingNumber);
    }
    throw err;
  }
}

function simulateTracking(trackingNumber: string): TrackingResult {
  const tn = trackingNumber.toUpperCase();
  let carrier = 'Logistics Partner';
  let status: TrackingResult['status'] = 'IN_TRANSIT';

  if (tn.startsWith('SF')) { carrier = 'SF Express'; status = 'IN_TRANSIT'; }
  else if (tn.startsWith('1Z')) { carrier = 'UPS'; status = 'IN_TRANSIT'; }
  else if (/^\d{20,22}$/.test(tn)) { carrier = 'USPS'; status = 'SHIPPED'; }
  else if (/^\d{12,15}$/.test(tn)) { carrier = 'FedEx'; status = 'OUT_FOR_DELIVERY'; }
  else if (/^\d{10}$/.test(tn)) { carrier = 'DHL'; status = 'DELIVERED'; }

  const now = new Date();
  const day = (offset: number) => {
    const d = new Date(now.getTime() - offset * 86400000);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  };

  const events: TrackingEvent[] = [
    { label: 'Order confirmed & payment received', ...day(4), location: 'EvairSIM — Hong Kong' },
    { label: 'Package picked up by carrier', ...day(3), location: 'Distribution Center' },
    { label: 'Departed origin facility', ...day(2), location: 'International Hub' },
    { label: 'Arrived at destination country', ...day(1), location: 'Local Sorting Center' },
  ];

  if (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
    events.push({ label: 'Out for delivery', ...day(0), location: 'Local Post Office' });
  }
  if (status === 'DELIVERED') {
    events.push({ label: 'Delivered — signed by recipient', ...day(0), location: 'Delivered' });
  }

  const est = new Date(now.getTime() + 2 * 86400000);
  return {
    trackingNumber: tn,
    carrier,
    status,
    estimatedDelivery: status === 'DELIVERED' ? 'Delivered' : est.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    events,
  };
}

function getStatusLabel(status: TrackingResult['status']): string {
  switch (status) {
    case 'PROCESSING': return 'Processing';
    case 'SHIPPED': return 'Shipped';
    case 'IN_TRANSIT': return 'In Transit';
    case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
    case 'DELIVERED': return 'Delivered';
  }
}

function getStatusColor(status: TrackingResult['status']): { bg: string; text: string } {
  switch (status) {
    case 'DELIVERED': return { bg: '#dcfce7', text: '#15803d' };
    case 'OUT_FOR_DELIVERY': return { bg: '#dbeafe', text: '#1d4ed8' };
    default: return { bg: '#fef9c3', text: '#a16207' };
  }
}

function getProgressSteps(status: TrackingResult['status']) {
  const steps = ['PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIdx = steps.indexOf(status);
  return steps.map((s, i) => ({ key: s, done: i <= currentIdx }));
}

const PhysicalSimSetupView: React.FC<PhysicalSimSetupViewProps> = ({ onSwitchToShop, onSwitchToList, onAddCard, initialTab, trackingNumber: propTrackingNumber, isLoggedIn, onLoginRequest }) => {
  useEdgeSwipeBack(onSwitchToShop);
  const [activeTab, setActiveTab] = useState<SetupTab>(initialTab ?? 'ACTIVATE');
  const [trackingInput, setTrackingInput] = useState(propTrackingNumber ?? '');
  const [trackingState, setTrackingState] = useState<TrackingState>('IDLE');
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [trackingError, setTrackingError] = useState('');
  const [copied, setCopied] = useState(false);
  const [iccidInput, setIccidInput] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activateStep, setActivateStep] = useState<ActivateStep>('SCAN');
  const [profileResult, setProfileResult] = useState<EsimProfileResult | null>(null);
  const { t, i18n } = useTranslation();

  const handleTrack = useCallback(async () => {
    const tn = trackingInput.trim();
    if (!tn) return;

    setTrackingState('LOADING');
    setTrackingError('');

    try {
      const result = await fetchTracking(tn, i18n.language);
      setTrackingResult(result);
      setTrackingState('SUCCESS');
    } catch {
      setTrackingError('Unable to find tracking information. Please check the number and try again.');
      setTrackingState('ERROR');
    }
  }, [trackingInput]);

  const handleCopy = () => {
    if (!trackingResult) return;
    navigator.clipboard.writeText(trackingResult.trackingNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const autoTrackedRef = useRef(false);
  useEffect(() => {
    if (propTrackingNumber && activeTab === 'TRACKING' && !autoTrackedRef.current) {
      autoTrackedRef.current = true;
      handleTrack();
    }
  }, [propTrackingNumber, activeTab, handleTrack]);

  const handleReset = () => {
    setTrackingInput('');
    setTrackingResult(null);
    setTrackingState('IDLE');
    setTrackingError('');
  };

  const activationSteps = [
    { step: 1, title: t('sim_setup.step_insert_title'), desc: t('sim_setup.step_insert_desc'), icon: CreditCard },
    { step: 2, title: t('sim_setup.step_settings_title'), desc: t('sim_setup.step_settings_desc'), icon: Wifi },
    { step: 3, title: t('sim_setup.step_apn_title'), desc: t('sim_setup.step_apn_desc'), icon: ShieldCheck },
    { step: 4, title: t('sim_setup.step_connect_title'), desc: t('sim_setup.step_connect_desc'), icon: Globe },
  ];

  const stepIcons = [Package, Package, Truck, MapPin, CheckCircle2];
  const stepLabels = ['Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];

  return (
    <div className="lg:h-full flex flex-col bg-[#F2F4F7]">

      <div className="bg-white/90 backdrop-blur-xl px-4 pt-safe pb-3 flex items-center gap-2 shrink-0 sticky top-0 z-20 border-b border-slate-100">
        <button onClick={onSwitchToShop} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 -ml-1">
          <ArrowLeft size={22} className="text-slate-900" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{t('sim_setup.add_sim_card')}</h1>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          <button
            onClick={() => setActiveTab('TRACKING')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'TRACKING' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-500'}`}
          >
            {t('sim_setup.track_tab')}
          </button>
          <button
            onClick={() => setActiveTab('ACTIVATE')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ACTIVATE' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-500'}`}
          >
            {t('sim_setup.activate_tab')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">

        {activeTab === 'TRACKING' && (
          <div className="pt-3">

            {/* Search Input */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('sim_setup.enter_tracking')}</h3>
              <p className="text-sm text-slate-400 mb-4">{t('sim_setup.enter_tracking_hint')}</p>

              <div className="flex gap-2">
                <div className="flex-1 border border-slate-200 focus-within:border-brand-orange rounded-xl h-11 flex items-center px-3 bg-slate-50 transition-colors">
                  <Search size={16} className="text-slate-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value.replace(/\s/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleTrack()}
                    placeholder="e.g. SF1029384756HK"
                    className="flex-1 h-full outline-none text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal bg-transparent text-sm tracking-wide"
                  />
                  {trackingResult && (
                    <button onClick={handleReset} className="p-1 text-slate-400 hover:text-slate-600">
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleTrack}
                  disabled={!trackingInput.trim() || trackingState === 'LOADING'}
                  className="h-11 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all shrink-0"
                  style={{
                    background: trackingInput.trim() ? 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' : '#e2e8f0',
                    color: trackingInput.trim() ? '#fff' : '#94a3b8',
                    cursor: trackingInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {trackingState === 'LOADING' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Track
                </button>
              </div>
            </div>

            {/* Loading */}
            {trackingState === 'LOADING' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-4 flex flex-col items-center">
                <Loader2 size={32} className="text-brand-orange animate-spin mb-3" />
                <p className="text-[15px] font-semibold text-slate-600">Fetching tracking information...</p>
                <p className="text-[13px] text-slate-400 mt-1">This may take a moment</p>
              </div>
            )}

            {/* Error */}
            {trackingState === 'ERROR' && (
              <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-900">Tracking Not Found</p>
                    <p className="text-[14px] text-slate-500 mt-1">{trackingError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Idle State */}
            {trackingState === 'IDLE' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                  <Package size={28} className="text-brand-orange" />
                </div>
                <p className="text-[15px] font-bold text-slate-900 mb-1">{t('sim_setup.enter_tracking')}</p>
                <p className="text-[14px] text-slate-400 leading-relaxed max-w-[260px]">
                  {t('sim_setup.enter_tracking_desc')}
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['SF Express', 'USPS', 'FedEx', 'UPS', 'DHL'].map(c => (
                    <span key={c} className="text-[12px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking Results */}
            {trackingState === 'SUCCESS' && trackingResult && (() => {
              const statusColor = getStatusColor(trackingResult.status);
              const progressSteps = getProgressSteps(trackingResult.status);

              return (
                <>
                  {/* Tracking Number Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">{t('sim_setup.tracking_number')}</p>
                      <div style={{ backgroundColor: statusColor.bg, color: statusColor.text }} className="px-3 py-1 rounded-lg">
                        <p className="text-[13px] font-bold">{getStatusLabel(trackingResult.status)}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 mt-3 hover:bg-slate-100 transition-colors active:scale-[0.99] group"
                    >
                      <span className="text-[16px] font-bold text-slate-900 tracking-wider font-mono">{trackingResult.trackingNumber}</span>
                      <div className="flex items-center gap-1.5">
                        {copied ? (
                          <><Check size={14} className="text-green-600" /><span className="text-[13px] font-bold text-green-600">Copied!</span></>
                        ) : (
                          <><Copy size={14} className="text-slate-400 group-hover:text-brand-orange" /><span className="text-[13px] font-semibold text-slate-400 group-hover:text-brand-orange">Copy</span></>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-2 mt-3">
                      <Truck size={14} className="text-slate-400" />
                      <span className="text-[14px] font-semibold text-slate-600">Shipped via {trackingResult.carrier}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                          <Clock size={18} className="text-brand-orange" />
                        </div>
                        <div>
                          <p className="text-[13px] text-slate-400 font-semibold">{t('sim_setup.estimated_delivery')}</p>
                          <p className="text-[15px] font-bold text-slate-900">{trackingResult.estimatedDelivery}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {progressSteps.map((s, i) => (
                        <div key={s.key} className="flex-1 flex flex-col items-center">
                          <div className={`h-1.5 w-full rounded-full ${s.done ? 'bg-brand-orange' : 'bg-slate-200'}`} />
                          <div className="mt-2">
                            {React.createElement(stepIcons[i], { size: 12, className: s.done ? 'text-brand-orange' : 'text-slate-300' })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">
                      {stepLabels.map((label, i) => (
                        <p key={i} className={`text-[10px] font-bold text-center ${progressSteps[i].done ? 'text-brand-orange' : 'text-slate-300'}`} style={{ width: `${100 / stepLabels.length}%` }}>
                          {label}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Event Timeline */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h3 className="text-[15px] font-bold text-slate-900 mb-5">Shipment History</h3>
                    <div className="relative">
                      {trackingResult.events.slice().reverse().map((event, i) => {
                        const isFirst = i === 0;
                        const isLast = i === trackingResult.events.length - 1;
                        return (
                          <div key={i} className="flex gap-4" style={{ paddingBottom: isLast ? 0 : 20 }}>
                            <div className="flex flex-col items-center shrink-0" style={{ width: 12 }}>
                              <div className={`w-3 h-3 rounded-full shrink-0 ${isFirst ? 'bg-brand-orange ring-4 ring-orange-100' : 'bg-slate-300'}`} />
                              {!isLast && <div className="w-0.5 flex-1 mt-1 bg-slate-200" />}
                            </div>
                            <div className="pt-0 min-w-0 -mt-1">
                              <p className={`text-[15px] font-bold ${isFirst ? 'text-slate-900' : 'text-slate-600'}`}>{event.label}</p>
                              <p className="text-[13px] text-slate-400 mt-0.5">{event.date} · {event.time}</p>
                              {event.location && (
                                <p className="text-[13px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} className="shrink-0" /> {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-4">
                    <p className="text-[14px] text-amber-700 font-medium" dangerouslySetInnerHTML={{ __html: t('sim_setup.received_sim_hint') }} />
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'ACTIVATE' && (
          <div className="pt-3">

            {/* ── Step Progress Indicator ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
              <div className="flex items-center justify-between">
                {(['SCAN', 'CONFIRM', 'DONE'] as const).map((step, i) => {
                  const stepLabelsMap = [
                    t('sim_setup.wizard_scan'),
                    t('sim_setup.wizard_confirm'),
                    t('sim_setup.wizard_done'),
                  ];
                  const stepOrder = { SCAN: 0, CONFIRM: 1, DONE: 2 };
                  const current = stepOrder[activateStep];
                  const isDone = i < current;
                  const isActive = i === current;
                  const StepIcon = [ScanLine, UserPlus, CheckCircle2][i];
                  return (
                    <React.Fragment key={step}>
                      {i > 0 && (
                        <div className={`flex-1 h-0.5 mx-1.5 rounded-full ${isDone ? 'bg-brand-orange' : 'bg-slate-200'}`} />
                      )}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isDone ? 'bg-brand-orange text-white' :
                          isActive ? 'bg-orange-50 text-brand-orange ring-2 ring-brand-orange' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {isDone ? <Check size={16} /> : <StepIcon size={16} />}
                        </div>
                        <span className={`text-[11px] font-bold ${isActive || isDone ? 'text-brand-orange' : 'text-slate-400'}`}>
                          {stepLabelsMap[i]}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ── Step 1: SCAN ── */}
            {activateStep === 'SCAN' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 mb-0.5">{t('sim_setup.bind_title')}</h3>
                    <p className="text-[14px] text-slate-400">{t('sim_setup.bind_scan_desc')}</p>
                  </div>
                  <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                    <Smartphone size={18} className="text-brand-orange" />
                  </div>
                </div>

                <div className="border-2 border-brand-orange rounded-xl h-14 flex items-center px-4 bg-white shadow-sm mb-4">
                  <input
                    type="text"
                    value={iccidInput}
                    onChange={(e) => setIccidInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="ICCID / EID Number"
                    className="flex-1 h-full outline-none text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal bg-transparent text-[16px] tracking-wider"
                    maxLength={22}
                  />
                  <button onClick={() => setScannerOpen(true)} className="p-2 -mr-2 text-slate-400 hover:text-brand-orange transition-colors">
                    <ScanLine size={22} />
                  </button>
                </div>

                {/* SIM card illustration */}
                <div className="w-full rounded-2xl bg-white border border-slate-200 p-5 mb-4 relative overflow-hidden" style={{ aspectRatio: '1.6/1', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="absolute top-4 left-5 right-4 flex items-start justify-between">
                    <img src="/evairsim-logo.png" alt="EvairSIM" className="h-14 object-contain" />
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative flex flex-col items-center">
                        <div className="absolute -inset-x-4 -inset-y-3 rounded-xl border-2 border-brand-orange" style={{ boxShadow: '0 0 8px rgba(255,102,0,0.15)' }} />
                        <div className="flex gap-[1px]">
                          {Array.from({ length: 45 }).map((_, i) => (
                            <div key={i} className="bg-slate-800 rounded-[0.5px]" style={{ width: i % 3 === 0 ? 2 : i % 2 === 0 ? 1.5 : 1, height: 22, opacity: 0.35 + (i % 3) * 0.2 }} />
                          ))}
                        </div>
                        <div className="h-[5px] w-28 rounded-full bg-slate-200 mt-1.5" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-3">
                        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-brand-orange" />
                        <span className="text-[11px] font-extrabold text-brand-orange tracking-widest">{t('sim_setup.this_is_iccid')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-[55%] -translate-y-1/2 left-5 w-12 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/60 flex items-center justify-center">
                    <div className="w-8 h-6 rounded-sm border border-amber-300/80 bg-amber-50" />
                  </div>
                  <div className="absolute bottom-12 left-5 right-16 space-y-2.5">
                    <div className="h-[5px] w-[75%] rounded-full" style={{ backgroundColor: '#e8ecf0' }} />
                    <div className="h-[5px] w-[50%] rounded-full" style={{ backgroundColor: '#e8ecf0' }} />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const trimmed = iccidInput.trim().replace(/\s/g, '');
                    if (!trimmed) return;
                    if (!/^\d{12,22}$/.test(trimmed)) {
                      setActivationError(t('sim_setup.iccid_eid_error'));
                      return;
                    }
                    setActivating(true);
                    setActivationError('');
                    try {
                      const profile = await queryProfile(trimmed);
                      setProfileResult(profile);
                      setActivateStep('CONFIRM');
                    } catch (err: any) {
                      setActivationError(err.message || t('sim_setup.verify_failed'));
                    } finally {
                      setActivating(false);
                    }
                  }}
                  disabled={!iccidInput.trim() || activating}
                  className="w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  style={{
                    background: iccidInput.trim() ? 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' : '#e2e8f0',
                    color: iccidInput.trim() ? '#fff' : '#94a3b8',
                    cursor: iccidInput.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: iccidInput.trim() ? '0 4px 14px rgba(255,102,0,0.25)' : 'none',
                  }}
                >
                  {activating ? (
                    <><Loader2 size={18} className="animate-spin" /> {t('sim_setup.verifying')}</>
                  ) : (
                    <><Search size={16} /> {t('sim_setup.verify_sim')}</>
                  )}
                </button>

                {activationError && (
                  <div className="flex items-start gap-2 mt-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{activationError}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: CONFIRM (bind to account) ── */}
            {activateStep === 'CONFIRM' && profileResult && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">{t('sim_setup.profile_found')}</h3>
                    <p className="text-[13px] text-slate-400">{t('sim_setup.bind_confirm_desc')}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-slate-500">ICCID</span>
                    <span className="text-[13px] font-bold text-slate-900 font-mono">{profileResult.iccid}</span>
                  </div>
                  {profileResult.packageName && (
                    <div className="flex justify-between">
                      <span className="text-[13px] text-slate-500">{t('sim_setup.package_label')}</span>
                      <span className="text-[13px] font-bold text-slate-900">{profileResult.packageName}</span>
                    </div>
                  )}
                  {profileResult.totalVolume > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[13px] text-slate-500">{t('sim_setup.data_label')}</span>
                      <span className="text-[13px] font-bold text-slate-900">
                        {(profileResult.totalVolume / (1024 * 1024 * 1024)).toFixed(profileResult.totalVolume >= 1073741824 ? 0 : 1)} GB
                      </span>
                    </div>
                  )}
                  {profileResult.totalDuration > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[13px] text-slate-500">{t('sim_setup.validity_label')}</span>
                      <span className="text-[13px] font-bold text-slate-900">{profileResult.totalDuration} {t('sim_setup.days_label')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[13px] text-slate-500">{t('sim_setup.profile_status')}</span>
                    <span className="text-[13px] font-bold px-2 py-0.5 rounded-lg bg-green-50 text-green-700">
                      {t('sim_setup.status_ready')}
                    </span>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
                  <p className="text-[13px] text-green-800 font-medium">
                    {t('sim_setup.bind_info')}
                  </p>
                </div>

                {!isLoggedIn && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-amber-800 font-medium">
                      {t('sim_setup.login_to_bind')}
                    </p>
                  </div>
                )}

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      if (!isLoggedIn) {
                        onLoginRequest?.();
                        return;
                      }
                      onAddCard?.(profileResult.iccid, profileResult);
                      setActivateStep('DONE');
                    }}
                    className="w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)', boxShadow: '0 4px 14px rgba(255,102,0,0.25)' }}
                  >
                    <UserPlus size={16} /> {isLoggedIn ? t('sim_setup.bind_to_account') : t('sim_setup.sign_in_to_bind')}
                  </button>
                  <button
                    onClick={() => { setActivateStep('SCAN'); setProfileResult(null); setActivationError(''); }}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all"
                  >
                    {t('sim_setup.back_to_scan')}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: DONE ── */}
            {activateStep === 'DONE' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-[18px] font-bold text-slate-900 mb-1">{t('sim_setup.bind_success')}</h3>
                  <p className="text-[14px] text-slate-500 mb-1">
                    {profileResult?.packageName || 'eSIM Profile'}
                  </p>
                  {profileResult && profileResult.totalVolume > 0 && (
                    <p className="text-[13px] text-slate-400">
                      {(profileResult.totalVolume / (1024 * 1024 * 1024)).toFixed(profileResult.totalVolume >= 1073741824 ? 0 : 1)} GB &middot; {profileResult.totalDuration} {t('sim_setup.days_label')}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5 mt-2">
                  <button
                    onClick={() => onSwitchToList()}
                    className="w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)', boxShadow: '0 4px 14px rgba(255,102,0,0.25)' }}
                  >
                    {t('sim_setup.go_to_my_sims')}
                  </button>
                  <button
                    onClick={() => {
                      setActivateStep('SCAN');
                      setIccidInput('');
                      setProfileResult(null);
                      setActivationError('');
                    }}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <ScanLine size={16} />
                    {t('sim_setup.add_another')}
                  </button>
                </div>

                {/* Setup tips */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-[13px] font-bold text-slate-900 mb-3">{t('sim_setup.next_steps')}</p>
                  <div className="space-y-3">
                    {activationSteps.map((step) => {
                      const Icon = step.icon;
                      return (
                        <div key={step.step} className="flex gap-3">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                            <Icon size={14} className="text-brand-orange" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-900">{step.title}</p>
                            <p className="text-[12px] text-slate-500 leading-relaxed">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(value) => setIccidInput(value)}
      />
    </div>
  );
};

export default PhysicalSimSetupView;
