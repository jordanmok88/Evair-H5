/**
 * Click gate for the marketing-site "OPEN APP" CTA.
 *
 * The link points at `/app`. On mobile devices that's
 * a great destination — the H5 customer app renders fullscreen. On
 * desktop the same URL renders inside a 430×880 phone-mock, which is a
 * brand showcase for browsing the dashboard but a frustrating
 * sign-in surface (tiny form floating in a sea of grey).
 *
 * This hook centralises the "intercept on desktop, show a notice
 * instead" behaviour so both call sites — `views/MarketingPage.tsx`
 * (apex header) and `components/marketing/SiteHeader.tsx` (every
 * other public surface) — share the same logic without drift.
 *
 * Behaviour summary:
 *
 *   - Mobile **browser UA** click → fall through to <a href="/app"> (no-op).
 *     (Viewport width is ignored here so narrow desktop windows still get the modal.)
 *   - Desktop click, not acked → preventDefault + open the modal.
 *   - Desktop click, acked     → fall through to <a href="/app">. We
 *                                respect the customer-support escape
 *                                hatch so people who *need* desktop
 *                                aren't nagged forever.
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

const ACK_STORAGE_KEY = 'evair_desktop_signin_acked.v1';

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
     * Customer chose "continue on desktop anyway" — record the ack
     * and navigate to /app. Wire to modal's tertiary button.
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
            if (isMobileUserAgentClient()) return;
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
        if (typeof window !== 'undefined') {
            window.location.assign(appPath);
        }
    }, [appPath]);

    return { open, gateClick, onClose, onContinueAnyway };
}
