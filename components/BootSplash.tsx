import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/** Splash logo — `/evairsim-splash-logo.png` (see project-overview.mdc). */
export const BOOT_SPLASH_LOGO_SRC = '/evairsim-splash-logo.png';

export const BOOT_SPLASH_DURATION_MS_DEFAULT = 2800;
export const BOOT_SPLASH_DURATION_MS_REDUCED = 980;

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

/** White canvas, logo, animated signal bars only — no dark theme. */
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
            className="boot-splash-shell fixed inset-0 z-[2147483646] flex flex-col items-center justify-center overflow-hidden px-6"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">{t('app.boot_splash_sr')}</span>

            <div className="flex w-full max-w-lg flex-col items-center">
                <img
                    src={BOOT_SPLASH_LOGO_SRC}
                    alt=""
                    width={472}
                    height={1024}
                    className="boot-logo-mark boot-logo-reveal mx-auto block h-auto max-h-[min(280px,calc(42vh))] w-auto max-w-[min(92vw,440px)] object-contain object-center"
                    draggable={false}
                    decoding="async"
                    fetchPriority="high"
                />

                {/* Moving “signal strength” bars — classic bar graph pulse */}
                <div
                    className="boot-signal-bars mt-[clamp(2rem,7vh,3rem)] flex h-12 items-end justify-center gap-1.5 sm:gap-2"
                    aria-hidden
                >
                    <span className="boot-sig-bar boot-sig-bar--1" />
                    <span className="boot-sig-bar boot-sig-bar--2" />
                    <span className="boot-sig-bar boot-sig-bar--3" />
                    <span className="boot-sig-bar boot-sig-bar--4" />
                    <span className="boot-sig-bar boot-sig-bar--5" />
                </div>
            </div>
        </div>
    );
}
