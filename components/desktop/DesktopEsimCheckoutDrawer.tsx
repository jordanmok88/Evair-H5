/**
 * DesktopEsimCheckoutDrawer — slide-in checkout sheet for the desktop
 * `/travel-esim/{country}` page.
 *
 * Owns the moment between "customer clicked a plan" and "redirected to
 * Stripe Checkout":
 *   1. Confirms the plan + price.
 *   2. Captures / pre-fills delivery email (defaults to the logged-in
 *      user's email — login is enforced one layer up).
 *   3. POSTs `/app/orders` to create a PENDING Laravel order (so
 *      Stripe's `checkout.session.completed` webhook can match the
 *      payment back via `payment_intent_data.metadata.order_id`).
 *   4. POSTs `/api/stripe-checkout` with EXPLICIT `successUrl` /
 *      `cancelUrl` so Stripe redirects back to this same desktop page
 *      (not the H5 root), plus the order id/no for webhook linkage.
 *      The success URL is consumed by `useEsimCheckoutFlow` mounted on
 *      `TravelEsimPage`.
 *   5. Stamps `pending_esim_order` (orderId + orderNumber + email + packageName) in
 *      localStorage so `useEsimCheckoutFlow` can poll the order on
 *      return without re-deriving anything from URL params.
 *
 * Provisioning happens server-side via the Stripe webhook; the drawer
 * never calls supplier APIs. The parent's `useEsimCheckoutFlow` polls
 * `/app/orders/{id}` until `OrderProvisioningService` writes the
 * SimAsset and the response exposes the `esim` block.
 */

import React, { useEffect, useState } from 'react';
import {
    X,
    Loader2,
    CreditCard,
    Mail,
    ShieldCheck,
    Calendar,
    Wifi,
} from 'lucide-react';
import type { EsimPackage } from '../../types';
import {
    formatVolume,
    packagePriceUsd,
} from '../../services/dataService';
import { userService, orderService } from '../../services/api';
import { isMobileDevice } from '../../utils/device';

interface DesktopEsimCheckoutDrawerProps {
    open: boolean;
    pkg: EsimPackage | null;
    countryCode: string;     // ISO-2 (lower)
    countryName: string;
    /** Pre-fill email; if omitted we fetch the user profile. */
    customerEmail?: string;
    onClose: () => void;
}

const DesktopEsimCheckoutDrawer: React.FC<DesktopEsimCheckoutDrawerProps> = ({
    open,
    pkg,
    countryCode,
    countryName,
    customerEmail,
    onClose,
}) => {
    const [email, setEmail] = useState(customerEmail ?? '');
    const [agreed, setAgreed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setSubmitting(false);
        setAgreed(false);

        if (customerEmail) {
            setEmail(customerEmail);
            return;
        }

        // Fetch profile lazily so we don't hit the backend until the
        // drawer is actually opened. Login is enforced upstream so a
        // token will be present.
        userService.getProfile()
            .then(p => { if (p?.email) setEmail(p.email); })
            .catch(() => { /* user can type it manually */ });
    }, [open, customerEmail]);

    if (!open || !pkg) return null;

    const priceUsd = packagePriceUsd(pkg);
    const volumeLabel = formatVolume(pkg.volume);
    const packageName = `${countryName} eSIM — ${volumeLabel} / ${pkg.duration} ${pkg.durationUnit === 'MONTH' ? 'Months' : 'Days'}`;

    const handlePay = async () => {
        if (submitting) return;

        // Defensive guard — should never trigger in production because the
        // parent already routes mobile customers to /app/travel-esim/{iso2}
        // before opening the drawer. Belt + braces in case a future caller
        // forgets the device check.
        if (isMobileDevice()) {
            window.location.assign(`/app/travel-esim/${countryCode}`);
            return;
        }

        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address — we send your QR code there.');
            return;
        }
        if (!agreed) {
            setError('Please agree to the Terms of Use & Privacy Policy.');
            return;
        }

        setSubmitting(true);
        setError(null);

        const txnId = `evair_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const origin = window.location.origin;
        const returnPath = `/travel-esim/${countryCode.toLowerCase()}`;
        const successUrl = `${origin}${returnPath}?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}${returnPath}?stripe_status=cancelled`;

        try {
            // Step 1: 后端建 PENDING 单（拿 id + order_no）
            const order = await orderService.createEsimOrder({
                packageCode: pkg.packageCode,
                email,
                quantity: 1,
            });

            // Step 2: 创建 Stripe Checkout Session，把 order_id 透传给 Webhook
            const res = await fetch('/api/stripe-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageName,
                    priceUsd,
                    email,
                    packageCode: pkg.packageCode,
                    transactionId: txnId,
                    countryCode: countryCode.toUpperCase(),
                    orderId: order.id,
                    orderNo: order.orderNumber,
                    userId: undefined, // desktop flow doesn't have user.id handy
                    successUrl,
                    cancelUrl,
                }),
            });

            const text = await res.text();
            let data: { url?: string; sessionId?: string; error?: string; detail?: string };
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('Payment service unavailable. Please try again in a moment.');
            }

            if (!res.ok || !data.url) {
                throw new Error(data.error || data.detail || 'Failed to create payment session.');
            }

            // Same key + shape as mobile ShopView so the shared
            // useEsimCheckoutFlow hook works without branching.
            localStorage.setItem('pending_esim_order', JSON.stringify({
                orderId: order.id,
                orderNo: order.orderNumber,
                packageName,
                email,
                sessionId: data.sessionId,
                countryCode: countryCode.toLowerCase(),
            }));

            window.location.href = data.url;
        } catch (err) {
            console.error('[DesktopEsimCheckoutDrawer] checkout failed', err);
            setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-drawer-title"
        >
            <div
                className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <h2 id="checkout-drawer-title" className="text-lg font-bold text-slate-900">
                        Checkout
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="p-5 space-y-5">
                    {/* Order summary */}
                    <section className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Your eSIM
                        </p>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-extrabold text-slate-900">
                                {countryName}
                            </span>
                            <span className="text-2xl font-extrabold text-orange-600">
                                ${priceUsd.toFixed(2)}
                            </span>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                            <li className="flex items-center gap-2">
                                <Wifi size={14} className="text-slate-400" />
                                {volumeLabel} of high-speed data
                            </li>
                            <li className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                {pkg.duration} {pkg.durationUnit === 'MONTH' ? 'months' : 'days'} from first use
                            </li>
                            <li className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-slate-400" />
                                Instant QR delivery to your email
                            </li>
                        </ul>
                    </section>

                    {/* Email */}
                    <section>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                            Send QR code to
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input
                                type="email"
                                inputMode="email"
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Your QR code, SM-DP+ address and activation code will be emailed
                            here as soon as payment clears.
                        </p>
                    </section>

                    {/* Terms */}
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={e => setAgreed(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-orange-500 rounded"
                        />
                        <span className="text-sm text-slate-600 leading-relaxed">
                            I agree to the{' '}
                            <a href="/legal/terms" className="text-orange-600 font-semibold hover:underline">
                                Terms of Use
                            </a>{' '}
                            and{' '}
                            <a href="/legal/privacy" className="text-orange-600 font-semibold hover:underline">
                                Privacy Policy
                            </a>
                            . eSIM purchases are non-refundable once provisioned.
                        </span>
                    </label>

                    {error && (
                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Pay */}
                    <button
                        type="button"
                        onClick={handlePay}
                        disabled={submitting}
                        className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Redirecting to secure checkout…
                            </>
                        ) : (
                            <>
                                <CreditCard size={18} />
                                Pay ${priceUsd.toFixed(2)} with card
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <ShieldCheck size={14} />
                        Secured by Stripe · Cards processed in the US
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesktopEsimCheckoutDrawer;
