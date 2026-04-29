import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Canonical **horizontal EvairSIM** mark (orange Evair + SIM chip badge) — use ONLY this on boot splash.
 * Do NOT use `evairsim-logo.png` / wordmark / screenshot mock-ups here (`project-overview.mdc`).
 */
export const BOOT_SPLASH_LOGO_SRC = '/evairsim-splash-logo.jpg';

/** Total time splash holds before mounting the shell (ms). */
export const BOOT_SPLASH_DURATION_MS_DEFAULT = 2800;
export const BOOT_SPLASH_DURATION_MS_REDUCED = 980;

/**
 * Skip the full-screen splash (`?nosplash=1`). Reload still shows splash unless this flag is set.
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
 * Minimal high-impact splash: warm backdrop, halo **behind** the logo only (nothing overlaps foreground),
 * single shimmering accent line — no stacked “hub + big ring” circus.
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
            className="boot-splash-shell fixed inset-0 z-[2147483646] flex flex-col items-center justify-center px-5"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">{t('app.boot_splash_sr')}</span>

            <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
                <div className="relative w-full px-2 sm:px-0">
                    <span className="boot-logo-halo" aria-hidden />

                    <img
                        src={BOOT_SPLASH_LOGO_SRC}
                        alt=""
                        width={1024}
                        height={359}
                        className="relative z-[1] mx-auto block h-auto w-full max-h-[min(192px,calc(32vh))] max-w-[min(600px,calc(100vw-2rem))] object-contain"
                        draggable={false}
                        decoding="async"
                        fetchPriority="high"
                    />
                </div>

                <div className="boot-shimmer-track mt-[clamp(2.25rem,7vw,3.5rem)]" aria-hidden>
                    <div className="boot-shimmer-strip" />
                </div>

                <p className="boot-splash-eyebrow mt-12 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-xs">
                    {t('marketing.home_badge')}
                </p>
            </div>
        </div>
    );
}
