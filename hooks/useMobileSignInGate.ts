/**
 * Click gate for the marketing-site "OPEN APP" CTA.
 *
 * The link points at `/app`. Narrow viewports render the handset shell
 * fullscreen. From **`md` (768px)** the in-app chrome goes full-width (see
 * `APP_WIDE_LAYOUT_MIN_PX` in App.tsx — no centred phone bezel).
 *
 * This hook centralises the "intercept on desktop, show a notice
 * instead" behaviour so both call sites — `views/MarketingPage.tsx`
 * (apex header) and `components/marketing/SiteHeader.tsx` (every
 * other public surface) — share the same logic without drift.
 *
 * Behaviour summary:
 *
 *   - **Mobile-width viewport** (< `md` / 768px) **and** handset-like UA (or
 *     Client Hints `mobile: true`) → fall through to `/app` (no modal).
 *   - **Tablet/desktop width** (`min-width: 768px`) → **always** show the QR modal
 *     when not acked, even if UA looks like a phone (fixes DevTools emulation,
 *     embedded browsers, odd corporate UAs).
 *   - Narrow viewport (<768): not acked → preventDefault + modal, **unless**
 *     the session looks like a handset (see `shouldSkipOpenAppQrModal`).
 *   - Acked (`Continue on desktop anyway`) → fall through to `/app` without modal;
 *     they stay on the current marketing URL until then; next OPEN APP goes straight into the shell.
 *
 * The dismissal flag is stored in localStorage with a versioned key so
 * we can invalidate it later (e.g. when we ship a real desktop
 * sign-in form) without writing a migration. Falsy/exception reads are
 * treated as "not acked" — privacy-mode browsers and corp-managed
 * Edge installs that disable storage still see the friendly notice.
 */

import { useCallback, useState } from 'react';
import type React from 'react';
import { isMobileUserAgentClient } from '../utils/device';

/** Must match App.tsx APP_WIDE_LAYOUT_MIN_PX (`md` / 768px). */
const DESKTOP_GATE_MIN_PX = 768;

/** v2 — reset with 2026-05 QR gate fix (wide viewport always shows modal). */
const ACK_STORAGE_KEY = 'evair_desktop_signin_acked.v2';

function shouldSkipOpenAppQrModal(): boolean {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia(`(min-width: ${DESKTOP_GATE_MIN_PX}px)`).matches) return false;
    return isMobileUserAgentClient();
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
 * @param appPath Destination href for the OPEN APP link.
 *                Defaults to `/app` so call sites usually omit it.
 */
export function useMobileSignInGate(appPath: string = '/app'): MobileSignInGate {
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
