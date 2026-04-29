import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/** Fullscreen boot splash MUST use app icon art — `/evairsim-brand-icon.png` — NOT the horizontal `evairsim-logo.png` wordmark/banner (see `.cursor/rules/project-overview.mdc`). */
export const BOOT_SPLASH_ICON_SRC = '/evairsim-brand-icon.png';

/**
 * Splash visible duration (~3.5 s feels substantial for brand moment before shell mounts).
 * Adjust here only—matches CSS ring rhythm via `BOOT_SIGNAL_LOOP_S` below.
 */
export const BOOT_SPLASH_DURATION_MS_DEFAULT = 3400;
/** Shorter when prefers-reduced-motion. */
export const BOOT_SPLASH_DURATION_MS_REDUCED = 920;

/** Keep CSS ring loop length in sync (~one full ripple cycle reads “complete”). */
export const BOOT_SIGNAL_LOOP_S = 2.55;

/**
 * Skip the full-screen splash (`?nosplash=1`). Every normal reload runs splash again
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
 * Brand **app-icon** raster + oversized expanding rings (moving signal below mark).
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
            className="fixed inset-0 z-[2147483646] flex flex-col items-center justify-center bg-gradient-to-b from-white via-white to-[#f4f6f9] px-4"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">{t('app.boot_splash_sr')}</span>
            <div className="relative flex w-full max-w-lg flex-col items-center">
                <img
                    src={BOOT_SPLASH_ICON_SRC}
                    alt=""
                    width={800}
                    height={670}
                    className="relative z-[2] mx-auto h-auto max-h-[min(320px,calc(50vh))] w-full max-w-[min(440px,calc(100vw-2rem))] object-contain drop-shadow-[0_12px_40px_-8px_rgba(255,102,0,0.18)]"
                    draggable={false}
                    decoding="async"
                    fetchPriority="high"
                />

                {/* Large sonar rings — scaled for impact; synced to BOOT_SIGNAL_LOOP_S in app.css */}
                <div
                    className="boot-signal-stage pointer-events-none relative z-[1] -mt-[10%] flex h-[min(18rem,44vw)] w-full max-w-none shrink-0 items-center justify-center sm:h-[min(22rem,50vw)] lg:max-w-xl"
                    style={{ '--boot-loop': `${BOOT_SIGNAL_LOOP_S}s` } as React.CSSProperties}
                    aria-hidden
                >
                    <span className="boot-signal-hub" />
                    <span className="boot-signal-ring" />
                    <span className="boot-signal-ring" />
                    <span className="boot-signal-ring" />
                    <span className="boot-signal-ring" />
                </div>
            </div>
        </div>
    );
}
