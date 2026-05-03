/**
 * Inline register/login used by `/top-up` checkout and `/app` profile guest sheet —
 * matches the flowing bottom-sheet pattern (`GuestAuthSheet`).
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Mail,
    User as UserIcon,
} from 'lucide-react';
import { authService } from '@/services/api';
import type { PackageDto, UserDto } from '@/services/api/types';

function formatPrice(price: number, currency?: string): string {
    if (!Number.isFinite(price)) return '—';
    const cur = (currency || 'USD').toUpperCase();
    const symbol = cur === 'USD' ? '$' : `${cur} `;
    return `${symbol}${price.toFixed(2)}`;
}

export interface InlineGuestAuthFormProps {
    plan?: PackageDto | null;
    /** `profile` swaps heading copy toward account sign-in wording. */
    variant?: 'checkout' | 'profile';
    dismissible?: boolean;
    onCancel?: () => void;
    initialMode?: 'register' | 'login';
    onAuthenticated: (user: UserDto) => void;
}

const InlineGuestAuthForm: React.FC<InlineGuestAuthFormProps> = ({
    plan = null,
    variant = 'checkout',
    dismissible = true,
    onCancel,
    initialMode,
    onAuthenticated,
}) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'register' | 'login'>(initialMode ?? 'register');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        if (initialMode) setMode(initialMode);
    }, [initialMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (mode === 'register' && password.length < 8) {
            setSubmitError(t('topup_page.auth_pw_min'));
            return;
        }

        setSubmitting(true);
        try {
            if (mode === 'register') {
                const res = await authService.register({
                    email,
                    password,
                    name: name || email.split('@')[0],
                });
                onAuthenticated(res.user);
            } else {
                const res = await authService.login({ email, password });
                onAuthenticated(res.user);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : t('topup_page.auth_failed');
            setSubmitError(message);
            setSubmitting(false);
        }
    };

    const title =
        variant === 'profile'
            ? t('profile.sheet_auth_title')
            : plan
              ? t('topup_page.auth_title_checkout')
              : t('topup_page.auth_title_esim');

    const body =
        variant === 'profile'
            ? t('profile.sheet_auth_body')
            : plan
              ? t('topup_page.auth_body_checkout')
              : t('topup_page.auth_body_esim');

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div
                className={`mb-2 flex items-start gap-3 ${dismissible && onCancel ? 'justify-between' : ''}`}
            >
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{body}</p>
                </div>
                {dismissible && onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-sm text-slate-400 hover:text-slate-600"
                        aria-label={t('topup_page.auth_cancel_aria')}
                    >
                        {t('topup_page.auth_cancel')}
                    </button>
                )}
            </div>

            {plan && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs text-slate-600">{plan.name}</span>
                    <span className="text-sm font-bold text-slate-900">
                        {formatPrice(plan.price, plan.currency)}
                    </span>
                </div>
            )}

            <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
                {(['register', 'login'] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                            mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                        }`}
                    >
                        {m === 'register' ? t('topup_page.auth_tab_register') : t('topup_page.auth_tab_login')}
                    </button>
                ))}
            </div>

            {mode === 'register' && (
                <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {t('topup_page.auth_name_label')}
                    </label>
                    <div className="relative">
                        <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('topup_page.auth_name_placeholder')}
                            autoComplete="name"
                            className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {t('topup_page.auth_email_label')} <span className="text-brand-orange">*</span>
                </label>
                <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('topup_page.auth_email_placeholder')}
                        autoComplete="email"
                        required
                        className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                    />
                </div>
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {t('topup_page.auth_password_label')} <span className="text-brand-orange">*</span>
                </label>
                <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        required
                        minLength={mode === 'register' ? 8 : undefined}
                        className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-11 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        aria-label={
                            showPassword ? t('topup_page.auth_pw_hide') : t('topup_page.auth_pw_show')
                        }
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {mode === 'register' && (
                    <p className="mt-1.5 text-xs text-slate-500">{t('topup_page.auth_pw_hint')}</p>
                )}
            </div>

            {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{submitError}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {submitting ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {mode === 'register'
                            ? t('topup_page.auth_submitting_register')
                            : t('topup_page.auth_submitting_login')}
                    </>
                ) : (
                    <>
                        {mode === 'register'
                            ? t('topup_page.auth_submit_register')
                            : t('topup_page.auth_submit_login')}
                    </>
                )}
            </button>

            <p className="text-center text-xs leading-relaxed text-slate-500">
                {t('topup_page.auth_terms_prefix')}{' '}
                <a href="/legal/terms" className="font-semibold text-brand-orange">
                    {t('topup_page.auth_terms_link')}
                </a>{' '}
                {t('topup_page.auth_terms_and')}{' '}
                <a href="/legal/privacy" className="font-semibold text-brand-orange">
                    {t('topup_page.auth_privacy_link')}
                </a>
                .
            </p>
        </form>
    );
};

export default InlineGuestAuthForm;
