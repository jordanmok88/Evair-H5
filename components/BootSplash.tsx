import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/** Shown once per browser tab session; duration ~ brand intro before main UI mounts. */
const SPLASH_DURATION_MS_DEFAULT = 1650;
const SPLASH_DURATION_MS_REDUCED = 550;

const SESSION_SEEN_KEY = 'evair_boot_splash_seen_v1';

export function splashAlreadySeen(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        if (sessionStorage.getItem(SESSION_SEEN_KEY) === '1') return true;
        return new URLSearchParams(window.location.search).has('nosplash');
    } catch {
        return true;
    }
}

export function markSplashSeen(): void {
    try {
        sessionStorage.setItem(SESSION_SEEN_KEY, '1');
    } catch {
        /* ignore quota / privacy mode */
    }
}

interface BootSplashProps {
    onFinish: () => void;
}

/**
 * Full-viewport logo + rhythmic expanding rings (“signal”).
 * ~1–2 s; lighter timeout under prefers-reduced-motion.
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
        const ms = prefersReduced ? SPLASH_DURATION_MS_REDUCED : SPLASH_DURATION_MS_DEFAULT;

        const id = window.setTimeout(() => {
            if (finished.current) return;
            finished.current = true;
            markSplashSeen();
            onFinish();
        }, ms);
        return () => window.clearTimeout(id);
    }, [onFinish]);

    return (
        <div
            className="fixed inset-0 z-[2147483646] flex flex-col items-center justify-center bg-white"
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
