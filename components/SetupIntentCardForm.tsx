/**
 * SetupIntentCardForm
 *
 * Inline card-on-file collector. Mints a Stripe SetupIntent via the
 * Laravel `/app/payments/setup-intent` endpoint, mounts a Stripe Card
 * Element, confirms the SetupIntent on submit, and bubbles the
 * resulting `pm_…` back to the parent.
 *
 * Why a fresh component instead of extending `StripePaymentModal`?
 *   - The modal is built around `confirmCardPayment` (PaymentIntent).
 *     SetupIntent uses `confirmCardSetup` with subtly different args.
 *   - The Activation Funnel renders this *inline* in the page, not in
 *     a popup. The modal's full-screen overlay would obscure the
 *     plan summary the customer just signed off on.
 *   - Decoupling lets us swap to Stripe Payment Element (which
 *     supports BNPL / Apple Pay / etc) later without rewriting the
 *     payment-modal's recharge flow.
 *
 * The publishable key is preferred from the SetupIntent response (so
 * test/live always match the backend), falling back to the Vite env
 * for local dev where the backend hasn't been configured yet.
 *
 * @see docs/ACTIVATION_FUNNEL.md §6 — SetupIntent flow
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Stripe, StripeCardElement } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { paymentService } from '../services/api/payment';

export interface SetupIntentCardFormProps {
  /** Echoed onto the SetupIntent metadata so support can correlate. */
  iccid?: string;
  /** Called when the card has been confirmed and a `pm_…` is available. */
  onPaymentMethod: (paymentMethodId: string, customerId: string) => void;
  /** Allow the parent to reset/cancel mid-flow. */
  onCancel?: () => void;
  /** Optional CTA copy override — default: "Save card for auto-renew". */
  ctaLabel?: string;
}

type Phase =
  | { kind: 'minting' }
  | { kind: 'mint_failed'; message: string }
  | { kind: 'ready' }
  | { kind: 'confirming' }
  | { kind: 'confirmed' }
  | { kind: 'confirm_failed'; message: string };

const SetupIntentCardForm: React.FC<SetupIntentCardFormProps> = ({
  iccid,
  onPaymentMethod,
  onCancel,
  ctaLabel = 'Save card for auto-renew',
}) => {
  const [phase, setPhase] = useState<Phase>({ kind: 'minting' });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);

  // ── Step 1: mint the SetupIntent the moment the form mounts.
  //   Doing it eagerly (rather than on submit) means the card iframe
  //   is already responsive when the customer reaches it; saves a
  //   noticeable fraction of a second on activation.
  useEffect(() => {
    let cancelled = false;

    const mintAndBoot = async () => {
      setPhase({ kind: 'minting' });
      setCardError(null);

      let session: Awaited<ReturnType<typeof paymentService.createSetupIntent>>;
      try {
        session = await paymentService.createSetupIntent(iccid ? { iccid } : {});
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unable to start the payment setup flow.';
        setPhase({ kind: 'mint_failed', message });
        return;
      }

      if (cancelled) return;

      // The publishable key flows from the backend so the H5 can never
      // accidentally pair a live key with a test SetupIntent. The
      // Vite env var is the local-dev fallback only.
      const publishableKey =
        session.publishableKey ?? (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined);

      if (!publishableKey) {
        setPhase({
          kind: 'mint_failed',
          message: 'Stripe publishable key is not configured.',
        });
        return;
      }

      const stripe = await loadStripe(publishableKey);
      if (cancelled) return;

      if (!stripe) {
        setPhase({ kind: 'mint_failed', message: 'Stripe.js failed to load.' });
        return;
      }

      stripeRef.current = stripe;
      setClientSecret(session.clientSecret);
      setPhase({ kind: 'ready' });
    };

    mintAndBoot();

    return () => {
      cancelled = true;
    };
  }, [iccid]);

  // ── Step 2: mount the Card Element once Stripe.js is ready.
  useEffect(() => {
    if (phase.kind !== 'ready' || !cardContainerRef.current || !stripeRef.current) return;

    const elements = stripeRef.current.elements();
    const card = elements.create('card', {
      hidePostalCode: false,
      style: {
        base: {
          fontSize: '16px',
          color: '#0f172a',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          '::placeholder': { color: '#94a3b8' },
        },
        invalid: { color: '#ef4444', iconColor: '#ef4444' },
      },
    });

    card.mount(cardContainerRef.current);
    cardElementRef.current = card;

    card.on('change', (event) => {
      setCardError(event.error?.message ?? null);
    });

    return () => {
      card.unmount();
      cardElementRef.current = null;
    };
  }, [phase.kind]);

  // ── Step 3: confirm the SetupIntent on submit.
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripeRef.current || !cardElementRef.current || !clientSecret) return;
      setPhase({ kind: 'confirming' });
      setCardError(null);

      try {
        const { error, setupIntent } = await stripeRef.current.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElementRef.current,
          },
        });

        if (error) {
          setCardError(error.message ?? 'Could not save the card.');
          setPhase({ kind: 'confirm_failed', message: error.message ?? 'Could not save the card.' });
          return;
        }

        // Stripe surfaces `setupIntent.payment_method` as either a
        // string id or a hydrated PaymentMethod object depending on
        // expansion. We only need the id, so coerce.
        const pmRaw = setupIntent?.payment_method;
        const pmId = typeof pmRaw === 'string' ? pmRaw : pmRaw?.id;
        const customerId =
          typeof setupIntent?.customer === 'string' ? setupIntent.customer : setupIntent?.customer?.id ?? '';

        if (!pmId) {
          const msg = 'Stripe accepted the card but did not return a payment method id.';
          setCardError(msg);
          setPhase({ kind: 'confirm_failed', message: msg });
          return;
        }

        setPhase({ kind: 'confirmed' });
        onPaymentMethod(pmId, customerId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unexpected payment error.';
        setCardError(message);
        setPhase({ kind: 'confirm_failed', message });
      }
    },
    [clientSecret, onPaymentMethod],
  );

  // ── Render branches ─────────────────────────────────────────────────

  if (phase.kind === 'minting') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-orange-500" />
        <p className="mt-3 text-sm text-slate-600">Setting up secure card entry…</p>
      </div>
    );
  }

  if (phase.kind === 'mint_failed') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="mb-3 flex items-center gap-2 text-red-700">
          <AlertTriangle size={18} />
          <span className="text-sm font-semibold">Couldn't start payment setup</span>
        </div>
        <p className="text-sm text-red-700">{phase.message}</p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300"
          >
            Skip auto-renew for now
          </button>
        )}
      </div>
    );
  }

  if (phase.kind === 'confirmed') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 size={18} />
        <span className="text-sm font-medium">Card saved — finishing activation…</span>
      </div>
    );
  }

  const isConfirming = phase.kind === 'confirming';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <CreditCard size={16} className="text-slate-500" />
        Card details
      </label>
      <div
        ref={cardContainerRef}
        className="rounded-lg border border-slate-300 bg-white px-3 py-3 transition focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200"
      />
      {cardError && <p className="text-xs text-red-600">{cardError}</p>}
      {import.meta.env.DEV && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <strong>Test card:</strong> 4242 4242 4242 4242 · 12/30 · 123 · 10001
        </p>
      )}

      <button
        type="submit"
        disabled={isConfirming || phase.kind !== 'ready'}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
      >
        {isConfirming ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Saving card…
          </>
        ) : (
          <>{ctaLabel}</>
        )}
      </button>
      {onCancel && !isConfirming && (
        <button
          type="button"
          onClick={onCancel}
          className="block w-full text-center text-xs text-slate-500 hover:text-slate-700"
        >
          Skip auto-renew for now
        </button>
      )}
      <p className="pt-1 text-center text-[11px] text-slate-400">Secured by Stripe · No charge today</p>
    </form>
  );
};

export default SetupIntentCardForm;
