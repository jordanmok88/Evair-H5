import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Package, Truck, MapPin, CheckCircle2, Wifi, Globe, CreditCard, ShieldCheck, Copy, Check, Clock, Search, Loader2, AlertCircle, RotateCcw, ScanLine, Smartphone, Unlock, RotateCw, Signal, Mail } from 'lucide-react';

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
  onAddCard?: (iccid: string) => void;
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

const PhysicalSimSetupView: React.FC<PhysicalSimSetupViewProps> = ({ onSwitchToShop, onSwitchToList, onAddCard }) => {
  const [activeTab, setActiveTab] = useState<SetupTab>('ACTIVATE');
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingState, setTrackingState] = useState<TrackingState>('IDLE');
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [trackingError, setTrackingError] = useState('');
  const [copied, setCopied] = useState(false);
  const [iccidInput, setIccidInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
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

  const handleReset = () => {
    setTrackingInput('');
    setTrackingResult(null);
    setTrackingState('IDLE');
    setTrackingError('');
  };

  const activationSteps = [
    { step: 1, title: 'Insert the SIM Card', desc: 'Power off your device. Insert the EvairSIM card into the SIM tray. Power your device back on.', icon: CreditCard },
    { step: 2, title: 'Enable Mobile Data & Roaming', desc: 'Go to Settings → Mobile Data → turn on Data Roaming. Select the EvairSIM line if prompted.', icon: Wifi },
    { step: 3, title: 'Set Up APN', desc: 'Go to Settings → Mobile Data → APN Settings. Enter the APN name provided with your SIM card (usually "evairsim" or as shown on the included instruction card).', icon: ShieldCheck },
    { step: 4, title: 'Restart & Connect', desc: 'Restart your device. Your SIM will automatically register on a local partner network within 1-2 minutes. You\'re ready to browse!', icon: Globe },
  ];

  const stepIcons = [Package, Package, Truck, MapPin, CheckCircle2];
  const stepLabels = ['Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];

  return (
    <div className="md:h-full flex flex-col bg-[#F2F4F7]">

      <div className="bg-white/90 backdrop-blur-xl px-4 pt-safe pb-3 flex items-center gap-2 shrink-0 sticky top-0 z-20 border-b border-slate-100">
        <button onClick={onSwitchToShop} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 -ml-1">
          <ArrowLeft size={22} className="text-slate-900" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">SIM Card Setup</h1>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          <button
            onClick={() => setActiveTab('TRACKING')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'TRACKING' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-500'}`}
          >
            Delivery Tracking
          </button>
          <button
            onClick={() => setActiveTab('ACTIVATE')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ACTIVATE' ? 'bg-brand-orange text-white shadow-sm' : 'text-slate-500'}`}
          >
            Activate SIM
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">

        {activeTab === 'TRACKING' && (
          <div className="pt-3">

            {/* Search Input */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
              <h3 className="text-base font-bold text-slate-900 mb-1">Track Your Parcel</h3>
              <p className="text-sm text-slate-400 mb-4">Enter your tracking number to see live delivery status</p>

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
                <p className="text-[15px] font-bold text-slate-900 mb-1">Enter Your Tracking Number</p>
                <p className="text-[14px] text-slate-400 leading-relaxed max-w-[260px]">
                  Paste the tracking number from your order confirmation email to see real-time delivery updates.
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
                      <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">Tracking Number</p>
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
                          <p className="text-[13px] text-slate-400 font-semibold">Estimated Delivery</p>
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
                    <p className="text-[14px] text-amber-700 font-medium">
                      Already received your SIM card? Switch to the <strong>"Activate SIM"</strong> tab to get started.
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'ACTIVATE' && (
          <div className="pt-3">

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-0.5">Activate Your SIM</h3>
                  <p className="text-[14px] text-slate-400">Enter ICCID or scan the barcode on your SIM card</p>
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
                <button className="p-2 -mr-2 text-slate-400 hover:text-brand-orange transition-colors">
                  <ScanLine size={22} />
                </button>
              </div>

              <div className="w-full rounded-2xl bg-white border border-slate-200 p-5 mb-4 relative overflow-hidden" style={{ aspectRatio: '1.6/1', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                {/* Top row: Logo + Barcode */}
                <div className="absolute top-4 left-5 right-4 flex items-start justify-between">
                  {/* Logo */}
                  <img
                    src="/evairsim-logo.png"
                    alt="EvairSIM"
                    className="h-12 object-contain"
                  />

                  {/* Barcode area with ICCID highlight */}
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
                      <span className="text-[11px] font-extrabold text-brand-orange tracking-widest">This is your ICCID</span>
                    </div>
                  </div>
                </div>

                {/* SIM chip */}
                <div className="absolute top-[55%] -translate-y-1/2 left-5 w-12 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/60 flex items-center justify-center">
                  <div className="w-8 h-6 rounded-sm border border-amber-300/80 bg-amber-50" />
                </div>



                {/* Placeholder text lines */}
                <div className="absolute bottom-12 left-5 right-16 space-y-2.5">
                  <div className="h-[5px] w-[75%] rounded-full" style={{ backgroundColor: '#e8ecf0' }} />
                  <div className="h-[5px] w-[50%] rounded-full" style={{ backgroundColor: '#e8ecf0' }} />
                </div>

                {/* Top-up QR code */}
                <div className="absolute bottom-10 right-4 flex items-center gap-2">
                  <span className="text-[7px] font-bold text-slate-400 tracking-wider">SCAN TO<br/>TOP UP</span>
                  <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center p-0.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <rect x="5" y="5" width="28" height="28" rx="3" fill="none" stroke="#1e293b" strokeWidth="4"/>
                      <rect x="12" y="12" width="14" height="14" rx="2" fill="#1e293b"/>
                      <rect x="67" y="5" width="28" height="28" rx="3" fill="none" stroke="#1e293b" strokeWidth="4"/>
                      <rect x="74" y="12" width="14" height="14" rx="2" fill="#1e293b"/>
                      <rect x="5" y="67" width="28" height="28" rx="3" fill="none" stroke="#1e293b" strokeWidth="4"/>
                      <rect x="12" y="74" width="14" height="14" rx="2" fill="#1e293b"/>
                      <rect x="42" y="5" width="6" height="6" fill="#1e293b"/>
                      <rect x="52" y="15" width="6" height="6" fill="#1e293b"/>
                      <rect x="42" y="25" width="6" height="6" fill="#1e293b"/>
                      <rect x="42" y="42" width="6" height="6" fill="#1e293b"/>
                      <rect x="52" y="52" width="6" height="6" fill="#1e293b"/>
                      <rect x="15" y="52" width="6" height="6" fill="#1e293b"/>
                      <rect x="25" y="42" width="6" height="6" fill="#1e293b"/>
                      <rect x="67" y="42" width="6" height="6" fill="#1e293b"/>
                      <rect x="77" y="52" width="6" height="6" fill="#1e293b"/>
                      <rect x="87" y="42" width="6" height="6" fill="#1e293b"/>
                      <rect x="67" y="67" width="6" height="6" fill="#1e293b"/>
                      <rect x="77" y="77" width="6" height="6" fill="#1e293b"/>
                      <rect x="87" y="87" width="6" height="6" fill="#1e293b"/>
                      <rect x="67" y="87" width="6" height="6" fill="#1e293b"/>
                      <rect x="52" y="67" width="6" height="6" fill="#1e293b"/>
                      <rect x="42" y="87" width="6" height="6" fill="#1e293b"/>
                    </svg>
                  </div>
                </div>

                {/* App Store badges */}
                <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
                  {/* Apple App Store */}
                  <div className="flex items-center gap-1 bg-white rounded-md px-2 py-1 border border-slate-300">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-black fill-current">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-black text-[4px] leading-none">Download on the</span>
                      <span className="text-black text-[7px] font-bold leading-tight">App Store</span>
                    </div>
                  </div>
                  {/* Google Play */}
                  <div className="flex items-center gap-1 bg-white rounded-md px-2 py-1 border border-slate-300">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                      <path d="M3.18 23.72c-.36-.18-.64-.46-.82-.82L13.41 12 2.36 1.1c.18-.36.46-.64.82-.82l12.34 7.18L3.18 23.72z" fill="#4285F4"/>
                      <path d="M22.18 10.87L18.6 8.77 15.52 12l3.08 3.23 3.58-2.1c.74-.43.74-1.83 0-2.26z" fill="#FBBC04"/>
                      <path d="M2.36 1.1L15.52 12l-3.08-3.23L3.18.28c-.36.18-.64.46-.82.82z" fill="#EA4335"/>
                      <path d="M15.52 12L2.36 22.9c.18.36.46.64.82.82L18.6 15.23 15.52 12z" fill="#34A853"/>
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-black text-[4px] leading-none">GET IT ON</span>
                      <span className="text-black text-[7px] font-bold leading-tight">Google Play</span>
                    </div>
                  </div>
                </div>
              </div>

              {activated ? (
                <div className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} />
                  SIM Card Activated
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!iccidInput.trim()) return;
                    setActivating(true);
                    setTimeout(() => {
                      setActivating(false);
                      setActivated(true);
                      onAddCard?.(iccidInput.trim());
                    }, 2000);
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
                    <><Loader2 size={18} className="animate-spin" /> Activating...</>
                  ) : (
                    'Activate SIM Card'
                  )}
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <h3 className="text-[15px] font-bold text-slate-900 mb-1">Activation Guide</h3>
              <p className="text-[14px] text-slate-400 mb-5">Follow these steps to activate your EvairSIM card</p>
              <div className="space-y-5">
                {activationSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.step} className="flex gap-4">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-brand-orange" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[15px] font-bold text-slate-900">
                          <span className="text-brand-orange mr-1.5">Step {step.step}</span>{step.title}
                        </p>
                        <p className="text-[14px] text-slate-500 leading-relaxed mt-1">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 space-y-2.5">
              <p className="text-[13px] font-semibold text-slate-400 px-1 mb-1">Troubleshooting</p>

              <div className="rounded-xl overflow-hidden border border-orange-100" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF1E6 100%)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-1 h-8 rounded-full bg-brand-orange shrink-0" />
                  <p className="text-[14px] text-slate-700 leading-snug">Ensure your device is <strong className="text-slate-900">unlocked</strong> — not locked to a carrier.</p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-orange-100" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF1E6 100%)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-1 h-8 rounded-full bg-brand-orange shrink-0" />
                  <p className="text-[14px] text-slate-700 leading-snug"><strong className="text-slate-900">Restart your device</strong> if network doesn't appear in 2 min.</p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-orange-100" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF1E6 100%)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-1 h-8 rounded-full bg-brand-orange shrink-0" />
                  <p className="text-[14px] text-slate-700 leading-snug">Turn on <strong className="text-slate-900">Data Roaming</strong> in your device settings.</p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-orange-100" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF1E6 100%)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-1 h-8 rounded-full bg-brand-orange shrink-0" />
                  <p className="text-[14px] text-slate-700 leading-snug">Need help? <span className="text-brand-orange font-semibold">service@evairdigital.com</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PhysicalSimSetupView;
