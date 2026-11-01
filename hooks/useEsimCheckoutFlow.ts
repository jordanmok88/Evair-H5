/**
 * useEsimCheckoutFlow — shared post-Stripe-redirect handler.
 *
 * Mirrors the inline logic in `views/ShopView.tsx` (the mobile shop)
 * so any page that initiates Stripe Checkout for an eSIM (mobile shop,
 * desktop `/travel-esim/{country}` page, etc.) can react to the
 * `?stripe_status=…` callback in a uniform way.
 *
 * On mount the hook:
 *   1. Reads `stripe_status` from `window.location.search`.
 *      Idle if absent.
 *   2. If `cancelled` → phase = 'cancelled' and clean the URL.
 *   3. If `success`:
 *        a. Pull `pending_esim_order` from localStorage (written by the
 *           page that initiated Stripe Checkout). Idempotency: we delete
 *           the entry as soon as we read it so a hard refresh after
 *           success will NOT re-trigger provisioning. The QR shown after
 *           that refresh comes from a session snapshot scoped to this
 *           country (see `utils/esimCheckoutSuccessCache.ts`).
 *        b. Poll `GET /app/orders/{id}` via
 *           `pollEsimOrderUntilProvisioned` until the backend webhook
 *           has finished provisioning (esim field present).
 *        c. Fire-and-forget POST `/app/email/esim-delivery` through Laravel.
 *   4. `history.replaceState` to strip query params so refreshing the
 *      success screen is safe.
 *
 * Exposed state:
 *   - phase: lifecycle marker the UI uses to render verify spinner /
 *     success screen / error toast.
 *   - result: provisioned eSIM (QR, LPA, ICCID) once poll resolves.
 *   - pending: the original pending-order envelope (for packageName,
 *     email — useful in the success UI even if `result` lacks them).
 *   - emailSent: surfaces a "Details also sent to {email}" affordance.
 *   - error: human-readable error to show on the page.
 *
 * Usage:
 *   const flow = useEsimCheckoutFlow(countryCode);
 *   if (flow.phase === 'success') return <DesktopEsimSuccess result={...} />;
 *   if (flow.phase === 'error') return <ErrorBanner message={flow.error} />;
 *
 * Pure: no JSX, no router, no toast lib — caller decides UX.
 */

import { useEffect, useState } from 'react';
import type { EsimOrderResult } from '../types';
import { emailService } from '../services/api';
import { pollEsimOrderUntilProvisioned } from '../services/api/order';
import {
    checkoutCountriesMatch,
    clearEsimCheckoutSuccessCache,
    ESIM_CHECKOUT_SUCCESS_CACHE_KEY,
    readCheckoutNavigationKind,
    shouldDiscardCheckoutSuccess,
    shouldRestoreCheckoutSuccess,
} from '../utils/esimCheckoutSuccessCache';

export type CheckoutPhase =
    | 'idle'
    | 'cancelled'
    | 'verifying'
    | 'provisioning'
    | 'success'
    | 'error';

export interface PendingEsimOrder {
    /** Order ID (numeric) from POST /app/orders — used to poll order detail */
    orderId?: number;
    /** Order number string from POST /app/orders — for display / email */
    orderNo?: string;
    packageName?: string;
    email?: string;
    countryCode?: string;
    sessionId?: string;
    /** Legacy fields — kept for type compat, no longer written by new flow */
    packageCode?: string;
    transactionId?: string;
    amount?: number;
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

interface SuccessSnapshot {
    result: EsimOrderResult;
    pending: PendingEsimOrder | null;
    emailSent: boolean;
}

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

function readSuccessSnapshot(): SuccessSnapshot | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(ESIM_CHECKOUT_SUCCESS_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as SuccessSnapshot;
    } catch {
        clearEsimCheckoutSuccessCache();
        return null;
    }
}

function writeSuccessSnapshot(snap: SuccessSnapshot): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(ESIM_CHECKOUT_SUCCESS_CACHE_KEY, JSON.stringify(snap));
    } catch { /* quota — ignore */ }
}

function currentNavigationKind() {
    if (typeof performance === 'undefined') return readCheckoutNavigationKind(null);
    const entry = performance.getEntriesByType('navigation')[0] as { type?: string } | undefined;
    return readCheckoutNavigationKind(entry);
}

/**
 * Decide what to show on this document load.
 *
 * A refresh of `/travel-esim/jp` may replay that order's QR. Opening any
 * other travel page, or coming back via a normal link, drops the cached
 * install secrets so they are not shown on the next country — or to the
 * next person who uses the tab after logout.
 */
function initialSuccessSnapshot(activeCountryCode: string | null): SuccessSnapshot | null {
    if (typeof window === 'undefined') return null;
    const stripeStatus = new URLSearchParams(window.location.search).get('stripe_status');
    const nav = currentNavigationKind();
    if (shouldDiscardCheckoutSuccess(nav, stripeStatus)) {
        clearEsimCheckoutSuccessCache();
        return null;
    }
    const snap = readSuccessSnapshot();
    if (!shouldRestoreCheckoutSuccess(nav, stripeStatus, snap?.pending?.countryCode, activeCountryCode)) {
        return null;
    }
    return snap;
}

function cleanUrl(): void {
    if (typeof window === 'undefined') return;
    try {
        const cleanPath = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', cleanPath);
    } catch { /* ignore */ }
}

export function useEsimCheckoutFlow(activeCountryCode: string | null): EsimCheckoutFlowState {
    // Once per document load. Repeating this on render would delete the
    // snapshot the Stripe return writes after it strips `stripe_status`.
    const [initialSnap] = useState(() => initialSuccessSnapshot(activeCountryCode));

    const [phase, setPhase] = useState<CheckoutPhase>(initialSnap ? 'success' : 'idle');
    const [result, setResult] = useState<EsimOrderResult | null>(initialSnap?.result ?? null);
    const [pending, setPending] = useState<PendingEsimOrder | null>(initialSnap?.pending ?? null);
    const [emailSent, setEmailSent] = useState(initialSnap?.emailSent ?? false);
    const [error, setError] = useState<string | null>(null);

    // Same document, different country (history within the travel shell):
    // never keep another order's install QR on screen.
    useEffect(() => {
        if (phase !== 'success') return;
        if (checkoutCountriesMatch(pending?.countryCode, activeCountryCode)) return;
        setPhase('idle');
        setResult(null);
        setPending(null);
        setEmailSent(false);
    }, [activeCountryCode, pending, phase]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const stripeStatus = params.get('stripe_status');

        if (!stripeStatus) return;

        if (stripeStatus === 'cancelled' || stripeStatus === 'cancel') {
            setPhase('cancelled');
            cleanUrl();
            return;
        }

        if (stripeStatus !== 'success') {
            cleanUrl();
            return;
        }

        const pendingOrder = readPending();
        if (!pendingOrder) {
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

        // Legacy entries without orderId can't be fulfilled through the
        // new webhook path — surface a recoverable error.
        if (!pendingOrder.orderId) {
            setPhase('error');
            setError(
                'We could not match your payment to a pending order. Please contact support — your card was charged.',
            );
            return;
        }

        let cancelled = false;

        (async () => {
            setPhase('verifying');
            setError(null);
            try {
                // Poll until the backend webhook has finished provisioning.
                // The webhook (checkout.session.completed → OrderProvisioningService)
                // creates the SimAsset; pollEsimOrderUntilProvisioned waits until
                // OrderDetailResource exposes the esim block.
                setPhase('provisioning');
                const order = await pollEsimOrderUntilProvisioned(pendingOrder.orderId!, {
                    intervalMs: 3000,
                    maxAttempts: 40,
                    isCancelled: () => cancelled,
                });

                if (cancelled) return;

                const esim = order.esim;
                if (!esim) {
                    setPhase('error');
                    setError(
                        "Payment received — your eSIM is still being prepared. Check My SIMs in a moment.",
                    );
                    return;
                }

                const orderResult: EsimOrderResult = {
                    orderNo: order.orderNumber,
                    transactionId: order.payment?.transactionId ?? '',
                    iccid: esim.iccid,
                    smdpAddress: esim.smdpAddress,
                    activationCode: esim.activationCode,
                    qrCodeUrl: esim.qrCodeUrl,
                    shortUrl: '',
                    lpaString: esim.lpaString,
                };

                setResult(orderResult);
                setPhase('success');
                writeSuccessSnapshot({
                    result: orderResult,
                    pending: pendingOrder,
                    emailSent: false,
                });

                if (pendingOrder.email) {
                    emailService.sendEsimDelivery({
                            email: pendingOrder.email,
                            qrCodeUrl: esim.qrCodeUrl,
                            smdpAddress: esim.smdpAddress,
                            activationCode: esim.activationCode,
                            lpaString: esim.lpaString,
                            orderNo: order.orderNumber,
                            packageName: pendingOrder.packageName,
                            iccid: esim.iccid,
                    })
                        .then(r => {
                            if (cancelled || !r.success) return;
                            setEmailSent(true);
                            writeSuccessSnapshot({
                                result: orderResult,
                                pending: pendingOrder,
                                emailSent: true,
                            });
                        })
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
            clearEsimCheckoutSuccessCache();
        },
    };
}
