import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CheckCircle2,
  Wifi,
  Globe,
  CreditCard,
  ShieldCheck,
  Check,
  Search,
  Loader2,
  AlertCircle,
  ScanLine,
  Smartphone,
  UserPlus,
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import { queryProfile } from '../services/dataService';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { EsimProfileResult } from '../types';

/**
 * Physical SIM set-up wizard.
 *
 * As of 2026-04 we stopped selling / shipping physical SIMs directly
 * — customers purchase from our Amazon storefront and Amazon FBA
 * handles the logistics end-to-end (storage, shipping, tracking,
 * returns). This screen therefore no longer carries the old TRACKING
 * tab and its carrier-status timeline; the only remaining flow is
 * ACTIVATE, which lets a customer scan the ICCID off the SIM they
 * just received and bind it to their EvairSIM account.
 *
 * The `initialTab` and `trackingNumber` props on this component were
 * only relevant to the removed tab and have been dropped from the
 * public interface. If a caller links here with a tracking number
 * in state, it's safely ignored.
 */

type ActivateStep = 'SCAN' | 'CONFIRM' | 'DONE';

interface PhysicalSimSetupViewProps {
  onSwitchToShop: () => void;
  onSwitchToList: () => void;
  onAddCard?: (iccid: string, profile?: EsimProfileResult) => void;
  isLoggedIn?: boolean;
  onLoginRequest?: () => void;
}

const PhysicalSimSetupView: React.FC<PhysicalSimSetupViewProps> = ({
  onSwitchToShop,
  onSwitchToList,
  onAddCard,
  isLoggedIn,
  onLoginRequest,
}) => {
  useEdgeSwipeBack(onSwitchToShop);
  const [iccidInput, setIccidInput] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activateStep, setActivateStep] = useState<ActivateStep>('SCAN');
  const [profileResult, setProfileResult] = useState<EsimProfileResult | null>(null);
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState('');
  const { t } = useTranslation();

  const activationSteps = [
    { step: 1, title: t('sim_setup.step_insert_title'), desc: t('sim_setup.step_insert_desc'), icon: CreditCard },
    { step: 2, title: t('sim_setup.step_settings_title'), desc: t('sim_setup.step_settings_desc'), icon: Wifi },
    { step: 3, title: t('sim_setup.step_apn_title'), desc: t('sim_setup.step_apn_desc'), icon: ShieldCheck },
    { step: 4, title: t('sim_setup.step_connect_title'), desc: t('sim_setup.step_connect_desc'), icon: Globe },
  ];

  return (
    <div className="lg:h-full flex flex-col bg-[#F2F4F7]">

      <div className="bg-white/90 backdrop-blur-xl px-4 pt-safe pb-3 flex items-center gap-2 shrink-0 sticky top-0 z-20 border-b border-slate-100">
        <button onClick={onSwitchToShop} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 -ml-1">
          <ArrowLeft size={22} className="text-slate-900" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{t('sim_setup.add_sim_card')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">

        <div className="pt-4">

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

              {/* SIM card illustration — stretch to edges */}
              <div className="-mx-5 mb-4">
                <img src="/evairsim-card-back.png" alt="SIM Card Back" className="w-full" />
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
                  onClick={async () => {
                    if (!isLoggedIn) {
                      onLoginRequest?.();
                      return;
                    }
                    setBinding(true);
                    setBindError('');
                    try {
                      if (!profileResult?.iccid) {
                        throw new Error('ICCID not found. Please scan again.');
                      }
                      await onAddCard?.(profileResult.iccid, profileResult);
                      setActivateStep('DONE');
                    } catch (err: any) {
                      setBindError(err?.message || 'Failed to bind SIM. Please try again.');
                    } finally {
                      setBinding(false);
                    }
                  }}
                  disabled={binding}
                  className="w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 text-white active:scale-[0.98] transition-all disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)', boxShadow: binding ? 'none' : '0 4px 14px rgba(255,102,0,0.25)' }}
                >
                  {binding ? (
                    <><Loader2 size={16} className="animate-spin" /> {t('sim_setup.binding')}</>
                  ) : (
                    <><UserPlus size={16} /> {isLoggedIn ? t('sim_setup.bind_to_account') : t('sim_setup.sign_in_to_bind')}</>
                  )}
                </button>
                {bindError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{bindError}</p>
                  </div>
                )}
                <button
                  onClick={() => { setActivateStep('SCAN'); setProfileResult(null); setActivationError(''); setBindError(''); }}
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
