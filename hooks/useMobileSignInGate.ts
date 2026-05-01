/**
 * Desktop QR experience for Evair (shared ack **`evair_desktop_signin_acked.v4`**):
 *
 * 1. **Marketing OPEN APP** — hybrid click gate (`useMobileSignInGate`).
 * 2. **`/app` shell** — same modal auto-opens for wide viewport + `(hover:hover)` +
 *    `(pointer:fine)` (`useCustomerAppDesktopQr`; see `shouldAutoPromptQrOnCustomerApp`).
 *
 * Marketing OPEN APP specifics:
 *
 * - **`min-width: 768px`**: intercept with QR unless acked (viewport-led so wide Safari keeps the modal).
 * - **`max-width: 767px`**: skip when handheld (`isMobileUserAgentClient` or coarse pointer + `(hover:none)`).
 *
 * Trade-off: "Request desktop site" on a phone can surface the QR on OPEN APP taps.
 *
 * @see `APP_WIDE_LAYOUT_MIN_PX` in App.tsx (`md` / 768).
 */

import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import { isMobileUserAgentClient } from '@/utils/device';
import {
    isAppPath,
    isAppPreviewHash,
    runningInsideNativeApp,
} from '@/utils/testMode';

/** Must match App.tsx `APP_WIDE_LAYOUT_MIN_PX` (Tailwind `md`). */
const MOBILE_VIEWPORT_MAX_PX = 767;

/** v4 — adds `/app` auto QR; resets prior acks so desktop visitors see the modal again. */
const ACK_STORAGE_KEY = 'evair_desktop_signin_acked.v4';

function isNarrowMobileViewport(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${MOBILE_VIEWPORT_MAX_PX}px)`).matches;
}

/** True → follow `href` to `/app` without opening `MobileOnlyNotice`. */
function shouldSkipOpenAppQrModal(): boolean {
    if (!isNarrowMobileViewport()) return false;
    if (isMobileUserAgentClient()) return true;
    try {
        const coarse = window.matchMedia?.('(pointer: coarse)')?.matches === true;
        const noHover = window.matchMedia?.('(hover: none)')?.matches === true;
        if (coarse && noHover) return true;
    } catch {
        /* matchMedia unsupported */
    }
    return false;
}

function readAck(): boolean {
    try {
        return typeof window !== 'undefined' &&
            window.localStorage?.getItem(ACK_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeAck(): void {
    try {
        window.localStorage?.setItem(ACK_STORAGE_KEY, '1');
    } catch {
        /* no-op — privacy-mode or storage-disabled environments */
    }
}

/** True when primary input matches desktop browsers — excludes phones/tablets (`hover:none`, coarse pointer). */
function looksLikeDesktopPointerEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return (
            window.matchMedia('(hover: hover)').matches &&
            window.matchMedia('(pointer: fine)').matches
        );
    } catch {
        return !isMobileUserAgentClient();
    }
}

/**
 * Auto-open **`MobileOnlyNotice`** when the functional shell loads under **`/app`**
 * on a wide, desktop-pointer session. Marketing **`OPEN APP`** click uses the same modal + ack key.
 *
 * Native WebView (`evair.isNative`), **`#app-preview`**, handheld viewports (&lt;768), and
 * touch-primary devices are excluded — real phones opening `/app` in landscape stay uninterrupted.
 */
export function shouldAutoPromptQrOnCustomerApp(): boolean {
    if (typeof window === 'undefined') return false;
    if (!isAppPath()) return false;
    if (runningInsideNativeApp()) return false;
    if (isAppPreviewHash()) return false;
    if (readAck()) return false;
    if (!window.matchMedia(`(min-width: ${MOBILE_VIEWPORT_MAX_PX + 1}px)`).matches) return false;
    if (!looksLikeDesktopPointerEnvironment()) return false;
    return true;
}

/**
 * Mounted only from **`CustomerApp`**: pops the QR dialog when **`shouldAutoPromptQrOnCustomerApp()`**
 * is true; keeps it in sync on breakpoint / hover capability changes while the shell is mounted.
 */
export function useCustomerAppDesktopQr(): Pick<
    MobileSignInGate,
    'open' | 'onClose' | 'onContinueAnyway'
> {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        function evaluate(): void {
            setOpen(shouldAutoPromptQrOnCustomerApp());
        }

        evaluate();

        const mqs = [
            `(min-width: ${MOBILE_VIEWPORT_MAX_PX + 1}px)` as const,
            '(hover: hover)' as const,
            '(pointer: fine)' as const,
        ].map((q) => window.matchMedia(q));

        mqs.forEach((mq) => mq.addEventListener('change', evaluate));
        window.addEventListener('storage', evaluate);

        return () => {
            mqs.forEach((mq) => mq.removeEventListener('change', evaluate));
            window.removeEventListener('storage', evaluate);
        };
    }, []);

    const onClose = useCallback(() => {
        setOpen(false);
    }, []);

    const onContinueAnyway = useCallback(() => {
        writeAck();
        setOpen(false);
    }, []);

    return { open, onClose, onContinueAnyway };
}

export interface MobileSignInGate {
    /** Whether the modal is currently open. */
    open: boolean;
    /** Bind to the OPEN APP <a onClick>. */
    gateClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    /** Dismiss without proceeding. Wire to modal's "Got it" / X / backdrop. */
    onClose: () => void;
    /**
     * "Continue on desktop anyway" — persist ack, close modal, **stay on the
     * current page** (no redirect). Next OPEN APP opens `/app` normally.
     */
    onContinueAnyway: () => void;
}

/**
 * @param _appPath Reserved for future routing; destination is the link `href`.
 */
export function useMobileSignInGate(_appPath: string = '/app'): MobileSignInGate {
    const [open, setOpen] = useState(false);

    const gateClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (shouldSkipOpenAppQrModal()) return;
            if (readAck()) return;
            e.preventDefault();
            setOpen(true);
        },
        [],
    );

    const onClose = useCallback(() => {
        setOpen(false);
    }, []);

    const onContinueAnyway = useCallback(() => {
        writeAck();
        setOpen(false);
    }, []);

    return { open, gateClick, onClose, onContinueAnyway };
}
