import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ArrowLeft, Link2, Loader2, QrCode } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';
import { authService } from '../services/api/auth';
import {
  activationService,
  type ActivationPreviewData,
} from '../services/api/activation';

/** QR-only — stable reference so `BarcodeScanner` effect does not thrash. */
export const ESIM_LINK_SCAN_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.QR_CODE,
];

function normaliseIccidInput(raw: string): string | null {
  const cleaned = raw.replace(/[^0-9A-Za-z]/g, '');
  if (cleaned.length < 15 || cleaned.length > 22) return null;
  return cleaned;
}

function formatPlanLine(data: ActivationPreviewData, t: (k: string) => string): string {
  const pkg = data.package;
  if (!pkg) return t('my_sims.link_esim_plan_fallback');
  if (pkg.name?.trim()) return pkg.name.trim();
  const bits: string[] = [];
  if (pkg.volumeGb !== null) bits.push(`${pkg.volumeGb} GB`);
  if (pkg.durationDays) bits.push(`${pkg.durationDays} ${t('my_sims.days')}`);
  return bits.length > 0 ? bits.join(' · ') : t('my_sims.link_esim_plan_fallback');
}

export interface LinkEsimWizardProps {
  open: boolean;
  onClose: () => void;
  /** ICCIDs already shown under My eSIMs (normalised, no separators). */
  boundIccids: ReadonlySet<string>;
  onSuccess: () => void | Promise<void>;
  onLoginRequest: () => void;
}

const LinkEsimWizard: React.FC<LinkEsimWizardProps> = ({
  open,
  onClose,
  boundIccids,
  onSuccess,
  onLoginRequest,
}) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'enter' | 'confirm' | 'binding' | 'done'>('enter');
  const [iccidInput, setIccidInput] = useState('');
  const [preview, setPreview] = useState<ActivationPreviewData | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('enter');
    setIccidInput('');
    setPreview(null);
    setActivationCode('');
    setLookupLoading(false);
    setScanOpen(false);
    setError(null);
  }, [open]);

  const effectiveClaimState = useCallback(
    (data: ActivationPreviewData): 'available' | 'claimed_by_other' | 'pending_shipment' | 'claimed_self' => {
      if (data.claimState === 'pending_shipment') return 'pending_shipment';
      const norm = normaliseIccidInput(data.iccid);
      if (boundIccids.has(data.iccid) || (norm && boundIccids.has(norm))) return 'claimed_self';
      if (data.claimState === 'claimed_by_other') return 'claimed_by_other';
      return 'available';
    },
    [boundIccids],
  );

  const runLookup = async (raw: string) => {
    setError(null);
    const cleaned = normaliseIccidInput(raw);
    if (!cleaned) {
      setError(t('my_sims.link_esim_iccid_invalid'));
      return;
    }

    const normExisting = [...boundIccids].some((b) => b.replace(/[^0-9A-Za-z]/g, '') === cleaned);
    if (normExisting || boundIccids.has(cleaned)) {
      setError(t('my_sims.link_esim_already_linked'));
      return;
    }

    setLookupLoading(true);
    try {
      const result = await activationService.previewByIccid(cleaned);
      if (result.kind === 'not_found') {
        setError(t('my_sims.link_esim_not_found'));
        setPreview(null);
        setPhase('enter');
        return;
      }
      if (result.kind === 'error') {
        setError(result.message);
        setPreview(null);
        setPhase('enter');
        return;
      }

      const data = result.data;
      const claim = effectiveClaimState(data);
      if (claim === 'claimed_self') {
        setError(t('my_sims.link_esim_already_linked'));
        setPreview(null);
        setPhase('enter');
        return;
      }
      if (claim === 'pending_shipment') {
        setError(t('my_sims.link_esim_pending'));
        setPreview(null);
        setPhase('enter');
        return;
      }
      if (claim === 'claimed_by_other') {
        setError(t('my_sims.link_esim_claimed_other', { email: 'service@evairdigital.com' }));
        setPreview(null);
        setPhase('enter');
        return;
      }

      if (data.simId === null) {
        setError(t('my_sims.link_esim_missing_sim_id'));
        setPreview(null);
        setPhase('enter');
        return;
      }

      setIccidInput(cleaned);
      setPreview(data);
      setPhase('confirm');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleBind = async () => {
    if (!preview || preview.simId === null) return;
    if (!authService.isLoggedIn()) {
      onLoginRequest();
      setError(t('my_sims.link_esim_login_prompt'));
      return;
    }

    setError(null);
    setPhase('binding');

    try {
      const trimmedCode = activationCode.trim();
      await activationService.bindSim({
        simId: preview.simId,
        ...(trimmedCode ? { activationCode: trimmedCode } : {}),
      });
      await onSuccess();
      setPhase('done');
    } catch (e: unknown) {
      setPhase('confirm');
      const msg = e instanceof Error ? e.message : t('my_sims.link_esim_bind_failed');
      setError(msg);
    }
  };

  const handleHeaderBack = () => {
    if (phase === 'confirm') {
      setPhase('enter');
      setPreview(null);
      setError(null);
      return;
    }
    if (phase === 'binding') return;
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[72] flex flex-col bg-[#F2F4F7]">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 pt-safe pb-3">
          <button
            type="button"
            onClick={handleHeaderBack}
            disabled={phase === 'binding'}
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="flex-1 text-base font-bold text-slate-900">{t('my_sims.link_esim_title')}</h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-safe pt-6">
          {phase === 'enter' && (
            <>
              <p className="mb-1 text-lg font-semibold text-slate-900">{t('my_sims.link_esim_sheet_lead')}</p>
              <p className="mb-6 text-sm leading-relaxed text-slate-600">{t('my_sims.link_esim_hint')}</p>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('my_sims.iccid')}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={iccidInput}
                onChange={(e) => setIccidInput(e.target.value)}
                placeholder={t('my_sims.link_esim_iccid_placeholder')}
                className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none ring-brand-orange/30 focus:ring-2"
              />

              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-800 active:scale-[0.99]"
              >
                <QrCode size={20} className="text-brand-orange" />
                {t('my_sims.link_esim_scan_qr')}
              </button>

              <button
                type="button"
                disabled={lookupLoading}
                onClick={() => runLookup(iccidInput)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-60 active:scale-[0.99]"
              >
                {lookupLoading ? <Loader2 size={22} className="animate-spin" /> : null}
                {lookupLoading ? t('my_sims.link_esim_lookup_loading') : t('my_sims.link_esim_lookup')}
              </button>

              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
              )}
            </>
          )}

          {phase === 'confirm' && preview && (
            <>
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t('my_sims.plan_details')}
                </p>
                <p className="mb-4 text-lg font-bold text-slate-900">{formatPlanLine(preview, t)}</p>
                <p className="font-mono text-sm text-slate-600">{preview.iccid}</p>
              </div>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('my_sims.activation_code')}
                <span className="ml-1 font-normal normal-case text-slate-400">{t('my_sims.link_esim_activation_optional')}</span>
              </label>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder={t('my_sims.link_esim_activation_placeholder')}
                className="mb-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none ring-brand-orange/30 focus:ring-2"
              />

              <p className="mb-4 text-xs text-slate-500">{t('my_sims.link_esim_activation_help')}</p>

              {error && (
                <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
              )}

              <div className="mt-auto flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBind}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/20 active:scale-[0.99]"
                >
                  <Link2 size={20} />
                  {t('my_sims.link_esim_confirm')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('enter');
                    setPreview(null);
                    setError(null);
                  }}
                  className="py-2 text-center text-sm font-semibold text-slate-600"
                >
                  {t('my_sims.link_esim_back')}
                </button>
              </div>
            </>
          )}

          {phase === 'binding' && (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <Loader2 size={48} className="mb-4 animate-spin text-brand-orange" />
              <p className="text-center text-base font-semibold text-slate-800">{t('my_sims.link_esim_binding')}</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Link2 size={28} />
              </div>
              <p className="mb-6 text-center text-lg font-bold text-slate-900">{t('my_sims.link_esim_success')}</p>
              <button
                type="button"
                onClick={() => onClose()}
                className="rounded-xl bg-brand-orange px-8 py-3.5 font-bold text-white shadow-lg shadow-orange-500/20 active:scale-[0.99]"
              >
                {t('my_sims.done')}
              </button>
            </div>
          )}
        </div>
      </div>

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(v) => {
          setIccidInput(v);
          void runLookup(v);
        }}
        formatsToSupport={ESIM_LINK_SCAN_FORMATS}
        titleKey="barcode_scanner.esim_link_title"
        hintKey="barcode_scanner.esim_link_hint"
      />
    </>
  );
};

export default LinkEsimWizard;
