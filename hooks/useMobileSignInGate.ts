/**
 * Click gate for the marketing-site "OPEN APP" CTA — **hybrid** detection.
 *
 *   • **`min-width: 768px`** (Tailwind `md`+) → always intercept with the QR modal
 *     first (unless acked). Viewport carries the decision; UA quirks cannot drop
 *     the modal on tablets / desktop Safari at full width.
 *
 *   • **`max-width: 767px`** → **skip** the modal (straight to `/app`) only when
 *     the session looks like a handheld: **`isMobileUserAgentClient()`** (UA-CH
 *     `mobile` when available), **or** primary **`(pointer: coarse)`** with
 *     **`(hover: none)`** (touch-first, no hover device). Narrow **desktop**
 *     windows therefore still get the QR.
 *
 * Trade-off: "Request desktop site" on a phone can show the QR in a skinny window.
 *
 * @see `APP_WIDE_LAYOUT_MIN_PX` in App.tsx (`md` / 768).
 */

import { useCallback, useState } from 'react';
import type React from 'react';
import { isMobileUserAgentClient } from '@/utils/device';

/** Must match App.tsx `APP_WIDE_LAYOUT_MIN_PX` (Tailwind `md`). */
const MOBILE_VIEWPORT_MAX_PX = 767;

/** v3 — bumped when gate semantics changed; hybrid still uses same key after v3. */
const ACK_STORAGE_KEY = 'evair_desktop_signin_acked.v3';

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
