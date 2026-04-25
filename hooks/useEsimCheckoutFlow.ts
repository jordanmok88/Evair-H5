/**
 * useEsimCheckoutFlow — shared post-Stripe-redirect handler.
 *
 * Mirrors the inline logic in `views/ShopView.tsx` (the mobile shop)
 * so any page that initiates Stripe Checkout for an eSIM (mobile shop,
 * desktop `/travel-esim/{country}` page, etc.) can react to the
 * `?stripe_status=…&session_id=…` callback in a uniform way.
 *
 * On mount the hook:
 *   1. Reads `stripe_status` + `session_id` from `window.location.search`.
 *      Idle if absent.
 *   2. If `cancelled` → phase = 'cancelled' and clean the URL.
 *   3. If `success`:
 *        a. Pull `pending_esim_order` from localStorage (written by the
 *           page that initiated Stripe Checkout). Idempotency: we delete
 *           the entry as soon as we read it so a hard refresh after
 *           success will NOT re-order the eSIM (we'd be billed again
 *           and the customer would receive a duplicate QR).
 *        b. POST `/api/stripe-verify` and bail unless `paid === true`.
 *        c. Call `dataService.orderEsim(...)` to provision.
 *        d. Fire-and-forget POST `/.netlify/functions/send-esim-email`.
 *   4. `history.replaceState` to strip query params so refreshing the
 *      success screen is safe.
 *
 * Exposed state:
 *   - phase: lifecycle marker the UI uses to render verify spinner /
 *     success screen / error toast.
 *   - result: provisioned eSIM (QR, LPA, ICCID) once orderEsim resolves.
 *   - pending: the original pending-order envelope (for packageName,
 *     email — useful in the success UI even if `result` lacks them).
 *   - emailSent: surfaces a "Details also sent to {email}" affordance.
 *   - error: human-readable error to show on the page.
 *
 * Usage:
 *   const flow = useEsimCheckoutFlow();
 *   if (flow.phase === 'success') return <DesktopEsimSuccess result={...} />;
 *   if (flow.phase === 'error') return <ErrorBanner message={flow.error} />;
 *
 * Pure: no JSX, no router, no toast lib — caller decides UX.
 */

import { useEffect, useState } from 'react';
import type { EsimOrderResult } from '../types';
import { orderEsim } from '../services/dataService';

export type CheckoutPhase =
    | 'idle'
    | 'cancelled'
    | 'verifying'
    | 'provisioning'
    | 'success'
    | 'error';

export interface PendingEsimOrder {
    packageCode: string;
    transactionId: string;
    amount: number;
    email?: string;
    packageName?: string;
    sessionId?: string;
    /** ISO-2 (lower) the customer was browsing — used by the success UI. */
    countryCode?: string;
}

export interface EsimCheckoutFlowState {
    phase: CheckoutPhase;
    result: EsimOrderResult | null;
    pending: PendingEsimOrder | null;
    emailSent: boolean;
    error: string | null;
    /** Reset to idle (e.g. after the user dismisses an error). */
    reset: () => void;
}

const PENDING_KEY = 'pending_esim_order';

function readPending(): PendingEsimOrder | null {
    const raw = typeof window === 'undefined'
        ? null
        : localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as PendingEsimOrder;
    } catch (err) {
        console.error('[useEsimCheckoutFlow] pending_esim_order corrupt', err);
        try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
        return null;
    }
}

function cleanUrl(): void {
    if (typeof window === 'undefined') return;
    try {
        const cleanPath = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', cleanPath);
    } catch { /* ignore */ }
}

export function useEsimCheckoutFlow(): EsimCheckoutFlowState {
    const [phase, setPhase] = useState<CheckoutPhase>('idle');
    const [result, setResult] = useState<EsimOrderResult | null>(null);
    const [pending, setPending] = useState<PendingEsimOrder | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const stripeStatus = params.get('stripe_status');
        const sessionId = params.get('session_id');

        if (!stripeStatus) return;

        if (stripeStatus === 'cancelled' || stripeStatus === 'cancel') {
            setPhase('cancelled');
            cleanUrl();
            return;
        }

        if (stripeStatus !== 'success' || !sessionId) {
            cleanUrl();
            return;
        }

        const pendingOrder = readPending();
        if (!pendingOrder) {
            // Money was taken but we lost the order envelope — surface a
            // recoverable error instead of silently retrying or freezing.
            setPhase('error');
            setError(
                'We could not match your payment to a pending order. Please contact support — your card was charged.',
            );
            cleanUrl();
            return;
        }

        setPending(pendingOrder);
        try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
        cleanUrl();

        let cancelled = false;

        (async () => {
            setPhase('verifying');
            setError(null);
            try {
                const verifyRes = await fetch('/api/stripe-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                });
                const verifyData = await verifyRes.json().catch(() => ({}));
                if (cancelled) return;

                if (!verifyData?.paid) {
                    setPhase('error');
                    setError('Payment not confirmed. Please contact support.');
                    return;
                }

                setPhase('provisioning');
                const orderResult = await orderEsim({
                    packageCode: pendingOrder.packageCode,
                    transactionId: pendingOrder.transactionId,
                    amount: pendingOrder.amount,
                });
                if (cancelled) return;

                setResult(orderResult);
                setPhase('success');

                if (pendingOrder.email) {
                    fetch('/.netlify/functions/send-esim-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: pendingOrder.email,
                            qrCodeUrl: orderResult.qrCodeUrl,
                            smdpAddress: orderResult.smdpAddress,
                            activationCode: orderResult.activationCode,
                            lpaString: orderResult.lpaString,
                            orderNo: orderResult.orderNo,
                            packageName: pendingOrder.packageName,
                            iccid: orderResult.iccid,
                        }),
                    })
                        .then(r => { if (!cancelled && r.ok) setEmailSent(true); })
                        .catch(() => { /* email is best-effort */ });
                }
            } catch (err) {
                if (cancelled) return;
                console.error('[useEsimCheckoutFlow] post-payment error', err);
                setPhase('error');
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Payment succeeded but eSIM order failed. Please contact support.',
                );
            }
        })();

        return () => { cancelled = true; };
    }, []);

    return {
        phase,
        result,
        pending,
        emailSent,
        error,
        reset: () => {
            setPhase('idle');
            setError(null);
        },
    };
}
