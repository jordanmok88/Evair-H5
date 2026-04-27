/**
 * Auto-renew toggle row — drop-in for the SIM detail panel.
 *
 * Sits inside `MySimsView`'s details list as another row beside
 * "Coverage", "Validity", etc. Encapsulates four concerns the parent
 * shouldn't need to care about:
 *
 *   1. Fetching current state (`auto_renew`, next-charge date,
 *      disabled-reason badge) via `appSimService.getSim`.
 *   2. Fetching renewal eligibility (`renew_package_id`,
 *      `renew_price_cents`) via the public preview endpoint — that's
 *      the same source-of-truth the activation page uses, so the
 *      number we show here matches what the customer agreed to at
 *      checkout.
 *   3. Collecting card details when *enabling* — reuses
 *      `SetupIntentCardForm` so the SetupIntent → confirm flow stays
 *      in one place.
 *   4. Showing a ROSCA-compliant confirmation modal when *disabling*
 *      so the customer sees, in plain text, exactly what they're
 *      cancelling and when service ends. CA SB-313 / CT PA 21-15
 *      both require a clear cancellation surface; this is ours.
 *
 * The Laravel side dispatches `AutoRenewCancelledMail` on disable —
 * the H5 doesn't need to confirm receipt, but it should reflect the
 * new state immediately and surface the disabled-reason badge so
 * customer support can debug "why is mine off?" tickets without a DB
 * lookup.
 *
 * @see services/api/simApp.ts
 * @see Evair-Laravel/app/Http/Controllers/Api/App/SimController.php::updateAutoRenew
 * @see docs/AUTO_RENEW_DISCLOSURE.md
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Repeat, X } from 'lucide-react';
import {
    activationService,
    appSimService,
    type AppSimDetail,
    ApiError,
} from '../services/api';
import SetupIntentCardForm from './SetupIntentCardForm';

interface AutoRenewToggleProps {
    iccid: string;
    /**
     * When the SIM-asset is in a state where auto-renew makes no
     * sense (e.g. expired, suspended), the parent passes `false` and
     * the toggle renders a disabled hint instead of a switch.
     */
    eligible?: boolean;
}

type Phase =
    | { kind: 'loading' }
    | { kind: 'idle'; sim: AppSimDetail; renewPackageId: string | null; priceCents: number | null; currency: string | null }
    | { kind: 'collecting_card'; sim: AppSimDetail; renewPackageId: string; priceCents: number | null; currency: string | null }
    | { kind: 'updating'; sim: AppSimDetail }
    | { kind: 'confirming_cancel'; sim: AppSimDetail }
    | { kind: 'error'; message: string };

const AutoRenewToggle: React.FC<AutoRenewToggleProps> = ({ iccid, eligible = true }) => {
    const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
    const [refreshSeed, setRefreshSeed] = useState(0);

    // Bootstrap: fetch owned SIM detail + public preview in parallel.
    // Preview is intentionally tolerant — a failure there just means we
    // can't enable auto-renew, but viewing/disabling still works fine.
    useEffect(() => {
        let cancelled = false;
        setPhase({ kind: 'loading' });

        Promise.all([
            appSimService.getSim(iccid),
            activationService.previewByIccid(iccid).catch(() => null),
        ])
            .then(([sim, preview]) => {
                if (cancelled) return;
                const renewPackageId =
                    preview?.kind === 'ok' ? preview.data.renewPackageId : null;
                const priceCents =
                    preview?.kind === 'ok' ? preview.data.renewPriceCents : null;
                const currency =
                    preview?.kind === 'ok' ? preview.data.renewCurrency : null;
                setPhase({
                    kind: 'idle',
                    sim,
                    renewPackageId,
                    priceCents,
                    currency,
                });
            })
            .catch((err) => {
                if (cancelled) return;
                let message = 'Could not load auto-renew status.';
                if (err instanceof ApiError) {
                    if (err.isNetworkError()) {
                        message =
                            'Connection failed. Check your internet and try again.';
                    } else if (err.httpStatus === 404) {
                        message =
                            'We could not find this SIM on your account yet. Try again after it finishes syncing.';
                    } else {
                        message = err.message || message;
                    }
                } else if (err instanceof Error) {
                    message = err.message;
                }
                setPhase({ kind: 'error', message });
            });

        return () => {
            cancelled = true;
        };
    }, [iccid, refreshSeed]);

    if (!eligible) {
        return (
            <Row
                label="Auto-renew"
                trailing={<span className="text-xs text-slate-400">Not available</span>}
            />
        );
    }

    if (phase.kind === 'loading') {
        return (
            <Row
                label="Auto-renew"
                trailing={<Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            />
        );
    }

    if (phase.kind === 'error') {
        return (
            <Row
                label="Auto-renew"
                trailing={
                    <button
                        type="button"
                        onClick={() => setRefreshSeed((s) => s + 1)}
                        className="text-xs text-brand-orange font-semibold flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                    </button>
                }
                subtext={
                    <span className="text-xs text-red-600">{phase.message}</span>
                }
            />
        );
    }

    const sim =
        phase.kind === 'collecting_card' || phase.kind === 'confirming_cancel' || phase.kind === 'updating'
            ? phase.sim
            : phase.sim;

    const handleToggleClick = () => {
        if (phase.kind !== 'idle') return;
        if (sim.autoRenew) {
            setPhase({ kind: 'confirming_cancel', sim });
            return;
        }
        if (!phase.renewPackageId) {
            setPhase({
                kind: 'error',
                message:
                    'We can\'t determine the renewal plan for this SIM. Contact support to enable auto-renew.',
            });
            return;
        }
        setPhase({
            kind: 'collecting_card',
            sim,
            renewPackageId: phase.renewPackageId,
            priceCents: phase.priceCents,
            currency: phase.currency,
        });
    };

    const enableWith = async (paymentMethodId: string, renewPackageId: string) => {
        setPhase({ kind: 'updating', sim });
        try {
            const updated = await appSimService.updateAutoRenew(iccid, {
                autoRenew: true,
                autoRenewPackageId: renewPackageId,
                stripePaymentMethodId: paymentMethodId,
            });
            setPhase({
                kind: 'idle',
                sim: updated,
                renewPackageId: phase.kind === 'collecting_card' ? phase.renewPackageId : null,
                priceCents: phase.kind === 'collecting_card' ? phase.priceCents : null,
                currency: phase.kind === 'collecting_card' ? phase.currency : null,
            });
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Could not enable auto-renew.';
            setPhase({ kind: 'error', message });
        }
    };

    const disableWith = async (reason: string) => {
        setPhase({ kind: 'updating', sim });
        try {
            const updated = await appSimService.updateAutoRenew(iccid, {
                autoRenew: false,
                reason,
            });
            // Re-bootstrap so eligibility data refreshes alongside.
            setPhase({ kind: 'idle', sim: updated, renewPackageId: null, priceCents: null, currency: null });
            setRefreshSeed((s) => s + 1);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Could not disable auto-renew.';
            setPhase({ kind: 'error', message });
        }
    };

    // ── Render the row ────────────────────────────────────────────────
    const trailing = (() => {
        if (phase.kind === 'updating') {
            return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
        }
        return (
            <Switch
                on={sim.autoRenew}
                onClick={handleToggleClick}
                ariaLabel={sim.autoRenew ? 'Disable auto-renew' : 'Enable auto-renew'}
            />
        );
    })();

    const subtext = (() => {
        if (sim.autoRenew && sim.autoRenewNextChargeAt) {
            const next = new Date(sim.autoRenewNextChargeAt);
            return (
                <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Next charge {next.toLocaleDateString()}
                </span>
            );
        }
        if (!sim.autoRenew && sim.autoRenewDisabledReason) {
            return (
                <span className="text-xs text-slate-500">
                    {humaniseReason(sim.autoRenewDisabledReason)}
                </span>
            );
        }
        return null;
    })();

    return (
        <>
            <Row
                label="Auto-renew"
                trailing={trailing}
                subtext={subtext}
                icon={<Repeat size={16} />}
            />

            {phase.kind === 'collecting_card' && (
                <CardCollectionModal
                    iccid={iccid}
                    priceCents={phase.priceCents}
                    currency={phase.currency}
                    onCancel={() =>
                        setPhase({
                            kind: 'idle',
                            sim,
                            renewPackageId: phase.renewPackageId,
                            priceCents: phase.priceCents,
                            currency: phase.currency,
                        })
                    }
                    onPaymentMethod={(pm) => enableWith(pm, phase.renewPackageId)}
                />
            )}

            {phase.kind === 'confirming_cancel' && (
                <CancelConfirmModal
                    sim={sim}
                    onClose={() =>
                        setPhase({
                            kind: 'idle',
                            sim,
                            renewPackageId: null,
                            priceCents: null,
                            currency: null,
                        })
                    }
                    onConfirm={(reason) => disableWith(reason)}
                />
            )}
        </>
    );
};

export default AutoRenewToggle;

// ─── Pieces ──────────────────────────────────────────────────────────────

const Row: React.FC<{
    label: string;
    trailing: React.ReactNode;
    subtext?: React.ReactNode;
    icon?: React.ReactNode;
}> = ({ label, trailing, subtext, icon }) => (
    <div className="flex justify-between items-start py-1">
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                {icon ?? <Repeat size={16} />}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">{label}</div>
                {subtext && <div className="mt-0.5">{subtext}</div>}
            </div>
        </div>
        <div className="flex items-center pt-0.5">{trailing}</div>
    </div>
);

const Switch: React.FC<{
    on: boolean;
    onClick: () => void;
    ariaLabel: string;
}> = ({ on, onClick, ariaLabel }) => (
    <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={ariaLabel}
        onClick={onClick}
        className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${
            on ? 'bg-brand-orange' : 'bg-slate-300'
        }`}
    >
        <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                on ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
    </button>
);

const CardCollectionModal: React.FC<{
    iccid: string;
    priceCents: number | null;
    currency: string | null;
    onCancel: () => void;
    onPaymentMethod: (paymentMethodId: string) => void;
}> = ({ iccid, priceCents, currency, onCancel, onPaymentMethod }) => {
    const priceLabel =
        priceCents != null && Number.isFinite(priceCents)
            ? `${(currency || 'USD').toUpperCase() === 'USD' ? '$' : (currency || 'USD') + ' '}${(priceCents / 100).toFixed(2)}`
            : null;

    return (
        <Modal onClose={onCancel}>
            <header className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Enable auto-renew</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        We'll save your card and charge it once, on the day before your
                        plan expires, so service never drops.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="Close"
                    className="text-slate-400 hover:text-slate-600 p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </header>

            {priceLabel && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 text-sm">
                    <span className="text-slate-600">Renewal charge</span>
                    <span className="float-right font-bold text-slate-900">
                        {priceLabel}
                    </span>
                </div>
            )}

            <SetupIntentCardForm
                iccid={iccid}
                onPaymentMethod={onPaymentMethod}
                onCancel={onCancel}
                ctaLabel="Save card & enable auto-renew"
            />

            <p className="text-[11px] text-slate-400 leading-relaxed mt-4">
                You can turn off auto-renew anytime from this screen. Cancellations
                take effect at the end of your current billing period; we won't
                charge you again unless you explicitly opt back in.
            </p>
        </Modal>
    );
};

const CancelConfirmModal: React.FC<{
    sim: AppSimDetail;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}> = ({ sim, onClose, onConfirm }) => {
    const [reason, setReason] = useState('user_initiated');
    const expires = sim.expiredAt ? new Date(sim.expiredAt).toLocaleDateString() : 'the end of your current plan';

    return (
        <Modal onClose={onClose}>
            <header className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <AlertTriangle size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Turn off auto-renew?</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Your service will continue until <strong>{expires}</strong>. After
                        that, your SIM will stop working until you buy a new top-up plan.
                    </p>
                </div>
            </header>

            <fieldset className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
                <legend className="px-1 text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                    Why are you cancelling? (optional)
                </legend>
                {[
                    { id: 'user_initiated', label: 'No specific reason' },
                    { id: 'price', label: 'Too expensive' },
                    { id: 'switching', label: 'Switching to another carrier' },
                    { id: 'travel_ended', label: 'My trip ended' },
                    { id: 'other', label: 'Something else' },
                ].map((opt) => (
                    <label
                        key={opt.id}
                        className="flex items-center gap-2 py-1.5 text-sm cursor-pointer"
                    >
                        <input
                            type="radio"
                            name="cancel-reason"
                            value={opt.id}
                            checked={reason === opt.id}
                            onChange={(e) => setReason(e.target.value)}
                            className="accent-brand-orange"
                        />
                        <span className="text-slate-700">{opt.label}</span>
                    </label>
                ))}
            </fieldset>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm"
                >
                    Keep auto-renew
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm(reason)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold text-sm"
                >
                    Turn off
                </button>
            </div>
        </Modal>
    );
};

const Modal: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
    onClose,
    children,
}) => (
    <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4"
        onClick={onClose}
    >
        <div
            className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    </div>
);

function humaniseReason(reason: string): string {
    switch (reason) {
        case 'user_initiated':
            return 'Off — you turned this off';
        case 'price':
        case 'switching':
        case 'travel_ended':
        case 'other':
            return `Off — reason: ${reason.replace('_', ' ')}`;
        case 'failed_payment':
            return 'Off — last renewal payment failed';
        case 'expired_card':
            return 'Off — saved card is expired';
        default:
            return `Off — ${reason}`;
    }
}
