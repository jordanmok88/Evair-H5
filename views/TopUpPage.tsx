/**
 * `/top-up?iccid=...` page — Amazon-insert top-up landing.
 *
 * Companion to `ActivatePage`. The activation flow handles brand-new
 * SIMs that ship with a bundled plan; this flow handles SIMs that
 * are already activated and just need more data. Customers reach it
 * either from:
 *   - The "Top up" CTA inside the customer app (`/app/my-sims`).
 *   - A direct deep-link printed on the SIM card / inside-the-box
 *     insert (`evairdigital.com/top-up?iccid=…` — pick **SIM Card** or **Global eSIM** on `/top-up`, then continue on `/top-up/sim` or `/top-up/esim`).
 *
 * Flow:
 *   1. Read `iccid` from the URL (or ask the user to scan / type).
 *   2. Verify the SIM exists via the public preview endpoint. We
 *      reuse the activation preview for this — same data shape, same
 *      claim_state semantics. Top-up is only meaningful for SIMs that
 *      are *already claimed* (otherwise the customer should run the
 *      activation flow first), so `available` and `pending_shipment`
 *      both deflect with copy that points back to `/activate`.
 *   3. Fetch the recharge catalogue (`/h5/packages/recharge`) — public.
 *   4. Customer picks a plan → CTA "Continue to payment".
 *   5. If the customer is logged out, render a compact email/password
 *      auth form inline. Once the token is set the click can complete
 *      without bouncing them away to a login modal.
 *   6. Create a recharge order + payment session, then mount
 *      `StripePaymentModal` to collect the card and confirm the charge.
 *   7. On success, redirect into `/app/my-sims?iccid=...`.
 *
 * **Why `previewByIccid` and not a dedicated topup-preview endpoint?**
 *   The data the customer needs (which plan ships with this SIM, who
 *   owns it, is it valid) is identical to what `/activate` shows. A
 *   second endpoint would just duplicate the supplier-identity
 *   redaction logic. Deferred until product evidence says otherwise.
 *
 * @see docs/ACTIVATION_FUNNEL.md §3 — H5 deliverables (TopUp surface)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    Eye,
    EyeOff,
    Globe,
    Loader2,
    Lock,
    Mail,
    QrCode,
    ScanLine,
    ShieldCheck,
    Smartphone,
    Sparkles,
    User as UserIcon,
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import StripePaymentModal from '../components/StripePaymentModal';
import {
    activationService,
    authService,
    esimService,
    packageService,
    type ActivationPreviewData,
} from '../services/api';
import type { PackageDto } from '../services/api/types';
import type { TopUpRouteMode } from '../utils/routing';

interface TopUpPageProps {
    iccid: string | null;
    mode: TopUpRouteMode;
}

/**
 * Phase machine — narrows what the page renders.
 *
 *   idle              → no ICCID yet, prompt scan/type
 *   loading           → fetching preview + catalogue in parallel
 *   not_found         → preview returned not_found
 *   pending_shipment  → SIM exists in stock but isn't shipped yet
 *   needs_activation  → SIM is unclaimed (`available`) — deflect to /activate
 *   ready             → catalogue loaded; customer picks a plan
 *   error             → generic API failure, retry
 */
type Phase =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'not_found' }
    | { kind: 'pending_shipment' }
    | { kind: 'needs_activation' }
    | { kind: 'ready'; preview: ActivationPreviewData; packages: PackageDto[] }
    | { kind: 'error'; message: string };

const ICCID_REGEX = /^[0-9A-Za-z]{15,22}$/;

async function fetchRechargeCatalogue(iccid: string, flowMode: Exclude<TopUpRouteMode, null>): Promise<PackageDto[]> {
    if (flowMode === 'sim') {
        try {
            const primary = await packageService.getRechargePackages(iccid, 'pccw');
            let packages = primary.packages ?? [];
            if (packages.length === 0) {
                const fb = await packageService.getRechargePackages(iccid, 'esimaccess');
                packages = fb.packages ?? [];
            }
            if (packages.length === 0) {
                const omit = await packageService.getRechargePackages(iccid);
                packages = omit.packages ?? [];
            }
            return packages;
        } catch {
            return [];
        }
    }
    try {
        const primary = await packageService.getRechargePackages(iccid, 'esimaccess');
        let packages = primary.packages ?? [];
        if (packages.length === 0) {
            const omit = await packageService.getRechargePackages(iccid);
            packages = omit.packages ?? [];
        }
        return packages;
    } catch {
        return [];
    }
}

/** Path for deep links — ICCID appended when present (`/top-up` chooser forwards it). */
function topUpPathFor(flowMode: 'sim' | 'esim', iccidHint: string | null): string {
    const q = iccidHint ? `?iccid=${encodeURIComponent(iccidHint)}` : '';
    return `/top-up/${flowMode}${q}`;
}

const TopUpPage: React.FC<TopUpPageProps> = ({ iccid: initialIccid, mode }) => {
    const { t } = useTranslation();
    const [iccid, setIccid] = useState<string | null>(initialIccid);
    const [phase, setPhase] = useState<Phase>(() =>
        mode !== null && initialIccid ? { kind: 'loading' } : { kind: 'idle' },
    );
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualIccid, setManualIccid] = useState('');
    const [manualError, setManualError] = useState('');

    // Once a SIM is loaded the customer interacts with selection +
    // checkout state separately from the page-level Phase.
    const [selectedPackageCode, setSelectedPackageCode] = useState<string | null>(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    // ─── Lookup ICCID + catalogue (only `/top-up/sim` or `/top-up/esim`) ──
    useEffect(() => {
        if (mode === null || !iccid) {
            if (mode !== null) setPhase({ kind: 'idle' });
            return;
        }

        let cancelled = false;
        setPhase({ kind: 'loading' });

        Promise.all([
            activationService.previewByIccid(iccid),
            fetchRechargeCatalogue(iccid, mode),
        ])
            .then(([previewResult, packages]) => {
                if (cancelled) return;

                if (previewResult.kind === 'not_found') {
                    setPhase({ kind: 'not_found' });
                    return;
                }
                if (previewResult.kind === 'error') {
                    setPhase({ kind: 'error', message: previewResult.message });
                    return;
                }

                if (previewResult.data.claimState === 'pending_shipment') {
                    setPhase({ kind: 'pending_shipment' });
                    return;
                }
                if (previewResult.data.claimState === 'available') {
                    setPhase({ kind: 'needs_activation' });
                    return;
                }

                if (cancelled) return;
                setPhase({ kind: 'ready', preview: previewResult.data, packages });
            })
            .catch((err) => {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Lookup failed';
                setPhase({ kind: 'error', message });
            });

        return () => {
            cancelled = true;
        };
    }, [iccid, mode]);

    const submitManualIccid = useCallback(
        (raw: string) => {
            const cleaned = raw.replace(/[^0-9A-Za-z]/g, '');
            if (!ICCID_REGEX.test(cleaned)) {
                setManualError(t('topup_page.idle_iccid_invalid'));
                return;
            }
            setManualError('');
            const url = new URL(window.location.href);
            url.searchParams.set('iccid', cleaned);
            window.history.replaceState(null, '', url.toString());
            setIccid(cleaned);
        },
        [t],
    );

    if (mode === null) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50">
                <Header />
                <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 md:px-6 md:py-10">
                    <ChooserState iccidHint={iccid} />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header />

            <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 md:px-6 md:py-10">
                {phase.kind === 'idle' && (
                    <IdleState
                        flowMode={mode}
                        manualIccid={manualIccid}
                        manualError={manualError}
                        onManualChange={(v) => {
                            setManualIccid(v);
                            if (manualError) setManualError('');
                        }}
                        onManualSubmit={() => submitManualIccid(manualIccid)}
                        onScan={() => setScannerOpen(true)}
                    />
                )}

                {phase.kind === 'loading' && <LoadingState />}

                {phase.kind === 'not_found' && (
                    <NotFoundState
                        iccid={iccid}
                        onRetry={() => {
                            setIccid(null);
                            setManualIccid('');
                            setPhase({ kind: 'idle' });
                            const url = new URL(window.location.href);
                            url.searchParams.delete('iccid');
                            window.history.replaceState(null, '', url.toString());
                        }}
                    />
                )}

                {phase.kind === 'pending_shipment' && (
                    <ShippedSoonState iccid={iccid ?? ''} />
                )}

                {phase.kind === 'needs_activation' && (
                    <NeedsActivationState iccid={iccid ?? ''} />
                )}

                {phase.kind === 'error' && (
                    <ErrorBox
                        icon={<AlertCircle className="w-7 h-7 text-red-500" />}
                        title="Something went wrong"
                        body={<p>{phase.message}</p>}
                        primaryCta={{
                            label: 'Try again',
                            onClick: () => {
                                // Force the lookup effect to re-run. We bounce
                                // through `null` so the state actually changes
                                // and React schedules the dependency-driven
                                // rerun even when the ICCID is unchanged.
                                if (iccid) {
                                    const current = iccid;
                                    setIccid(null);
                                    setTimeout(() => setIccid(current), 0);
                                }
                            },
                        }}
                    />
                )}

                {phase.kind === 'ready' && (
                    <ReadyState
                        preview={phase.preview}
                        packages={phase.packages}
                        selectedPackageCode={selectedPackageCode}
                        onSelectPackage={setSelectedPackageCode}
                        onContinue={() => setCheckoutOpen(true)}
                    />
                )}

                {phase.kind === 'ready' && checkoutOpen && (
                    <CheckoutFlow
                        iccid={phase.preview.iccid}
                        supplierType={mode === 'sim' ? 'pccw' : 'esimaccess'}
                        selected={
                            phase.packages.find((p) => p.packageCode === selectedPackageCode) ??
                            null
                        }
                        onClose={() => setCheckoutOpen(false)}
                        onSuccess={() => {
                            // Redirect into the customer app where the new
                            // package will appear on the SIM detail card.
                            window.location.href = `/app/my-sims?iccid=${encodeURIComponent(phase.preview.iccid)}`;
                        }}
                    />
                )}
            </main>

            <BarcodeScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onDetected={(value) => {
                    setScannerOpen(false);
                    setManualIccid(value);
                    submitManualIccid(value);
                }}
            />
        </div>
    );
};

export default TopUpPage;

// ─── Subcomponents ──────────────────────────────────────────────────────

const ChooserState: React.FC<{ iccidHint: string | null }> = ({ iccidHint }) => {
    const { t } = useTranslation();
    return (
        <div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('topup_page.idle_title')}</h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">{t('topup_page.picker_intro')}</p>
            <div className="grid grid-cols-2 gap-2">
                <a
                    href={topUpPathFor('sim', iccidHint)}
                    className="flex min-h-[3.75rem] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold leading-snug text-slate-800 shadow-sm transition-colors hover:bg-slate-50 sm:min-h-[4rem] sm:text-[0.8125rem]"
                >
                    <Smartphone className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden />
                    {t('topup_page.picker_card_sim')}
                </a>
                <a
                    href={topUpPathFor('esim', iccidHint)}
                    className="flex min-h-[3.75rem] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold leading-snug text-slate-800 shadow-sm transition-colors hover:bg-slate-50 sm:min-h-[4rem] sm:text-[0.8125rem]"
                >
                    <Globe className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden />
                    {t('topup_page.picker_card_esim')}
                </a>
            </div>
        </div>
    );
};

const Header: React.FC = () => {
    const { t } = useTranslation();
    return (
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 md:px-6">
            <div className="mx-auto flex max-w-md flex-col items-center gap-1 text-center">
                <a href="/" className="inline-block shrink-0" aria-label="EvairSIM home">
                    <img
                        src="/evairsim-wordmark.png"
                        alt="EvairSIM"
                        width={896}
                        height={228}
                        className="mx-auto h-7 w-auto max-h-9 object-contain sm:h-8"
                    />
                </a>
                <p className="text-xs font-medium text-slate-500">{t('topup_page.header_tagline')}</p>
            </div>
        </header>
    );
};

const LoadingState: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange mb-3" />
            <p className="text-sm">{t('topup_page.loading_catalog')}</p>
        </div>
    );
};

interface IdleProps {
    flowMode: 'sim' | 'esim';
    manualIccid: string;
    manualError: string;
    onManualChange: (v: string) => void;
    onManualSubmit: () => void;
    onScan: () => void;
}

const IdleState: React.FC<IdleProps> = ({
    flowMode,
    manualIccid,
    manualError,
    onManualChange,
    onManualSubmit,
    onScan,
}) => {
    const { t } = useTranslation();
    const bodyKey = flowMode === 'sim' ? 'topup_page.idle_body_sim' : 'topup_page.idle_body_esim';
    return (
        <div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('topup_page.idle_title')}</h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">{t(bodyKey)}</p>

            <button
                type="button"
                onClick={onScan}
                className="mb-4 flex w-full min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-brand-orange py-4 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
            >
                <ScanLine className="h-5 w-5 shrink-0" />
                {t('topup_page.idle_scan_cta')}
            </button>

            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs uppercase tracking-wide text-slate-400">{t('topup_page.idle_or')}</span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                {t('topup_page.idle_manual_label')}
            </label>
            <div className="relative">
                <QrCode className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={manualIccid}
                    onChange={(e) => onManualChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onManualSubmit();
                    }}
                    placeholder="89014103211118510720"
                    inputMode="numeric"
                    autoComplete="off"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-4 font-mono text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
            </div>
            {manualError && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {manualError}
                </p>
            )}
            <button
                type="button"
                onClick={onManualSubmit}
                disabled={manualIccid.length < 15}
                className="mt-4 flex w-full min-h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
                {t('topup_page.idle_submit')}
                <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
        </div>
    );
};

const NotFoundState: React.FC<{ iccid: string | null; onRetry: () => void }> = ({
    iccid,
    onRetry,
}) => (
    <ErrorBox
        icon={<AlertCircle className="w-7 h-7 text-red-500" />}
        title="We couldn't find this SIM"
        body={
            <>
                {iccid && (
                    <div className="mb-3 px-3 py-2 bg-slate-100 rounded-lg font-mono text-xs text-slate-700 break-all">
                        {iccid}
                    </div>
                )}
                <p>
                    The ICCID you entered doesn't match any Evair SIM. Double-check the
                    digits on the inside of your box, or contact{' '}
                    <a
                        href="mailto:service@evairdigital.com"
                        className="text-brand-orange font-semibold"
                    >
                        service@evairdigital.com
                    </a>
                    .
                </p>
            </>
        }
        primaryCta={{ label: 'Try a different ICCID', onClick: onRetry }}
    />
);

const ShippedSoonState: React.FC<{ iccid: string }> = ({ iccid }) => (
    <ErrorBox
        icon={<ShieldCheck className="w-7 h-7 text-amber-500" />}
        title="This SIM hasn't shipped yet"
        body={
            <>
                <div className="mb-3 px-3 py-2 bg-slate-100 rounded-lg font-mono text-xs text-slate-700 break-all">
                    {iccid}
                </div>
                <p>
                    Looks like this SIM is still in the warehouse. Try topping up
                    once your Amazon order arrives.
                </p>
            </>
        }
    />
);

const NeedsActivationState: React.FC<{ iccid: string }> = ({ iccid }) => (
    <ErrorBox
        icon={<Sparkles className="w-7 h-7 text-orange-500" />}
        title="Activate this SIM first"
        body={
            <>
                <div className="mb-3 px-3 py-2 bg-slate-100 rounded-lg font-mono text-xs text-slate-700 break-all">
                    {iccid}
                </div>
                <p>
                    Your SIM ships with a bundled plan. Run the activation flow to
                    claim it — top-up plans become available after that.
                </p>
            </>
        }
        primaryCta={{
            label: 'Activate now',
            onClick: () => {
                window.location.href = `/activate?iccid=${encodeURIComponent(iccid)}`;
            },
        }}
    />
);

interface ErrorBoxProps {
    icon: React.ReactNode;
    title: string;
    body: React.ReactNode;
    primaryCta?: { label: string; onClick: () => void };
}

const ErrorBox: React.FC<ErrorBoxProps> = ({ icon, title, body, primaryCta }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            {icon}
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
        <div className="text-sm text-slate-600 leading-relaxed">{body}</div>
        {primaryCta && (
            <button
                type="button"
                onClick={primaryCta.onClick}
                className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all"
            >
                {primaryCta.label}
            </button>
        )}
    </div>
);

// ─── Ready state — plan picker ──────────────────────────────────────────

interface ReadyProps {
    preview: ActivationPreviewData;
    packages: PackageDto[];
    selectedPackageCode: string | null;
    onSelectPackage: (code: string) => void;
    onContinue: () => void;
}

const ReadyState: React.FC<ReadyProps> = ({
    preview,
    packages,
    selectedPackageCode,
    onSelectPackage,
    onContinue,
}) => {
    // Sort by price ascending — gives the customer a clear cheapest-to-priciest
    // ladder, which beats the supplier's whatever-order default.
    const sorted = useMemo(
        () => [...packages].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)),
        [packages],
    );

    // Phase 4 polish: rank plans by $ / GB so we can label the lowest-rate
    // plan "Best value" and highlight it. We also tag the largest-volume
    // plan "Most data" to anchor power users. Both labels are derived
    // from the catalogue itself, no extra API call needed.
    const { bestValueCode, mostDataCode } = useMemo(() => {
        let bestRate = Infinity;
        let bestCode: string | null = null;
        let bestVolume = 0;
        let mostCode: string | null = null;
        for (const pkg of sorted) {
            const volumeMB = pkg.volume ?? 0;
            const price = pkg.price ?? 0;
            if (volumeMB > 0 && price > 0) {
                const ratePerGb = price / (volumeMB / 1024);
                if (ratePerGb < bestRate) {
                    bestRate = ratePerGb;
                    bestCode = pkg.packageCode;
                }
                if (volumeMB > bestVolume) {
                    bestVolume = volumeMB;
                    mostCode = pkg.packageCode;
                }
            }
        }
        return { bestValueCode: bestCode, mostDataCode: mostCode };
    }, [sorted]);

    // Auto-select the best-value plan on first render so the CTA is
    // already enabled when the customer lands. They can still pick
    // anything else; this just cuts a tap from the happy path.
    useEffect(() => {
        if (!selectedPackageCode && bestValueCode) {
            onSelectPackage(bestValueCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bestValueCode]);

    if (sorted.length === 0) {
        return (
            <ErrorBox
                icon={<AlertCircle className="w-7 h-7 text-amber-500" />}
                title="No top-up plans available right now"
                body={
                    <p>
                        We couldn't find any top-up plans for this SIM. Try again in a
                        few minutes, or contact{' '}
                        <a
                            href="mailto:service@evairdigital.com"
                            className="text-brand-orange font-semibold"
                        >
                            service@evairdigital.com
                        </a>
                        .
                    </p>
                }
            />
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Top up your SIM</h1>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                Pick a plan below — we'll add it to your existing SIM without
                replacing the card or interrupting your data.
            </p>

            {/* SIM summary chip */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                        Topping up
                    </div>
                    <div className="text-sm font-mono text-slate-700 break-all">
                        {preview.iccid}
                    </div>
                </div>
            </div>

            {/* Plan list */}
            <div className="space-y-3 mb-6">
                {sorted.map((pkg) => {
                    const selected = pkg.packageCode === selectedPackageCode;
                    const isBestValue = pkg.packageCode === bestValueCode;
                    const isMostData = pkg.packageCode === mostDataCode && !isBestValue;
                    const volumeGb = (pkg.volume ?? 0) / 1024;
                    const pricePerGb =
                        volumeGb > 0 && pkg.price > 0
                            ? formatPrice(pkg.price / volumeGb, pkg.currency)
                            : null;
                    return (
                        <button
                            type="button"
                            key={pkg.packageCode}
                            onClick={() => onSelectPackage(pkg.packageCode)}
                            className={`w-full text-left bg-white rounded-2xl p-4 border-2 transition-all relative ${
                                selected
                                    ? 'border-brand-orange shadow-md shadow-orange-500/10'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {(isBestValue || isMostData) && (
                                <div
                                    className={`absolute -top-2 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                        isBestValue
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-blue-500 text-white'
                                    }`}
                                >
                                    {isBestValue ? 'Best value' : 'Most data'}
                                </div>
                            )}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="text-base font-bold text-slate-900 mb-1">
                                        {pkg.name}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {formatVolume(pkg.volume)} ·{' '}
                                        {pkg.duration} {pkg.durationUnit === 'MONTH' ? 'mo' : 'days'}
                                        {pkg.speed ? ` · ${pkg.speed}` : ''}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-lg font-bold text-brand-orange">
                                        {formatPrice(pkg.price, pkg.currency)}
                                    </div>
                                    {pricePerGb && (
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            {pricePerGb}/GB
                                        </div>
                                    )}
                                </div>
                            </div>
                            {pkg.description && (
                                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                                    {pkg.description}
                                </p>
                            )}
                            {selected && (
                                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-orange">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Selected
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={onContinue}
                disabled={!selectedPackageCode}
                className="w-full bg-brand-orange text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <CreditCard className="w-5 h-5" />
                Continue to payment
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
};

// ─── Checkout flow — login (if needed) → topup → payment ─────────────

interface CheckoutProps {
    iccid: string;
    supplierType: 'pccw' | 'esimaccess';
    selected: PackageDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

type CheckoutStep =
    | { kind: 'auth' }                                          // user not logged in
    | { kind: 'creating_order' }                                // calling /app/recharge
    | { kind: 'paying'; clientSecret: string; rechargeId: number }
    | { kind: 'error'; message: string };

const CheckoutFlow: React.FC<CheckoutProps> = ({ iccid, selected, supplierType, onClose, onSuccess }) => {
    const [step, setStep] = useState<CheckoutStep>(() =>
        authService.isLoggedIn() ? { kind: 'creating_order' } : { kind: 'auth' },
    );

    // Once authed (either at boot or after the inline form), kick off the
    // topup order. Centralised so both code paths converge here.
    const startCheckout = async () => {
        if (!selected) {
            setStep({ kind: 'error', message: 'Please pick a plan first.' });
            return;
        }
        setStep({ kind: 'creating_order' });
        try {
            const order = await esimService.topup({
                iccid,
                packageCode: selected.packageCode,
                supplierType,
            });
            const session = await esimService.createRechargePayment(order.id);
            setStep({
                kind: 'paying',
                clientSecret: session.clientSecret,
                rechargeId: order.id,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not create the order.';
            setStep({ kind: 'error', message });
        }
    };

    // Fire startCheckout when we land directly in `creating_order` (i.e.
    // the user was already logged in) or whenever we transition into it.
    useEffect(() => {
        if (step.kind === 'creating_order') {
            void startCheckout();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step.kind]);

    if (!selected) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={onClose}
        >
            <div
                className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {step.kind === 'auth' && (
                    <InlineAuthForm
                        plan={selected}
                        onAuthenticated={() => setStep({ kind: 'creating_order' })}
                        onCancel={onClose}
                    />
                )}

                {step.kind === 'creating_order' && (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-orange mx-auto mb-3" />
                        <p className="text-sm text-slate-600">Preparing your top-up…</p>
                    </div>
                )}

                {step.kind === 'error' && (
                    <div className="p-6">
                        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{step.message}</span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm"
                        >
                            Close
                        </button>
                    </div>
                )}

                {step.kind === 'paying' && (
                    <StripePaymentModal
                        isOpen={true}
                        onClose={onClose}
                        amount={selected.price}
                        currency={selected.currency || 'USD'}
                        items={[{ label: selected.name, amount: selected.price }]}
                        clientSecret={step.clientSecret}
                        rechargeId={step.rechargeId}
                        onComplete={(success) => {
                            if (success) {
                                onSuccess();
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// ─── Inline auth form ───────────────────────────────────────────────────

const InlineAuthForm: React.FC<{
    plan: PackageDto;
    onAuthenticated: () => void;
    onCancel: () => void;
}> = ({ plan, onAuthenticated, onCancel }) => {
    const [mode, setMode] = useState<'register' | 'login'>('register');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (mode === 'register' && password.length < 8) {
            setSubmitError('Password must be at least 8 characters.');
            return;
        }

        setSubmitting(true);
        try {
            if (mode === 'register') {
                await authService.register({
                    email,
                    password,
                    name: name || email.split('@')[0],
                });
            } else {
                await authService.login({ email, password });
            }
            onAuthenticated();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Authentication failed.';
            setSubmitError(message);
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Sign in to continue</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        We'll save your top-up history and keep your billing in one place.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                    aria-label="Close"
                >
                    Cancel
                </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-slate-600">{plan.name}</span>
                <span className="text-sm font-bold text-slate-900">
                    {formatPrice(plan.price, plan.currency)}
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                {(['register', 'login'] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            mode === m
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500'
                        }`}
                    >
                        {m === 'register' ? 'New customer' : 'Sign in'}
                    </button>
                ))}
            </div>

            {mode === 'register' && (
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                        Your name (optional)
                    </label>
                    <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Jordan Smith"
                            autoComplete="name"
                            className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Email <span className="text-brand-orange">*</span>
                </label>
                <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Password <span className="text-brand-orange">*</span>
                </label>
                <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        required
                        minLength={mode === 'register' ? 8 : undefined}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-10 pr-11 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                {mode === 'register' && (
                    <p className="text-xs text-slate-500 mt-1.5">Minimum 8 characters.</p>
                )}
            </div>

            {submitError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{submitError}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-orange text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {submitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {mode === 'register' ? 'Creating account…' : 'Signing in…'}
                    </>
                ) : (
                    <>{mode === 'register' ? 'Create account & continue' : 'Sign in & continue'}</>
                )}
            </button>

            <p className="text-xs text-slate-500 text-center leading-relaxed">
                By continuing you agree to our{' '}
                <a href="/terms" className="text-brand-orange font-semibold">
                    Terms
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-brand-orange font-semibold">
                    Privacy Policy
                </a>
                .
            </p>
        </form>
    );
};

// ─── Helpers ────────────────────────────────────────────────────────────

function formatVolume(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    const gb = bytes / 1024 ** 3;
    if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
    const mb = bytes / 1024 ** 2;
    return `${Math.round(mb)} MB`;
}

function formatPrice(price: number, currency?: string): string {
    if (!Number.isFinite(price)) return '—';
    const cur = (currency || 'USD').toUpperCase();
    const symbol = cur === 'USD' ? '$' : cur + ' ';
    return `${symbol}${price.toFixed(2)}`;
}
