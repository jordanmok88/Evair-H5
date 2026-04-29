/**
 * Modal shown to desktop visitors who tap "OPEN APP" on the
 * marketing site.
 *
 * IMPORTANT: this modal is **never rendered for mobile visitors**.
 * `useMobileSignInGate.gateClick` returns early on mobile without
 * preventing the click default, so the underlying <a href="/app">
 * navigates straight to the customer app — and the customer app at
 * /app renders fullscreen on mobile (the phone-mock chrome in
 * app.css is gated behind `@media (min-width: 1024px)`). Mobile
 * users get the real H5, not a popup.
 *
 * Contents:
 *
 *   - QR code generated **client-side** via the `qrcode` package →
 *     PNG data URL. External QR image APIs often fail silently (privacy
 *     tools, flaky CDNs). Local generation keeps the popup reliable.
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, X } from 'lucide-react';

interface MobileOnlyNoticeProps {
    open: boolean;
    onClose: () => void;
    onContinueAnyway: () => void;
}

const QR_TARGET_URL = 'https://evairdigital.com/app';

const MobileOnlyNotice: React.FC<MobileOnlyNoticeProps> = ({
    open,
    onClose,
    onContinueAnyway,
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setQrDataUrl(null);
            return undefined;
        }
        let cancelled = false;
        QRCode.toDataURL(QR_TARGET_URL, {
            width: 240,
            margin: 2,
            color: { dark: '#0F172A', light: '#FFFFFF' },
            errorCorrectionLevel: 'M',
        })
            .then((url) => {
                if (!cancelled) setQrDataUrl(url);
            })
            .catch(() => {
                if (!cancelled) setQrDataUrl(null);
            });
        return () => {
            cancelled = true;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        const previouslyFocused = document.activeElement as HTMLElement | null;
        dialogRef.current?.focus();
        return () => {
            window.removeEventListener('keydown', handleKey);
            previouslyFocused?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100]" aria-live="polite">
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="fixed inset-0 z-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Centering shell: pointer-events-none so stray touches pass to backdrop; panel re-enables */}
            <div className="fixed inset-0 z-[1] flex min-h-0 flex-col overflow-y-auto pointer-events-none p-4 sm:p-8">
                <div className="m-auto flex w-full justify-center pt-[env(safe-area-inset-top,0)] pb-[env(safe-area-inset-bottom,0)] py-8">
                    <div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mobile-only-notice-title"
                        tabIndex={-1}
                        className="pointer-events-auto relative w-full max-w-md shrink-0 overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] focus:outline-none"
                    >
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={onClose}
                            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex justify-center px-8 pb-2 pt-8">
                            <img
                                src="/evairsim-wordmark.png"
                                alt="EvairSIM"
                                width={896}
                                height={228}
                                className="h-7 w-auto"
                            />
                        </div>

                        <div className="px-8 pb-6 pt-4 text-center">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                <Smartphone size={22} />
                            </div>
                            <h2
                                id="mobile-only-notice-title"
                                className="mb-2 text-xl font-extrabold leading-tight text-slate-900"
                            >
                                Sign in is on your mobile
                            </h2>
                            <p className="text-sm leading-relaxed text-slate-600">
                                This page automatically opens as the full EvairSIM app when you visit it from a
                                phone. Scan the QR below to switch to mobile view — your account, eSIMs, and SIM
                                card all live there.
                            </p>
                        </div>

                        <div className="px-8 pb-6">
                            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
                                <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
                                    {qrDataUrl ? (
                                        <img
                                            src={qrDataUrl}
                                            alt={`Scan with your mobile to open ${QR_TARGET_URL}`}
                                            width={240}
                                            height={240}
                                            className="h-full w-full rounded-lg object-contain"
                                            loading="eager"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div
                                            className="h-40 w-40 animate-pulse rounded-lg bg-slate-200"
                                            aria-hidden
                                        />
                                    )}
                                </div>
                                <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
                                    Point your mobile&rsquo;s camera at the code &mdash; EvairSIM will open in full
                                    mobile view, ready to sign in.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 px-8 pb-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full rounded-xl bg-orange-500 px-5 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition-transform hover:bg-orange-600 active:scale-[0.99]"
                            >
                                Got it
                            </button>
                            <button
                                type="button"
                                onClick={onContinueAnyway}
                                className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                            >
                                Continue on desktop anyway →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileOnlyNotice;
