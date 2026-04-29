import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Transparent horizontal EvairSIM mark — `/evairsim-splash-logo.png` (only file for splash; see project-overview.mdc).
 */
export const BOOT_SPLASH_LOGO_SRC = '/evairsim-splash-logo.png';

/** Total splash hold (matches `--boot-ms` on shell + `.boot-progress-inner` in app.css). */
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

/**
 * Dark restrained welcome: transparent logo, soft bloom behind, single progress line.
 * Reduced-motion variants live in app.css.
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
            className="boot-splash-shell relative fixed inset-0 z-[2147483646] flex flex-col items-center justify-center overflow-hidden px-6"
            role="status"
            aria-live="polite"
            aria-busy="true"
            style={{ '--boot-ms': `${BOOT_SPLASH_DURATION_MS_DEFAULT}ms` } as React.CSSProperties}
        >
            <span className="sr-only">{t('app.boot_splash_sr')}</span>

            <div className="boot-splash-aura" aria-hidden />

            <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
                <div className="boot-logo-stack relative w-full">
                    <span className="boot-logo-bloom" aria-hidden />
                    <img
                        src={BOOT_SPLASH_LOGO_SRC}
                        alt=""
                        width={1024}
                        height={266}
                        className="boot-logo-mark boot-logo-reveal relative z-[1] mx-auto block h-auto max-h-[min(200px,34vh)] w-full max-w-[min(520px,calc(100vw-2rem))] object-contain object-center"
                        draggable={false}
                        decoding="async"
                        fetchPriority="high"
                    />
                </div>

                <div className="boot-progress-track mt-[clamp(2.5rem,8vh,3.75rem)]" aria-hidden>
                    <div className="boot-progress-inner" />
                </div>

                <p className="boot-splash-tag mt-10 text-center text-[10px] font-medium uppercase tracking-[0.35em] text-white/38 sm:text-[11px]">
                    {t('marketing.home_badge')}
                </p>
            </div>
        </div>
    );
}
