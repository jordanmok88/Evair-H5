import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/** Default duration (ms) — aim ~1–2 s branding beat before mounting the app shell. */
export const BOOT_SPLASH_DURATION_MS_DEFAULT = 1500;
/** Shorter dismissal when prefers-reduced-motion. */
export const BOOT_SPLASH_DURATION_MS_REDUCED = 480;

/**
 * Skip the full-screen splash (`?nosplash=1`). Every normal reload shows the splash again
 * unless this flag is present (QA / demos).
 */
export function shouldSkipBootSplash(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return new URLSearchParams(window.location.search).has('nosplash');
    } catch {
        return true;
    }
}

interface BootSplashProps {
    onFinish: () => void;
}

/**
 * Full-viewport logo + rhythmic expanding rings (“signal”).
 * Runs on **every hard reload**. ~1.5 s default; shorten at ~0.48 s with reduced motion.
 */
export function BootSplash({ onFinish }: BootSplashProps) {
    const { t } = useTranslation();
    const finished = useRef(false);

    useEffect(() => {
        const mq =
            typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia('(prefers-reduced-motion: reduce)')
                : null;
        const prefersReduced = mq?.matches ?? false;
        const ms = prefersReduced
            ? BOOT_SPLASH_DURATION_MS_REDUCED
            : BOOT_SPLASH_DURATION_MS_DEFAULT;

        const id = window.setTimeout(() => {
            if (finished.current) return;
            finished.current = true;
            onFinish();
        }, ms);
        return () => window.clearTimeout(id);
    }, [onFinish]);

    return (
        <div
            className="fixed inset-0 z-[2147483646] flex flex-col items-center justify-center bg-gradient-to-b from-white via-white to-[#f4f6f9]"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">{t('app.boot_splash_sr')}</span>
            <div className="relative flex flex-col items-center px-8">
                <img
                    src="/evairsim-logo.png"
                    alt=""
                    width={720}
                    height={252}
                    className="relative z-[2] mx-auto h-16 w-auto object-contain sm:h-[4.75rem]"
                    draggable={false}
                    decoding="async"
                    fetchPriority="high"
                />

                {/* Expanding rings under the logo — moving “signal” */}
                <div
                    className="boot-signal-rings pointer-events-none relative z-[1] -mt-1 flex h-24 w-48 shrink-0 items-center justify-center"
                    aria-hidden
                >
                    <span className="boot-signal-ring" />
                    <span className="boot-signal-ring" />
                    <span className="boot-signal-ring" />
                </div>
            </div>
        </div>
    );
}
