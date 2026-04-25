/**
 * ReferralView — Profile sub-screen for the Phase 5 referral program.
 *
 * Renders three sections:
 *   1. Hero card with the user's referral code + Share button.
 *   2. Stats: total redemptions, total earned, current credit balance.
 *   3. "Got a friend's code?" inline redeem form (collapsible).
 *   4. Recent redemptions list (pending vs. awarded).
 *
 * Behaviour notes:
 *   - All copy is read-only via `referralService.getMe()` — no separate
 *     auth check; the request will 401 if the user lost their token,
 *     and the API client's interceptor handles refresh transparently.
 *   - The Share button uses `navigator.share` when available
 *     (mobile webview); falls back to clipboard copy with a toast.
 *   - Redeem errors come back with `code: 'REFERRAL_INVALID'` (see
 *     ReferralController) — we surface the human-readable `msg`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChevronLeft,
    Copy,
    Share,
    Gift,
    Coins,
    Loader2,
    CheckCircle2,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { referralService, ReferralMeDto } from '../services/api/referrals';
import { ApiError } from '../services/api';

interface ReferralViewProps {
    onBack: () => void;
}

const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const ReferralView: React.FC<ReferralViewProps> = ({ onBack }) => {
    const { t } = useTranslation();
    useEdgeSwipeBack(onBack);

    const [data, setData] = useState<ReferralMeDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [shareToast, setShareToast] = useState(false);

    const [redeemOpen, setRedeemOpen] = useState(false);
    const [redeemCode, setRedeemCode] = useState('');
    const [redeemBusy, setRedeemBusy] = useState(false);
    const [redeemError, setRedeemError] = useState<string | null>(null);
    const [redeemSuccess, setRedeemSuccess] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const me = await referralService.getMe();
            setData(me);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load referrals');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleCopy = async () => {
        if (!data?.code) return;
        try {
            await navigator.clipboard.writeText(data.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard API blocked — fall back to no-op; the share
               button below uses navigator.share which is more universal. */
        }
    };

    const handleShare = async () => {
        if (!data) return;
        const payload = {
            title: 'Evair Digital',
            text: data.share_message,
            url: data.share_url,
        };
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share(payload);
                return;
            } catch {
                /* user dismissed or unsupported scheme — fall through */
            }
        }
        try {
            await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2000);
        } catch {
            /* swallow — there's nothing else we can do */
        }
    };

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned = redeemCode.trim().toUpperCase();
        if (cleaned.length < 4) {
            setRedeemError(t('referral.code_too_short'));
            return;
        }
        setRedeemBusy(true);
        setRedeemError(null);
        try {
            await referralService.redeem(cleaned);
            setRedeemSuccess(true);
            setRedeemCode('');
            await load();
            setTimeout(() => {
                setRedeemSuccess(false);
                setRedeemOpen(false);
            }, 2200);
        } catch (err) {
            const msg =
                err instanceof ApiError
                    ? err.message
                    : err instanceof Error
                        ? err.message
                        : t('referral.error_default');
            setRedeemError(msg);
        } finally {
            setRedeemBusy(false);
        }
    };

    return (
        <div className="lg:h-full flex flex-col bg-[#F2F4F7] lg:overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-xl pt-safe px-4 pb-3 flex items-center shrink-0 sticky top-0 z-10 border-b border-slate-100">
                <button
                    onClick={onBack}
                    className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10 transition-colors"
                >
                    <ChevronLeft size={22} className="text-slate-900" />
                </button>
                <h1 className="text-lg font-bold text-slate-900 ml-2">{t('referral.title')}</h1>
            </div>

            <div className="flex-1 px-4 pt-4 pb-6">
                {loading && (
                    <div className="flex items-center justify-center py-20 text-slate-500">
                        <Loader2 size={20} className="animate-spin mr-2" /> Loading…
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <div className="font-bold text-slate-900 mb-1">{t('referral.error_load')}</div>
                        <p className="text-sm text-slate-500 mb-4">{error}</p>
                        <button
                            onClick={load}
                            className="px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-semibold"
                        >
                            {t('referral.try_again')}
                        </button>
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* Hero — code + share */}
                        <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 text-white p-5 shadow-lg shadow-orange-500/20 mb-5 relative overflow-hidden">
                            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                            <Gift size={20} className="mb-2" />
                            <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">
                                {t('referral.hero_eyebrow')}
                            </div>
                            <p className="text-sm leading-relaxed mb-4 pr-2 opacity-95">
                                {t('referral.hero_body')}
                            </p>
                            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                                <span className="font-mono text-2xl font-bold tracking-[0.2em]">
                                    {data.code}
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className="bg-white text-orange-600 rounded-full w-10 h-10 flex items-center justify-center active:scale-95 transition-transform"
                                    aria-label={t('referral.copy_label')}
                                >
                                    {copied ? <CheckCircle2 size={18} /> : <Copy size={16} />}
                                </button>
                            </div>
                            <button
                                onClick={handleShare}
                                className="w-full bg-white text-orange-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                            >
                                <Share size={16} />
                                {t('referral.share_button')}
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-5">
                            <Stat
                                label={t('referral.stat_friends')}
                                value={String(data.total_redemptions)}
                            />
                            <Stat
                                label={t('referral.stat_earned')}
                                value={formatDollars(data.total_credit_cents)}
                            />
                            <Stat
                                label={t('referral.stat_balance')}
                                value={formatDollars(data.credit_balance_cents)}
                                highlight
                            />
                        </div>

                        {/* Got a code? */}
                        <div className="bg-white rounded-2xl border border-slate-200 mb-5 overflow-hidden">
                            <button
                                onClick={() => setRedeemOpen(v => !v)}
                                className="w-full flex items-center justify-between p-4 active:bg-slate-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                        <Coins size={18} className="text-emerald-500" />
                                    </div>
                                    <span className="font-semibold text-slate-900 text-sm">
                                        {t('referral.got_code')}
                                    </span>
                                </div>
                                <span className="text-xs font-semibold text-orange-600">
                                    {redeemOpen ? t('referral.hide') : t('referral.apply')}
                                </span>
                            </button>
                            {redeemOpen && (
                                <form onSubmit={handleRedeem} className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                                    {redeemSuccess ? (
                                        <div className="bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-xl p-3 flex items-center gap-2">
                                            <CheckCircle2 size={16} />
                                            {t('referral.code_applied')}
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                value={redeemCode}
                                                onChange={e => setRedeemCode(e.target.value)}
                                                placeholder={t('referral.code_placeholder')}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono uppercase tracking-widest focus:outline-none focus:border-orange-400"
                                                autoCapitalize="characters"
                                            />
                                            {redeemError && (
                                                <div className="text-xs text-red-600 px-1">{redeemError}</div>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={redeemBusy}
                                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {redeemBusy && <Loader2 size={14} className="animate-spin" />}
                                                {t('referral.code_apply')}
                                            </button>
                                        </>
                                    )}
                                </form>
                            )}
                        </div>

                        {/* Redemptions list */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100">
                                <h2 className="font-bold text-slate-900 text-sm">
                                    {t('referral.history_title')}
                                </h2>
                            </div>
                            {data.redemptions.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-slate-500">
                                    {t('referral.history_empty')}
                                </div>
                            ) : (
                                <ul>
                                    {data.redemptions.map(r => (
                                        <li
                                            key={r.id}
                                            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0"
                                        >
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">
                                                    {r.status === 'awarded'
                                                        ? `${t('referral.status_awarded')} ${formatDollars(r.reward_cents)}`
                                                        : r.status === 'pending'
                                                            ? t('referral.status_pending')
                                                            : t('referral.status_void')}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {r.awarded_at ?? r.created_at ?? ''}
                                                </div>
                                            </div>
                                            {r.status === 'awarded' ? (
                                                <CheckCircle2 size={18} className="text-emerald-500" />
                                            ) : r.status === 'pending' ? (
                                                <Clock size={18} className="text-amber-500" />
                                            ) : (
                                                <AlertCircle size={18} className="text-slate-400" />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </div>

            {shareToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg z-50">
                    {t('referral.link_copied')}
                </div>
            )}
        </div>
    );
};

const Stat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
    label,
    value,
    highlight,
}) => (
    <div
        className={`rounded-2xl p-3 text-center border ${
            highlight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-900'
        }`}
    >
        <div className="text-base font-extrabold leading-tight">{value}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
);

export default ReferralView;
