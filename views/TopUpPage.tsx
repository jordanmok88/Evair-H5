/**
 * `/top-up?iccid=...` page — Amazon-insert top-up landing.
 *
 * Companion to `ActivatePage`. The activation flow handles brand-new
 * SIMs that ship with a bundled plan; this flow handles SIMs that
 * are already activated and just need more data. Customers reach it
 * either from:
 *   - The "Top up" CTA inside the customer app (`/app/my-sims`).
 *   - A direct deep-link printed on the SIM card / inside-the-box
 *     insert (`evairdigital.com/top-up?iccid=…`; **SIM Card** tab is default, **eSIM** tab optional via `?tab=esim` or bookmark `/top-up/esim`).
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
    Globe,
    Loader2,
    QrCode,
    ScanLine,
    ShieldCheck,
    Smartphone,
    Sparkles,
} from 'lucide-react';
import InlineGuestAuthForm from '../components/auth/InlineGuestAuthForm';
import BarcodeScanner from '../components/BarcodeScanner';
import SiteHeader from '../components/marketing/SiteHeader';
import StripePaymentModal from '../components/StripePaymentModal';
import {
    activationService,
    authService,
    esimService,
    packageService,
    userService,
    type ActivationPreviewData,
} from '../services/api';
import type { PackageDto, UserSimDto } from '../services/api/types';
import { getTopUpTabFromLocation, type TopUpTab } from '../utils/routing';
import { isMobileDevice } from '../utils/device';

/** Laravel PCCW supplier id — same rule as App.tsx bound-SIM grouping. */
const LARAVEL_SUPPLIER_ID_PCCW = 1;

function isAccountEsimBinding(row: UserSimDto): boolean {
    return row.sim.supplierId !== LARAVEL_SUPPLIER_ID_PCCW;
}

interface TopUpPageProps {
    iccid: string | null;
    initialTab: TopUpTab;
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

async function fetchRechargeCatalogue(
    iccid: string,
    rechargeKind: 'sim' | 'esim',
): Promise<PackageDto[]> {
    if (rechargeKind === 'sim') {
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

function formatMaskedIccid(full: string): string {
    if (full.length <= 8) return full;
    return `…${full.slice(-8)}`;
}

const TopUpPage: React.FC<TopUpPageProps> = ({ iccid: initialIccid, initialTab }) => {
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<TopUpTab>(() => initialTab);

    useEffect(() => {
        const path = window.location.pathname;
        const m = /^\/top-up\/(sim|esim)\/?$/.exec(path);
        if (!m) return;
        const u = new URL(window.location.href);
        u.pathname = '/top-up';
        if (m[1] === 'esim') u.searchParams.set('tab', 'esim');
        else u.searchParams.delete('tab');
        window.history.replaceState(window.history.state, '', u.toString());
    }, []);

    useEffect(() => {
        const onPop = () => setActiveTab(getTopUpTabFromLocation());
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const navigateTab = useCallback((tab: TopUpTab) => {
        setActiveTab(tab);
        const u = new URL(window.location.href);
        u.pathname = '/top-up';
        if (tab === 'esim') u.searchParams.set('tab', 'esim');
        else u.searchParams.delete('tab');
        window.history.pushState(window.history.state, '', u.toString());
    }, []);

    const [simIccid, setSimIccid] = useState<string | null>(() => initialIccid);
    useEffect(() => {
        setSimIccid(initialIccid);
    }, [initialIccid]);

    const [simPhase, setSimPhase] = useState<Phase>(() =>
        initialTab === 'sim' && initialIccid ? { kind: 'loading' } : { kind: 'idle' },
    );
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualIccid, setManualIccid] = useState('');
    const [manualError, setManualError] = useState('');
    const [simSelectedPackageCode, setSimSelectedPackageCode] = useState<string | null>(null);
    const [simCheckoutOpen, setSimCheckoutOpen] = useState(false);

    const [sessionEpoch, setSessionEpoch] = useState(0);

    const [esimRows, setEsimRows] = useState<UserSimDto[] | null>(null);
    const [esimListStatus, setEsimListStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [esimListErr, setEsimListErr] = useState<string | null>(null);
    const [esimIccidSelected, setEsimIccidSelected] = useState<string | null>(null);
    const [esimPhase, setEsimPhase] = useState<Phase>({ kind: 'idle' });
    const [manualEsimOpen, setManualEsimOpen] = useState(false);
    const [manualEsimValue, setManualEsimValue] = useState('');
    const [manualEsimErr, setManualEsimErr] = useState('');
    const [esimSelectedPkg, setEsimSelectedPkg] = useState<string | null>(null);
    const [esimCheckoutOpen, setEsimCheckoutOpen] = useState(false);

    useEffect(() => {
        if (activeTab !== 'esim') {
            setEsimIccidSelected(null);
            setEsimPhase({ kind: 'idle' });
            setEsimCheckoutOpen(false);
            setEsimSelectedPkg(null);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'sim') return;
        if (!simIccid) {
            setSimPhase({ kind: 'idle' });
            return;
        }

        let cancelled = false;
        setSimPhase({ kind: 'loading' });

        Promise.all([activationService.previewByIccid(simIccid), fetchRechargeCatalogue(simIccid, 'sim')])
            .then(([previewResult, packages]) => {
                if (cancelled) return;

                if (previewResult.kind === 'not_found') {
                    setSimPhase({ kind: 'not_found' });
                    return;
                }
                if (previewResult.kind === 'error') {
                    setSimPhase({ kind: 'error', message: previewResult.message });
                    return;
                }

                if (previewResult.data.claimState === 'pending_shipment') {
                    setSimPhase({ kind: 'pending_shipment' });
                    return;
                }
                if (previewResult.data.claimState === 'available') {
                    setSimPhase({ kind: 'needs_activation' });
                    return;
                }

                if (cancelled) return;
                setSimPhase({ kind: 'ready', preview: previewResult.data, packages });
            })
            .catch((err) => {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Lookup failed';
                setSimPhase({ kind: 'error', message });
            });

        return () => {
            cancelled = true;
        };
    }, [simIccid, activeTab]);

    useEffect(() => {
        if (activeTab !== 'esim' || !authService.isLoggedIn()) {
            setEsimListStatus('idle');
            return;
        }

        let cancelled = false;
        setEsimListStatus('loading');
        setEsimListErr(null);
        userService
            .getSims()
            .then((res) => {
                if (cancelled) return;
                const lines = (res.list ?? []).filter(isAccountEsimBinding);
                setEsimRows(lines);
                setEsimListStatus('done');
            })
            .catch(() => {
                if (cancelled) return;
                setEsimListErr('generic');
                setEsimListStatus('error');
                setEsimRows(null);
            });

        return () => {
            cancelled = true;
        };
    }, [activeTab, sessionEpoch]);

    useEffect(() => {
        if (activeTab !== 'esim' || esimListStatus !== 'done' || !esimRows || esimRows.length !== 1) {
            return;
        }
        setEsimIccidSelected(esimRows[0].sim.iccid);
    }, [activeTab, esimListStatus, esimRows]);

    useEffect(() => {
        if (activeTab !== 'esim' || !esimIccidSelected) {
            if (activeTab === 'esim' && !esimIccidSelected) setEsimPhase({ kind: 'idle' });
            return;
        }

        let cancelled = false;
        setEsimPhase({ kind: 'loading' });

        Promise.all([
            activationService.previewByIccid(esimIccidSelected),
            fetchRechargeCatalogue(esimIccidSelected, 'esim'),
        ])
            .then(([previewResult, packages]) => {
                if (cancelled) return;

                if (previewResult.kind === 'not_found') {
                    setEsimPhase({ kind: 'not_found' });
                    return;
                }
                if (previewResult.kind === 'error') {
                    setEsimPhase({ kind: 'error', message: previewResult.message });
                    return;
                }

                if (previewResult.data.claimState === 'pending_shipment') {
                    setEsimPhase({ kind: 'pending_shipment' });
                    return;
                }
                if (previewResult.data.claimState === 'available') {
                    setEsimPhase({ kind: 'needs_activation' });
                    return;
                }

                if (cancelled) return;
                setEsimPhase({ kind: 'ready', preview: previewResult.data, packages });
            })
            .catch((err) => {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Lookup failed';
                setEsimPhase({ kind: 'error', message });
            });

        return () => {
            cancelled = true;
        };
    }, [activeTab, esimIccidSelected]);

    const submitManualIccidSim = useCallback(
        (raw: string) => {
            const cleaned = raw.replace(/[^0-9A-Za-z]/g, '');
            if (!ICCID_REGEX.test(cleaned)) {
                setManualError(t('topup_page.idle_iccid_invalid'));
                return;
            }
            setManualError('');
            const url = new URL(window.location.href);
            url.searchParams.set('iccid', cleaned);
            window.history.replaceState(window.history.state, '', url.toString());
            setSimIccid(cleaned);
        },
        [t],
    );

    const submitManualIccidEsim = useCallback(
        (raw: string) => {
            const cleaned = raw.replace(/[^0-9A-Za-z]/g, '');
            if (!ICCID_REGEX.test(cleaned)) {
                setManualEsimErr(t('topup_page.idle_iccid_invalid'));
                return;
            }
            setManualEsimErr('');
            setEsimIccidSelected(cleaned);
            setManualEsimOpen(false);
        },
        [t],
    );

    const onSessionChanged = () => setSessionEpoch((e) => e + 1);

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <SiteHeader />
            <div className="border-b border-slate-200 bg-white px-4 py-2 text-center">
                <p className="text-xs font-medium text-slate-500">{t('topup_page.header_tagline')}</p>
            </div>

            <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 md:px-6 md:py-10">
                <TopUpTabBar activeTab={activeTab} onNavigate={navigateTab} />

                {activeTab === 'sim' && (
                    <>
                        {simPhase.kind === 'idle' && (
                            <IdleState
                                manualIccid={manualIccid}
                                manualError={manualError}
                                onManualChange={(v) => {
                                    setManualIccid(v);
                                    if (manualError) setManualError('');
                                }}
                                onManualSubmit={() => submitManualIccidSim(manualIccid)}
                                onScan={() => setScannerOpen(true)}
                            />
                        )}

                        {simPhase.kind === 'loading' && <LoadingState />}

                        {simPhase.kind === 'not_found' && (
                            <NotFoundState
                                iccid={simIccid}
                                onRetry={() => {
                                    setSimIccid(null);
                                    setManualIccid('');
                                    setSimPhase({ kind: 'idle' });
                                    const url = new URL(window.location.href);
                                    url.searchParams.delete('iccid');
                                    window.history.replaceState(window.history.state, '', url.toString());
                                }}
                            />
                        )}

                        {simPhase.kind === 'pending_shipment' && (
                            <ShippedSoonState iccid={simIccid ?? ''} />
                        )}

                        {simPhase.kind === 'needs_activation' && (
                            <NeedsActivationState iccid={simIccid ?? ''} />
                        )}

                        {simPhase.kind === 'error' && (
                            <ErrorBox
                                icon={<AlertCircle className="w-7 h-7 text-red-500" />}
                                title="Something went wrong"
                                body={<p>{simPhase.message}</p>}
                                primaryCta={{
                                    label: 'Try again',
                                    onClick: () => {
                                        if (simIccid) {
                                            const current = simIccid;
                                            setSimIccid(null);
                                            setTimeout(() => setSimIccid(current), 0);
                                        }
                                    },
                                }}
                            />
                        )}

                        {simPhase.kind === 'ready' && (
                            <ReadyState
                                preview={simPhase.preview}
                                packages={simPhase.packages}
                                selectedPackageCode={simSelectedPackageCode}
                                onSelectPackage={setSimSelectedPackageCode}
                                onContinue={() => setSimCheckoutOpen(true)}
                            />
                        )}

                        {simPhase.kind === 'ready' && simCheckoutOpen && (
                            <CheckoutFlow
                                iccid={simPhase.preview.iccid}
                                supplierType="pccw"
                                selected={
                                    simPhase.packages.find((p) => p.packageCode === simSelectedPackageCode) ??
                                    null
                                }
                                onClose={() => setSimCheckoutOpen(false)}
                                onSuccess={() => {
                                    window.location.href = `/app/my-sims?iccid=${encodeURIComponent(simPhase.preview.iccid)}`;
                                }}
                            />
                        )}
                    </>
                )}

                {activeTab === 'esim' && (
                    <>
                        {!authService.isLoggedIn() && (
                            <EsimGuestIntro onSessionChanged={onSessionChanged} />
                        )}

                        {authService.isLoggedIn() && esimListStatus === 'loading' && <LoadingState />}

                        {authService.isLoggedIn() && esimListStatus === 'error' && esimListErr && (
                            <ErrorBox
                                icon={<AlertCircle className="w-7 h-7 text-red-500" />}
                                title={t('topup_page.esim_list_err_title')}
                                body={<p>{t('topup_page.esim_list_fetch_failed')}</p>}
                                primaryCta={{
                                    label: t('topup_page.esim_retry'),
                                    onClick: onSessionChanged,
                                }}
                            />
                        )}

                        {authService.isLoggedIn() && esimListStatus === 'done' && esimRows && esimRows.length === 0 && (
                            <section className="space-y-6">
                                <EsimEmptyLoggedIn browseHref="/travel-esim" />
                                <EsimManualIccidCollapsible
                                    open={manualEsimOpen}
                                    onToggle={() => setManualEsimOpen((v) => !v)}
                                    value={manualEsimValue}
                                    onChange={(v) => {
                                        setManualEsimValue(v);
                                        if (manualEsimErr) setManualEsimErr('');
                                    }}
                                    error={manualEsimErr}
                                    onSubmit={() => submitManualIccidEsim(manualEsimValue)}
                                />
                            </section>
                        )}

                        {authService.isLoggedIn() &&
                            esimListStatus === 'done' &&
                            esimRows &&
                            esimRows.length > 0 &&
                            !esimIccidSelected && (
                                <section className="space-y-4">
                                    <h1 className="text-2xl font-bold text-slate-900">{t('topup_page.esim_pick_title')}</h1>
                                    <p className="text-sm leading-relaxed text-slate-600">
                                        {t('topup_page.esim_pick_hint')}
                                    </p>
                                    <div className="space-y-2">
                                        {esimRows.map((row) => {
                                            const id = row.sim.iccid;
                                            return (
                                                <button
                                                    key={row.id}
                                                    type="button"
                                                    className="flex w-full min-h-[3.25rem] items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition-colors hover:bg-slate-50"
                                                    onClick={() => setEsimIccidSelected(id)}
                                                >
                                                    <span className="font-mono text-xs text-slate-800">
                                                        {formatMaskedIccid(id)}
                                                    </span>
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        {row.sim.status === 'inactive'
                                                            ? t('topup_page.esim_status_inactive')
                                                            : t('topup_page.esim_status_active')}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <EsimManualIccidCollapsible
                                        open={manualEsimOpen}
                                        onToggle={() => setManualEsimOpen((v) => !v)}
                                        value={manualEsimValue}
                                        onChange={(v) => {
                                            setManualEsimValue(v);
                                            if (manualEsimErr) setManualEsimErr('');
                                        }}
                                        error={manualEsimErr}
                                        onSubmit={() => submitManualIccidEsim(manualEsimValue)}
                                    />
                                </section>
                            )}

                        {esimIccidSelected && esimPhase.kind === 'loading' && <LoadingState />}

                        {esimIccidSelected && esimPhase.kind === 'not_found' && (
                            <NotFoundState
                                iccid={esimIccidSelected}
                                onRetry={() => {
                                    setEsimIccidSelected(null);
                                    setEsimPhase({ kind: 'idle' });
                                }}
                            />
                        )}

                        {esimIccidSelected && esimPhase.kind === 'pending_shipment' && (
                            <ShippedSoonState iccid={esimIccidSelected} />
                        )}

                        {esimIccidSelected && esimPhase.kind === 'needs_activation' && (
                            <NeedsActivationState iccid={esimIccidSelected} />
                        )}

                        {esimIccidSelected && esimPhase.kind === 'error' && (
                            <ErrorBox
                                icon={<AlertCircle className="w-7 h-7 text-red-500" />}
                                title="Something went wrong"
                                body={<p>{esimPhase.message}</p>}
                                primaryCta={{
                                    label: 'Try again',
                                    onClick: () => {
                                        const cur = esimIccidSelected;
                                        setEsimIccidSelected(null);
                                        setTimeout(() => setEsimIccidSelected(cur), 0);
                                    },
                                }}
                            />
                        )}

                        {esimIccidSelected && esimPhase.kind === 'ready' && (
                            <>
                                {esimRows && esimRows.length > 1 && (
                                    <button
                                        type="button"
                                        className="mb-4 text-sm font-semibold text-brand-orange"
                                        onClick={() => {
                                            setEsimIccidSelected(null);
                                            setEsimPhase({ kind: 'idle' });
                                            setEsimSelectedPkg(null);
                                            setEsimCheckoutOpen(false);
                                        }}
                                    >
                                        ← {t('topup_page.esim_change_line')}
                                    </button>
                                )}
                                <ReadyState
                                    preview={esimPhase.preview}
                                    packages={esimPhase.packages}
                                    selectedPackageCode={esimSelectedPkg}
                                    onSelectPackage={setEsimSelectedPkg}
                                    onContinue={() => setEsimCheckoutOpen(true)}
                                />

                                {esimCheckoutOpen && (
                                    <CheckoutFlow
                                        iccid={esimPhase.preview.iccid}
                                        supplierType="esimaccess"
                                        selected={
                                            esimPhase.packages.find((p) => p.packageCode === esimSelectedPkg) ??
                                            null
                                        }
                                        onClose={() => setEsimCheckoutOpen(false)}
                                        onSuccess={() => {
                                            window.location.href = `/app/my-sims?iccid=${encodeURIComponent(esimPhase.preview.iccid)}`;
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </>
                )}
            </main>

            <BarcodeScanner
                open={activeTab === 'sim' && scannerOpen}
                onClose={() => setScannerOpen(false)}
                onDetected={(value) => {
                    setScannerOpen(false);
                    setManualIccid(value);
                    submitManualIccidSim(value);
                }}
            />
        </div>
    );
};

// ─── Subcomponents ──────────────────────────────────────────────────────

const TopUpTabBar: React.FC<{ activeTab: TopUpTab; onNavigate: (tab: TopUpTab) => void }> = ({
    activeTab,
    onNavigate,
}) => {
    const { t } = useTranslation();
    const tabBtn =
        'flex flex-1 min-h-[2.875rem] items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all';
    return (
        <div
            className="mb-8 flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner"
            role="tablist"
            aria-label={t('topup_page.tabs_aria')}
        >
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'sim'}
                className={`${tabBtn} ${
                    activeTab === 'sim' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
                onClick={() => onNavigate('sim')}
            >
                <Smartphone className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden />
                {t('topup_page.tab_sim')}
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'esim'}
                className={`${tabBtn} ${
                    activeTab === 'esim' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
                onClick={() => onNavigate('esim')}
            >
                <Globe className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden />
                {t('topup_page.tab_esim')}
            </button>
        </div>
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
    manualIccid: string;
    manualError: string;
    onManualChange: (v: string) => void;
    onManualSubmit: () => void;
    onScan: () => void;
}

const IdleState: React.FC<IdleProps> = ({
    manualIccid,
    manualError,
    onManualChange,
    onManualSubmit,
    onScan,
}) => {
    const { t } = useTranslation();
    return (
        <div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('topup_page.idle_title')}</h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">{t('topup_page.idle_body_sim')}</p>

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
                    <InlineGuestAuthForm
                        variant="checkout"
                        plan={selected}
                        initialMode="register"
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



const EsimManualIccidCollapsible: React.FC<{
    open: boolean;
    onToggle: () => void;
    value: string;
    onChange: (v: string) => void;
    error: string;
    onSubmit: () => void;
}> = ({ open, onToggle, value, onChange, error, onSubmit }) => {
    const { t } = useTranslation();
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-slate-800"
                onClick={onToggle}
                aria-expanded={open}
            >
                {t('topup_page.esim_manual_iccid_toggle')}
                <ChevronRight
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
                    aria-hidden
                />
            </button>
            {open && (
                <div className="mt-4 space-y-3">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {t('topup_page.idle_manual_label')}
                    </label>
                    <div className="relative">
                        <QrCode className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSubmit();
                            }}
                            placeholder="89014103211118510720"
                            inputMode="numeric"
                            autoComplete="off"
                            className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-4 font-mono text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                        />
                    </div>
                    {error && (
                        <p className="flex items-center gap-1.5 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {error}
                        </p>
                    )}
                    <button
                        type="button"
                        disabled={value.length < 15}
                        onClick={onSubmit}
                        className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {t('topup_page.idle_submit')}
                        <ArrowRight className="h-4 w-4 shrink-0" />
                    </button>
                </div>
            )}
        </div>
    );
};

const EsimEmptyLoggedIn: React.FC<{ browseHref: string }> = ({ browseHref }) => {
    const { t } = useTranslation();
    const appBrowse = '/app#esim';
    return (
        <div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('topup_page.esim_empty_title')}</h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">{t('topup_page.esim_empty_body')}</p>
            <a
                href={browseHref}
                onClick={(e) => {
                    if (!isMobileDevice()) return;
                    e.preventDefault();
                    window.location.assign(appBrowse);
                }}
                className="mb-6 flex min-h-[3.25rem] w-full items-center justify-center rounded-xl bg-brand-orange py-4 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
            >
                {t('topup_page.esim_browse_travel')}
            </a>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('topup_page.esim_manual_iccid_intro')}
            </p>
        </div>
    );
};

const EsimGuestIntro: React.FC<{ onSessionChanged: () => void }> = ({ onSessionChanged }) => {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <div>
                <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('topup_page.esim_guest_title')}</h1>
                <p className="text-sm leading-relaxed text-slate-600">{t('topup_page.esim_guest_body')}</p>
            </div>
            <div className="flex flex-col gap-3">
                <a
                    href="/travel-esim"
                    onClick={(e) => {
                        if (!isMobileDevice()) return;
                        e.preventDefault();
                        window.location.assign('/app#esim');
                    }}
                    className="flex min-h-[3.25rem] w-full items-center justify-center rounded-xl bg-brand-orange py-4 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                >
                    {t('topup_page.esim_browse_travel')}
                </a>
                <a
                    href="/app"
                    className="flex min-h-[3rem] items-center justify-center rounded-xl border-2 border-slate-200 bg-white py-3 text-base font-semibold text-slate-800"
                >
                    {t('topup_page.esim_open_app')}
                </a>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <InlineGuestAuthForm
                    variant="checkout"
                    plan={null}
                    dismissible={false}
                    initialMode="register"
                    onAuthenticated={() => {
                        onSessionChanged();
                    }}
                />
            </div>
        </div>
    );
};

export default TopUpPage;

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
