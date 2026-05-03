import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    ArrowRight,
    BadgeCheck,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Eye,
    EyeOff,
    Info,
    Loader2,
    Lock,
    Mail,
    PackageCheck,
    QrCode,
    ScanLine,
    ShieldCheck,
    User as UserIcon,
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import SetupIntentCardForm from '../components/SetupIntentCardForm';
import {
    activationService,
    authService,
    type ActivationPreviewData,
    type ClaimState,
    type PreviewResult,
} from '../services/api';

/**
 * `/activate?iccid=...` page — Amazon-insert landing.
 *
 * The customer just scanned the QR code on a physical SIM box. We:
 *   1. Read `iccid` from the URL query (or ask the user to scan / type).
 *   2. Look up the SIM via `GET /v1/app/sims/preview/{iccid}` (public).
 *   3. Branch on `claim_state`:
 *      - available        → show plan preview + signup form
 *      - claimed_by_other → tell them to log in or contact support
 *      - pending_shipment → "this SIM hasn't shipped yet"
 *      - not_found        → "we can't find this SIM"
 *   4. On submit, register or log in the user, then bind the SIM via
 *      `POST /v1/app/users/bind-sim`. After success, redirect into the
 *      customer app at `/app/my-sims?iccid=...`.
 *
 * **Stripe SetupIntent** is collected inline when the customer keeps
 * the auto-renew checkbox checked: we mint a SetupIntent for them,
 * mount the Stripe Card Element, confirm it, and pass the resulting
 * `pm_…` to `bind-sim` so `RenewExpiringSims` can charge it later
 * off-session. When auto-renew is unchecked we skip the card step
 * entirely and bind-sim runs without payment data.
 *
 * @see docs/ACTIVATION_FUNNEL.md §3 — H5 deliverables
 * @see docs/ACTIVATION_FUNNEL.md §6 — SetupIntent flow
 */

type Phase =
    | { kind: 'idle' }            // no ICCID provided yet — show input/scan
    | { kind: 'loading' }         // fetching preview
    | { kind: 'preview'; data: ActivationPreviewData }  // success path
    | { kind: 'not_found' }
    | { kind: 'pending_shipment' }
    | { kind: 'claimed_by_other' }
    | { kind: 'error'; message: string };

interface ActivatePageProps {
    iccid: string | null;
}

const ICCID_REGEX = /^[0-9A-Za-z]{15,22}$/;

const ActivatePage: React.FC<ActivatePageProps> = ({ iccid: initialIccid }) => {
    const { t } = useTranslation();

    const [iccid, setIccid] = useState<string | null>(initialIccid);
    const [phase, setPhase] = useState<Phase>(
        initialIccid ? { kind: 'loading' } : { kind: 'idle' },
    );
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualIccid, setManualIccid] = useState('');
    const [manualError, setManualError] = useState('');

    // ─── Lookup ICCID ────────────────────────────────────────────────────
    useEffect(() => {
        if (!iccid) {
            setPhase({ kind: 'idle' });
            return;
        }

        let cancelled = false;
        setPhase({ kind: 'loading' });

        activationService
            .previewByIccid(iccid)
            .then((result: PreviewResult) => {
                if (cancelled) return;

                if (result.kind === 'not_found') {
                    setPhase({ kind: 'not_found' });
                    return;
                }

                if (result.kind === 'error') {
                    setPhase({ kind: 'error', message: result.message });
                    return;
                }

                const state: ClaimState = result.data.claimState;
                if (state === 'pending_shipment') {
                    setPhase({ kind: 'pending_shipment' });
                    return;
                }
                if (state === 'claimed_by_other') {
                    setPhase({ kind: 'claimed_by_other' });
                    return;
                }

                setPhase({ kind: 'preview', data: result.data });
            })
            .catch((err: unknown) => {
                // Without this catch a transient network failure (offline,
                // 5xx, timeout) leaves the UI stuck on the loader forever.
                // The service layer already maps known API errors to a
                // `{ kind: 'error' }` result, so anything reaching here is
                // a genuine throw — surface it as a retryable error state.
                if (cancelled) return;
                const message =
                    err instanceof Error && err.message
                        ? err.message
                        : t('activate.preview_failed');
                setPhase({ kind: 'error', message });
            });

        return () => {
            cancelled = true;
        };
    }, [iccid]);

    // ─── Manual ICCID submit ─────────────────────────────────────────────
    const submitManualIccid = (raw: string) => {
        const cleaned = raw.replace(/[^0-9A-Za-z]/g, '');
        if (!ICCID_REGEX.test(cleaned)) {
            setManualError(t('activate.invalid_iccid'));
            return;
        }
        setManualError('');
        // Update the URL so a refresh or share keeps the state, then
        // trigger lookup via state change.
        const url = new URL(window.location.href);
        url.searchParams.set('iccid', cleaned);
        window.history.replaceState(null, '', url.toString());
        setIccid(cleaned);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header />

            <main className="flex-1 px-4 py-6 md:px-6 md:py-10 max-w-md mx-auto w-full">
                {phase.kind === 'idle' && (
                    <IdleState
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
                    <PendingShipmentState iccid={iccid ?? ''} />
                )}

                {phase.kind === 'claimed_by_other' && (
                    <ClaimedByOtherState iccid={iccid ?? ''} />
                )}

                {phase.kind === 'error' && (
                    <ErrorState
                        message={phase.message}
                        onRetry={() => {
                            if (iccid) {
                                setPhase({ kind: 'loading' });
                                // Re-trigger via no-op state cycle.
                                setIccid((prev) => prev);
                                setIccid(iccid);
                            }
                        }}
                    />
                )}

                {phase.kind === 'preview' && <AvailableState data={phase.data} />}
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

export default ActivatePage;

// ─── Subcomponents ────────────────────────────────────────────────────────

const Header: React.FC = () => {
    const { t } = useTranslation();
    return (
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 md:px-6">
            <div className="mx-auto flex max-w-md flex-col gap-1">
                <a href="/" className="inline-block w-fit shrink-0" aria-label="EvairSIM home">
                    <img
                        src="/evairsim-wordmark.png"
                        alt="EvairSIM"
                        width={896}
                        height={228}
                        className="h-7 w-auto max-h-9 object-contain object-left sm:h-8"
                    />
                </a>
                <p className="text-xs font-medium text-slate-500">{t('activate.header_tagline')}</p>
            </div>
        </header>
    );
};

const LoadingState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange mb-3" />
        <p className="text-sm">Looking up your SIM…</p>
    </div>
);

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
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('activate.idle_title')}</h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">{t('activate.idle_body')}</p>

            <button
                type="button"
                onClick={onScan}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange py-4 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
            >
                <ScanLine className="h-5 w-5" />
                {t('activate.scan_barcode_cta')}
            </button>

            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs uppercase tracking-wide text-slate-400">
                    {t('activate.idle_or')}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                {t('activate.idle_manual_label')}
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
                    className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-mono focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
            </div>
            {manualError && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {manualError}
                </p>
            )}
            <button
                type="button"
                onClick={onManualSubmit}
                disabled={manualIccid.length < 15}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
                {t('activate.idle_lookup_sim')}
                <ArrowRight className="h-4 w-4" />
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
                    The ICCID you entered doesn't match any Evair SIM in our system.
                    Double-check the digits on the inside of your box.
                </p>
                <p className="mt-3">
                    Still stuck? Contact us at{' '}
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

const PendingShipmentState: React.FC<{ iccid: string }> = ({ iccid }) => (
    <ErrorBox
        icon={<PackageCheck className="w-7 h-7 text-amber-500" />}
        title="This SIM hasn't shipped yet"
        body={
            <>
                <div className="mb-3 px-3 py-2 bg-slate-100 rounded-lg font-mono text-xs text-slate-700 break-all">
                    {iccid}
                </div>
                <p>
                    We see this SIM in our system but it's still in the warehouse.
                    Try again once your Amazon order is delivered.
                </p>
            </>
        }
    />
);

const ClaimedByOtherState: React.FC<{ iccid: string }> = ({ iccid }) => (
    <ErrorBox
        icon={<ShieldCheck className="w-7 h-7 text-blue-500" />}
        title="This SIM is already activated"
        body={
            <>
                <div className="mb-3 px-3 py-2 bg-slate-100 rounded-lg font-mono text-xs text-slate-700 break-all">
                    {iccid}
                </div>
                <p>
                    Looks like this SIM is already linked to an account. If it's
                    yours, log in to your Evair account to manage it.
                </p>
                <p className="mt-3">
                    If you didn't activate it, contact us at{' '}
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
        primaryCta={{
            label: 'Go to my account',
            onClick: () => {
                window.location.href = '/app';
            },
        }}
    />
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({
    message,
    onRetry,
}) => (
    <ErrorBox
        icon={<AlertCircle className="w-7 h-7 text-red-500" />}
        title="Something went wrong"
        body={<p>{message}</p>}
        primaryCta={{ label: 'Try again', onClick: onRetry }}
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

// ─── Available state — the actual signup form ────────────────────────────

/**
 * Sub-phases inside the available state. Splitting this out keeps
 * the JSX readable: `details` = email/password form; `card` = Stripe
 * SetupIntent collector; `binding` = the brief bind-sim moment after
 * the card is saved (or after the no-auto-renew path).
 */
type AvailablePhase =
    | { kind: 'details' }
    | { kind: 'card' }
    | { kind: 'binding' };

const AvailableState: React.FC<{ data: ActivationPreviewData }> = ({ data }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    // Auto-renew can only be pre-checked when the server resolved a
    // bundled package id for us. Without one the bind-sim endpoint will
    // reject `auto_renew=true` (`auto_renew_package_id` is required), so
    // we silently flip the toggle off rather than hand the customer an
    // option that's destined to fail validation.
    const canAutoRenew = !!data.renewPackageId;
    const [autoRenew, setAutoRenew] = useState(canAutoRenew);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [phase, setPhase] = useState<AvailablePhase>({ kind: 'details' });
    const [submitError, setSubmitError] = useState('');
    const [showDisclosure, setShowDisclosure] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const planLabel = useMemo(() => formatPlanLabel(data), [data]);
    const renewPriceLabel = useMemo(() => formatRenewPrice(data), [data]);

    /**
     * Bind the SIM and redirect. Shared by the auto-renew-on path
     * (after SetupIntent confirms) and the auto-renew-off path
     * (immediately after detail validation). Centralising it keeps
     * the success/error contract identical regardless of route.
     */
    const finishActivation = async (paymentMethodId: string | null): Promise<void> => {
        if (!data.simId) {
            setSubmitError('This SIM is missing internal data — please contact support.');
            setPhase({ kind: 'details' });
            return;
        }

        setPhase({ kind: 'binding' });
        setSubmitError('');

        try {
            const bindPayload =
                autoRenew && paymentMethodId && data.renewPackageId
                    ? {
                          simId: data.simId,
                          autoRenew: true,
                          autoRenewPackageId: data.renewPackageId,
                          stripePaymentMethodId: paymentMethodId,
                      }
                    : { simId: data.simId };

            await activationService.bindSim(bindPayload);

            // Auto-renew is now wired end-to-end here, so the
            // `prompt_auto_renew` URL hack is gone. We still forward
            // the marketing opt-in so the my-sims surface can persist
            // it on the AppUser preferences row. The `just_activated`
            // flag lets MySimsView render a one-off celebration banner
            // with a top-up cross-sell CTA (Phase 4).
            const params = new URLSearchParams({
                iccid: data.iccid,
                just_activated: '1',
                ...(marketingOptIn ? { marketing_opt_in: '1' } : {}),
            });
            window.location.href = `/app/my-sims?${params.toString()}`;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Activation failed.';
            setSubmitError(message);
            setPhase({ kind: 'details' });
        }
    };

    const handleDetailsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (password.length < 8) {
            setSubmitError('Password must be at least 8 characters.');
            return;
        }
        if (!data.simId) {
            setSubmitError('This SIM is missing internal data — please contact support.');
            return;
        }

        setPhase({ kind: 'binding' });

        try {
            // Account creation always runs first. authService.register
            // both creates the AppUser and stores the access token, so
            // every subsequent call (SetupIntent, bind-sim) inherits
            // auth from the same client cache.
            if (!authService.isLoggedIn()) {
                await authService.register({
                    email,
                    password,
                    name: name || email.split('@')[0],
                });
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Could not create your account.';
            setSubmitError(message);
            setPhase({ kind: 'details' });
            return;
        }

        // Branch on auto-renew: if it's checked and we have a package
        // id, hand off to the SetupIntent step. Otherwise bind right
        // now without payment data.
        if (autoRenew && data.renewPackageId) {
            setPhase({ kind: 'card' });
            return;
        }

        await finishActivation(null);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Welcome to Evair
            </h1>
            <p className="text-sm text-slate-600 mb-6">
                Almost there — just create your account to activate this SIM.
            </p>

            {/* Plan summary card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <BadgeCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                        Bundled with your Amazon order
                    </span>
                </div>
                <div className="text-lg font-bold text-slate-900 mb-3">{planLabel}</div>
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">ICCID</span>
                    <span className="font-mono text-slate-700 text-xs break-all">
                        {data.iccid}
                    </span>
                </div>
                {data.package?.durationDays && (
                    <div className="border-t border-slate-100 pt-3 mt-3 flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        Plan starts the day you activate · {data.package.durationDays} days
                    </div>
                )}
            </div>

            {/* Step 2: card collection (when auto-renew is on). Once a
                card is saved we slide back into the binding state and
                redirect on success. */}
            {phase.kind === 'card' && (
                <div className="space-y-4">
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
                        <div className="font-semibold mb-1">One last step</div>
                        <p className="leading-relaxed">
                            We need a card on file so your auto-renew kicks in when this plan
                            runs out. <strong>No charge today</strong> — your bundled plan is
                            included with your Amazon order.
                        </p>
                    </div>
                    <SetupIntentCardForm
                        iccid={data.iccid}
                        onPaymentMethod={(pmId) => {
                            void finishActivation(pmId);
                        }}
                        onCancel={() => {
                            // Customer changed their mind — bind without
                            // auto-renew rather than dropping them on a
                            // dead-end page.
                            setAutoRenew(false);
                            void finishActivation(null);
                        }}
                    />
                    {submitError && (
                        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{submitError}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Signup form — step 1. Hidden once we move to the card step
                so the page focus stays where the customer expects. */}
            {phase.kind !== 'card' && (
            <form ref={formRef} onSubmit={handleDetailsSubmit} className="space-y-4">
                <FormField
                    label="Your name (optional)"
                    icon={<UserIcon className="w-4 h-4 text-slate-400" />}
                >
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jordan Smith"
                        autoComplete="name"
                        className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    />
                </FormField>

                <FormField
                    label="Email"
                    icon={<Mail className="w-4 h-4 text-slate-400" />}
                    required
                >
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    />
                </FormField>

                <FormField
                    label="Password"
                    icon={<Lock className="w-4 h-4 text-slate-400" />}
                    required
                    helper="Minimum 8 characters."
                >
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                        minLength={8}
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
                </FormField>

                {/* Auto-renew opt-in — pre-checked per "all plans auto top up" policy.
                    Disabled when the server couldn't resolve a bundled package id;
                    the customer can still finish activation and turn it on later. */}
                <div className={`rounded-xl p-4 ${canAutoRenew ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200 opacity-70'}`}>
                    <label className={`flex items-start gap-3 ${canAutoRenew ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input
                            type="checkbox"
                            checked={autoRenew}
                            onChange={(e) => setAutoRenew(e.target.checked)}
                            disabled={!canAutoRenew}
                            className="mt-0.5 w-5 h-5 rounded border-2 border-amber-300 text-brand-orange focus:ring-brand-orange/20 disabled:cursor-not-allowed flex-shrink-0"
                        />
                        <div className="flex-1 text-sm">
                            <div className="font-semibold text-slate-900 mb-1">
                                Keep me connected with auto-renew
                            </div>
                            <div className="text-slate-600 leading-relaxed">
                                {renewPriceLabel ? (
                                    <>
                                        We'll auto-renew at <strong>{renewPriceLabel}</strong> when
                                        your data runs out. Cancel anytime in My SIMs.
                                    </>
                                ) : (
                                    <>
                                        We'll renew your plan automatically when it runs out.
                                        Cancel anytime in My SIMs.
                                    </>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDisclosure((v) => !v)}
                                className="mt-2 text-xs font-semibold text-brand-orange flex items-center gap-1"
                            >
                                <Info className="w-3 h-3" />
                                {showDisclosure ? 'Hide details' : 'See cancellation terms'}
                                <ChevronRight
                                    className={`w-3 h-3 transition-transform ${
                                        showDisclosure ? 'rotate-90' : ''
                                    }`}
                                />
                            </button>
                            {showDisclosure && (
                                <div className="mt-3 p-3 bg-white border border-amber-200 rounded-lg text-xs text-slate-600 space-y-2 leading-relaxed">
                                    <p>
                                        By keeping this checked you authorize EvairSIM (Evair
                                        Digital) to charge your saved payment method
                                        automatically each renewal cycle until you cancel.
                                    </p>
                                    <p>
                                        You can cancel anytime in <strong>My SIMs → Auto-renew</strong>
                                        , by emailing service@evairdigital.com, or by texting STOP to
                                        the number in your account. We'll send a cancellation
                                        confirmation by email.
                                    </p>
                                    <p className="text-slate-500">
                                        Required by U.S. ROSCA (16 CFR §425.1) and CA SB-313.
                                    </p>
                                </div>
                            )}
                        </div>
                    </label>
                </div>

                {/* Marketing opt-in — separate, unchecked per Q6 decision */}
                <label className="flex items-start gap-3 cursor-pointer px-1">
                    <input
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => setMarketingOptIn(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-brand-orange focus:ring-brand-orange/20 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1 text-sm text-slate-600 leading-relaxed">
                        Send me Evair travel deals and product updates. No spam, unsubscribe anytime.
                    </div>
                </label>

                {submitError && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{submitError}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={phase.kind === 'binding'}
                    className="w-full bg-brand-orange text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {phase.kind === 'binding' ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {autoRenew && data.renewPackageId
                                ? 'Preparing secure card entry…'
                                : 'Activating…'}
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            {autoRenew && data.renewPackageId
                                ? 'Continue to payment'
                                : 'Activate this SIM'}
                        </>
                    )}
                </button>

                <p className="text-xs text-slate-500 text-center px-4 leading-relaxed">
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
            )}
        </div>
    );
};

interface FormFieldProps {
    label: string;
    icon: React.ReactNode;
    required?: boolean;
    helper?: string;
    children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, icon, required, helper, children }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            {label}
            {required && <span className="text-brand-orange ml-1">*</span>}
        </label>
        <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
            {children}
        </div>
        {helper && <p className="text-xs text-slate-500 mt-1.5">{helper}</p>}
    </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatPlanLabel(data: ActivationPreviewData): string {
    const pkg = data.package;
    if (!pkg) {
        return 'Your bundled Evair plan';
    }
    if (pkg.name) {
        return pkg.name;
    }

    const bits: string[] = [];
    if (pkg.volumeGb !== null) {
        bits.push(`${pkg.volumeGb} GB`);
    }
    if (pkg.durationDays) {
        bits.push(`${pkg.durationDays} days`);
    }
    return bits.length > 0 ? bits.join(' · ') : 'Your bundled Evair plan';
}

function formatRenewPrice(data: ActivationPreviewData): string | null {
    if (data.renewPriceCents === null || !data.renewCurrency) {
        return null;
    }
    const dollars = data.renewPriceCents / 100;
    return `$${dollars.toFixed(2)} ${data.renewCurrency}`;
}
