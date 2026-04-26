# Auto-Renew Disclosure — ROSCA + CA SB-313 compliance

> **Status**: draft for Phase 1 · drafted 2026-04-25 · **NOT legal advice**.
> This document is the canonical copy that every Evair surface (H5 activation page, my-sims toggle, transactional email, admin CS modal, terms page) must render verbatim or via i18n keys derived from it. Any deviation must be reviewed by Jordan + outside counsel before shipping.

---

## 1. Why this exists

Evair plans to bill US customers automatically on a monthly cadence for SIM data renewals. That puts the company under two specific bodies of law:

1. **ROSCA** — Restore Online Shoppers' Confidence Act (15 U.S.C. § 8401–8405, federal). The relevant clause for negative-option / auto-renew programs:
   - Disclose **all material terms** of the recurring charge **clearly and conspicuously** **before** obtaining the consumer's billing information.
   - Get **express informed consent** before charging.
   - Provide a **simple mechanism to cancel** the recurring charge.
2. **California SB-313 / California Auto-Renewal Law (ARL)** — Bus. & Prof. Code §§ 17600–17606. Stricter than ROSCA, applies because we sell to California residents:
   - "Clear and conspicuous" disclosure must appear in **visual proximity** (not buried in T&Cs) to the request for consent.
   - **Affirmative consent** required (no pre-checked checkboxes for the auto-renew opt-in itself, **except** if the recurring offer is the **only** offer being made AND clearly disclosed — the bundled-Amazon model fits this).
   - **Acknowledgment**: customer must receive an "acknowledgment" containing the auto-renewal terms, cancellation policy, and how to cancel — sent in a way they can keep (email is fine).
   - **Cancellation parity**: cancellation method must be at least as easy as signup. If signup is online, cancellation must be online too.
   - **Material change notification**: 7–30 days advance notice if we change terms (price, GB, frequency).

We are **also** technically subject to FTC's Negative Option Rule (16 CFR Part 425, "click-to-cancel" rule, in effect since 2025) — disclosures and one-click cancel are now federally mandated, mirroring CA ARL. The copy below is written to satisfy all three.

---

## 2. The pre-purchase disclosure (renders on `/activate` directly above the consent checkbox)

> **English (canonical)**:
>
> By checking the box below, you authorize Evair Digital, Inc. to automatically renew your data plan **after the {N}-day bundled period included with your SIM card**, charging the payment method you provide **{PRICE} {CURRENCY}** every **{INTERVAL}** until you cancel. Your renewal includes **{VOLUME}** of data at our standard speed. We'll send you a reminder email **3 days before** each charge. You can cancel anytime by signing in to **evairdigital.com/app/my-sims** and turning off auto-renew, or by emailing **service@evairdigital.com** — your service will continue until the end of the period you've already paid for. We'll send you a confirmation email if any of these terms change.

Token meanings:

- `{N}` — the bundled period (e.g. `30`)
- `{PRICE}` — first renewal price as stored on the SKU (e.g. `19.99`)
- `{CURRENCY}` — `USD`
- `{INTERVAL}` — `month` (we may add `year` SKUs later)
- `{VOLUME}` — `9 GB` etc., must match what they actually get

**Layout requirement**: this paragraph must be the same font size and color as the surrounding body copy (no fine print). The phrases "automatic renewal", "{PRICE} {CURRENCY} every {INTERVAL}", and "cancel anytime" must be visible **without scrolling** when the consent checkbox is on screen.

---

## 3. The consent checkbox

> **English (canonical)**:
>
> ☐ Yes, automatically renew my plan and charge my payment method as described above.

**Pre-checked vs unchecked**: California ARL §17602(b)(2)(A) historically required an unchecked box, but a 2018 amendment carved out an exception when the consumer has already affirmatively chosen the auto-renew offer. Because Amazon listings will explicitly market the SIM as "with auto-renew included", the consumer's purchase action is the affirmative consent and we may **pre-check** this box on the activation page. **However**, we should still allow them to uncheck it — never gray it out.

**Defensive default**: pre-check ON for the bundled-Amazon SKU activation page. Pre-check OFF on the in-app `/app/my-sims` toggle (where it's a fresh decision, not flowing from a purchase). For the standalone web `/top-up` flow, leave OFF — that flow doesn't have the Amazon-listing context.

---

## 4. Post-purchase acknowledgment (transactional email)

Sent immediately after `/sims/claim` succeeds. Subject line: `Welcome to Evair — your SIM is active`.

> **English (canonical body, in addition to welcome content)**:
>
> ## Auto-renewal details
>
> You enrolled in auto-renewal when you activated this SIM. Here's what that means:
>
> - **What renews**: {VOLUME} of data at up to **{SPEED_LABEL}**
> - **How often**: every **{INTERVAL}** ({DURATION_DAYS} days)
> - **How much**: **{PRICE} {CURRENCY}** per renewal
> - **First charge**: **{NEXT_CHARGE_DATE}** (we'll email you 3 days before)
> - **Payment method**: {CARD_BRAND} ending in {CARD_LAST4}
>
> ### Cancel anytime
>
> 1. Sign in at **https://evairdigital.com/app/my-sims**
> 2. Find the SIM ending in `{ICCID_LAST4}`
> 3. Turn off the **Auto-renew** switch
>
> You can also reply to this email or write to **service@evairdigital.com** and we'll cancel within 1 business day. Your service continues through the end of the period you've already paid for.
>
> If we ever change the renewal price, frequency, or what's included, we'll email you at least 7 days in advance with the new terms — and you'll always have the option to cancel before the change takes effect.

This entire block must appear in the email regardless of marketing-email opt-out (transactional, ROSCA-mandated).

---

## 5. The cancellation flow (CA ARL "parity" requirement)

Customer-facing path 1 — **app**:

1. `/app/my-sims`
2. Tap their SIM tile
3. Toggle "Auto-renew" off
4. Confirm the bottom sheet (copy below)

**Confirm sheet copy**:

> Cancel auto-renew?
>
> - Your SIM stays active through **{CURRENT_PERIOD_END}** (the period you've already paid for).
> - We won't charge **{CARD_BRAND} ending in {CARD_LAST4}** again unless you turn auto-renew back on.
> - You'll get a confirmation email at **{EMAIL}**.
>
> [Keep auto-renew]   [Yes, cancel]

After "Yes, cancel" → Laravel sends `AutoRenewCancelledMail` → toggle visually flips to OFF → toast "Auto-renew turned off. Confirmation sent to {email}."

**This must work in 3 taps from the home screen**, including the confirm. CA ARL is explicit — no upsell screens, no "are you sure" loops, no required reasons.

Customer-facing path 2 — **email**:

> Reply to any Evair email with "cancel auto-renew" → support inbox routes it to CS → CS uses admin force-off (§7) within 1 business day → confirmation email sent.

This is the legally-required fallback for users who have lost access to their account.

---

## 6. Confirmation of cancellation (`AutoRenewCancelledMail`)

Subject: `Auto-renew cancelled for your Evair SIM`.

> **English (canonical)**:
>
> Hi {NAME},
>
> We've cancelled auto-renewal for the Evair SIM ending in `{ICCID_LAST4}`.
>
> - **Your service stays active through**: {CURRENT_PERIOD_END}
> - **What happens next**: nothing. We won't charge {CARD_BRAND} ending in {CARD_LAST4} again.
> - **Want to reactivate?** Sign in at **https://evairdigital.com/app/my-sims** any time, or top up directly at **https://evairdigital.com/top-up?iccid={ICCID}**.
>
> If you cancelled by mistake, just turn auto-renew back on in the app — no need to email us.
>
> Reference: cancellation #{CANCELLATION_ID} processed at {TIMESTAMP_UTC}.
>
> — The Evair Team
> service@evairdigital.com

**Reference ID** is a hard ROSCA defense — we can prove the cancellation was processed and confirmed if a customer later disputes a charge.

---

## 7. CS-initiated cancellation (admin force-off)

When a CS rep cancels on a customer's behalf (e.g. customer phoned in), the admin UI shows the modal in `PHASE_1_ACTIVATION.md` §5.3. Three legally-required additions:

1. **Audit log**: who cancelled, when, why, free-text note. Stored in Laravel `auto_renew_cancellation_audit` table for **7 years** minimum.
2. **Confirmation email** to customer is **mandatory** and must be sent regardless of CS preference (no "skip email" option).
3. **Reason code** must be one of: `customer_request_email`, `customer_request_phone`, `payment_dispute`, `fraud_review`, `account_closure`, `other`. Free-text note is on top of the code.

---

## 8. Material change notice (when we change pricing or terms)

If we ever change the renewal price, frequency, or included GB, we must notify enrolled customers **at least 7 days in advance** (CA ARL minimum) — we'll do **30 days** for safety. Email subject: `Important: changes to your Evair auto-renewal`.

The email must include:

- Current terms vs new terms (clear comparison table)
- Effective date of the change
- Their right to cancel before the change takes effect
- One-click link to cancel that doesn't require login (signed token URL good for 30 days)

We do NOT need this for Phase 1 launch — it's only triggered if we change pricing later. Document is here so we don't forget the obligation when we do.

---

## 9. Records retention

| Record | Retention | Why |
|---|---|---|
| Original activation consent (timestamp, IP, user agent, copy version hash) | 7 years | ROSCA / CA ARL "express consent" defense |
| Cancellation events (customer-initiated) | 7 years | Defense against chargebacks / disputes |
| Cancellation events (CS-initiated) with audit note | 7 years | Internal audit + regulator response |
| Material change emails sent | 7 years | Proves we gave required notice |
| Resend message logs (delivery status) | 2 years (Resend default) | Operational debugging; legal events have separate Laravel-side records |

---

## 10. Plain-English version (for marketing pages)

The legal copy above is required where consent is captured. Marketing pages can use this friendlier version (still factually accurate, just less formal):

> ### How auto-renew works
>
> Your SIM comes with **{N} days** of data. After that, we'll automatically charge your card and renew your plan so your service never drops. Same data, same speed, same price every month. We send you a reminder 3 days before every charge — and you can cancel any time in the app or by emailing us. **It's a pet, not a trap.**

---

## 11. Implementation note for engineers

Every i18n key referenced from this doc lives under `autoRenew.disclosure.*` in `i18n/en.ts` (and zh/es when we localize). The `{TOKEN}` placeholders are resolved by `i18next` interpolation — never concatenated by hand in JSX (legal-copy regression risk). When you ship a new copy version, increment a constant `AUTO_RENEW_DISCLOSURE_VERSION` in `utils/legal.ts` and store that version on the consent record server-side. If we ever face a regulatory inquiry about *which* disclosure copy a particular customer saw, the answer must be reproducible from the version hash + git history.
