/**
 * Click gate for the marketing-site "OPEN APP" CTA.
 *
 * Decision is **viewport-only** (no User-Agent):
 *   • `max-width: 767px` (below Tailwind `md`) → real phone-sized window; follow
 *     the link straight to `/app` (no QR modal).
 *   • `min-width: 768px` → tablet, iPad, resized desktop — always intercept with
 *     the QR modal first (unless the visitor already chose "open app next time").
 *
 * That matches Jordan's rule: everything except a narrow "mobile" band shows the QR.
 *
 * @see `APP_WIDE_LAYOUT_MIN_PX` in App.tsx (`md` / 768 — same split for `/app` chrome).
 */

import { useCallback, useState } from 'react';
import type React from 'react';

/** Must match App.tsx `APP_WIDE_LAYOUT_MIN_PX` (Tailwind `md`). */
const MOBILE_VIEWPORT_MAX_PX = 767;

/** v3 — viewport-only gate; clears older ack keys so QR is not stuck off. */
const ACK_STORAGE_KEY = 'evair_desktop_signin_acked.v3';

function isNarrowMobileViewport(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${MOBILE_VIEWPORT_MAX_PX}px)`).matches;
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
            if (isNarrowMobileViewport()) return;
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
