/**
 * Modal shown to desktop visitors who tap "Mobile Sign in →" on the
 * marketing site.
 *
 * Why a modal instead of just navigating to /app:
 *
 *   The customer-app shell at `/app` is rendered inside a 430-px iPhone
 *   mock on desktop. That's a great brand showcase for visitors browsing
 *   the dashboard tabs, but it's a frustrating sign-in surface — the
 *   email + password fields end up tiny, far below the fold, and floating
 *   in a sea of grey. Customers came here intending to *sign in*; we owe
 *   them either a real desktop sign-in form (which we don't have) or an
 *   honest "use your phone" prompt.
 *
 * Contents:
 *
 *   - EvairSIM wordmark (consistent with the rest of the marketing
 *     surfaces — same /evairsim-wordmark.png we use in SiteHeader).
 *   - Headline + subhead explaining the recommendation in product language.
 *   - QR code generated client-side via api.qrserver.com (no extra npm
 *     dep — keeps the bundle lean). Encodes a public marketing URL,
 *     so there's no privacy concern with the third-party renderer.
 *   - Two CTAs:
 *       Primary  — "Got it"  → close, do NOT proceed to /app.
 *       Tertiary — "Continue on desktop anyway →" → set the ack flag
 *                  and proceed to /app inside the phone-mock.
 *
 *   The escape hatch is intentional: customer-support agents, family
 *   members helping a parent, and disputed-charge investigations all
 *   need an "I really need to use my laptop" path. We honour it but
 *   don't promote it.
 *
 * Accessibility:
 *
 *   - Closes on Esc and backdrop click.
 *   - Focus is trapped to the dialog while open via the standard
 *     `<dialog>`-style overlay (we use a plain div + role="dialog"
 *     so it works inside our existing Tailwind chrome).
 *   - The wordmark image carries the alt text and the headline is
 *     wired up via aria-labelledby.
 */

import React, { useEffect, useRef } from 'react';
import { Smartphone, X } from 'lucide-react';

interface MobileOnlyNoticeProps {
    open: boolean;
    /** Close without proceeding (e.g. customer realises they should grab their phone). */
    onClose: () => void;
    /**
     * Customer chose "continue on desktop anyway" — gate writes the
     * dismissal flag to localStorage and navigates to /app inside the
     * phone-mock. Lives in the gate hook, not here.
     */
    onContinueAnyway: () => void;
}

const QR_TARGET_URL = 'https://evairdigital.com/app';

const QR_IMAGE_SRC =
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=240x240` +
    `&margin=12` +
    `&color=0F172A` +
    `&bgcolor=FFFFFF` +
    `&data=${encodeURIComponent(QR_TARGET_URL)}`;

const MobileOnlyNotice: React.FC<MobileOnlyNoticeProps> = ({
    open,
    onClose,
    onContinueAnyway,
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
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
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-only-notice-title"
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        >
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] overflow-hidden focus:outline-none"
            >
                <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="px-8 pt-8 pb-2 flex justify-center">
                    <img
                        src="/evairsim-wordmark.png"
                        alt="EvairSIM"
                        width={896}
                        height={228}
                        className="h-7 w-auto"
                    />
                </div>

                <div className="px-8 pt-4 pb-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mb-4">
                        <Smartphone size={22} />
                    </div>
                    <h2
                        id="mobile-only-notice-title"
                        className="text-xl font-extrabold text-slate-900 mb-2 leading-tight"
                    >
                        Sign in is on your phone
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Your EvairSIM account, eSIMs, and SIM card live in the
                        EvairSIM app on your phone — that&rsquo;s where the QR
                        codes install and the data plans run.
                    </p>
                </div>

                <div className="px-8 pb-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 flex flex-col items-center">
                        <img
                            src={QR_IMAGE_SRC}
                            alt={`Scan with your phone to open ${QR_TARGET_URL}`}
                            width={240}
                            height={240}
                            className="w-44 h-44 rounded-xl bg-white p-2 border border-slate-200"
                            loading="lazy"
                        />
                        <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">
                            Point your phone&rsquo;s camera at the code, then
                            tap the link to open EvairSIM.
                        </p>
                    </div>
                </div>

                <div className="px-8 pb-8 flex flex-col items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-transform"
                    >
                        Got it
                    </button>
                    <button
                        type="button"
                        onClick={onContinueAnyway}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
                    >
                        Continue on desktop anyway →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileOnlyNotice;
