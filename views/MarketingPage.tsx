/**
 * Marketing landing page — apex `evairdigital.com` (and `/welcome`).
 *
 * Phase 3 deliverable. The audience splits into two clear pillars on first
 * paint so customers self-segment immediately:
 *
 *   1. **Travelers** — eSIM in 200+ countries, instant QR delivery.
 *   2. **Long-stay / immigrants** — physical SIM, US 5G data plan, $9.99/mo.
 *
 * IMPORTANT: EvairSIM is a **data-only** service. There is no US phone
 * number, no voice, no SMS over the cellular network. Customers use
 * WhatsApp / FaceTime / iMessage over data for calls and messaging.
 * Do NOT add copy that promises a "US phone number" or "talk & text".
 *
 * This page is intentionally Airalo-clean: lots of whitespace, minimal
 * copy, two strong CTAs above the fold. Nothing here calls authenticated
 * APIs — it must render even when the customer is logged out and even on
 * a brand-new device. Anything that requires the user (e.g. activation)
 * lives behind the CTA buttons that route into `/activate`, `/travel-esim`,
 * or `/app` depending on device and product.
 *
 * Sections (top → bottom):
 *   - Hero (audience split)
 *   - Three pillars (coverage, price, support)
 *   - Social proof strip
 *   - Trust strip (carriers, payment, regulatory)
 *   - Final CTA
 *   - Footer with legal + contact
 *
 * @see docs/ACTIVATION_FUNNEL.md §6 — Marketing/landing page
 */

import React from 'react';
import {
    Globe,
    Smartphone,
    Shield,
    Headphones,
    Wifi,
    Zap,
    DollarSign,
    Star,
    CheckCircle2,
    ArrowRight,
    ShoppingCart,
    BadgeCheck,
} from 'lucide-react';
import { isMobileDevice } from '../utils/device';

const TRAVELER_COUNTRIES = '200+';
const STAY_PRICE_USD = '9.99';
const APP_PATH = '/app';
const ACTIVATE_PATH = '/activate';
/** Desktop travel eSIM browse + SEO surface (Phase 2). */
const TRAVEL_ESIM_LANDING = '/travel-esim';

/**
 * Public Amazon storefront for EvairSIM physical SIM cards.
 *
 * TODO(jordan): paste the real Amazon URL here. Until then we route
 * the "Buy SIM card" CTAs to the Amazon search results page for our
 * brand so clicks don't 404. When the storefront link is finalised,
 * just swap this constant — no other code changes needed.
 */
const AMAZON_STOREFRONT_URL =
    'https://www.amazon.com/s?k=EvairSIM';

/**
 * Travel eSIM CTAs: desktop → `/travel-esim` (marketing landing +
 * country catalogue), mobile → `/app#esim` (full-screen H5 store).
 *
 * The `<a href>` is always `TRAVEL_ESIM_LANDING` so crawlers and
 * no-JS desktop users hit the proper desktop page. On mobile we
 * intercept the click and send the customer straight into the app.
 */
const goTravelEsimCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobileDevice()) {
        e.preventDefault();
        window.location.assign(`${APP_PATH}#esim`);
    }
};

/**
 * Activate-my-SIM CTAs: desktop → `/activate` (standalone Amazon-insert
 * landing where customers type/scan their ICCID on a wide-format page),
 * mobile → `/app#sim-card` (in-app phone-mock SIM_CARD tab whose hero
 * exposes a prominent "Bind your SIM" CTA that opens the in-app
 * PhysicalSimSetupView).
 *
 * Mobile customers expect to land in the H5 customer app — same UX as
 * the Travel eSIM CTA above. Desktop customers want a real form-shaped
 * page they can paste their ICCID into without being squeezed into a
 * 430-px iPhone mock. The `<a href>` stays `/activate` so crawlers and
 * no-JS clients still resolve to a sensible destination.
 *
 * @see App.tsx HASH_TO_TAB — `#sim-card` is the documented mobile
 *      landing for both "Buy SIM card" and "Activate my SIM" flows.
 */
const goActivateCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobileDevice()) {
        e.preventDefault();
        window.location.assign(`${APP_PATH}#sim-card`);
    }
};

const MarketingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            {/* Top nav */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-md z-30 border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    {/* Official EvairSIM wordmark. The wordmark image already
                        contains the brand name, so we do NOT pair it with a
                        separate "EvairSIM" text label. h-8 ≈ 32 px tall to
                        match the rest of the 64-px nav chrome. */}
                    <a href="/" className="flex items-center" aria-label="EvairSIM home">
                        <img
                            src="/evairsim-wordmark.png"
                            alt="EvairSIM"
                            width={896}
                            height={228}
                            className="h-8 w-auto"
                        />
                    </a>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                        <a href="/travel-esim" className="hover:text-slate-900">Travel eSIM</a>
                        <a href="/sim/phone" className="hover:text-slate-900">Phone</a>
                        <a href="/sim/camera" className="hover:text-slate-900">Camera</a>
                        <a href="/sim/iot" className="hover:text-slate-900">IoT</a>
                        <a href="/help" className="hover:text-slate-900">Help</a>
                        <a href="/blog" className="hover:text-slate-900">Blog</a>
                    </nav>
                    {/* Sign-in CTA.
                        Labelled "Mobile Sign in" so desktop visitors
                        aren't surprised when /app still renders the
                        phone-mock for the account/dashboard tabs.
                        Travel eSIM shopping starts on `/travel-esim`
                        (hero CTA above), not here. */}
                    <a
                        href={APP_PATH}
                        className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                    >
                        Mobile Sign in →
                    </a>
                </div>
            </header>

            {/* Hero — audience split.
                The right-hand product photo shows the real EvairSIM card
                (with brand mark + ICCID barcode + Top-up QR) so visitors
                see the actual product on first paint. We also surface a
                smaller version below the CTAs on mobile so phone users
                aren't left with a text-only hero. */}
            <section className="px-4 md:px-8 py-12 md:py-20 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-10 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                            <Star size={12} fill="currentColor" /> Mobile data, simplified
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-5">
                            Stay connected
                            <br />
                            <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
                                anywhere.
                            </span>
                        </h1>
                        <p className="text-lg text-slate-600 mb-8 max-w-md leading-relaxed">
                            Travel eSIMs for short trips. A US 5G data plan for long stays.
                            Data-only, no contract, instant activation.
                        </p>
                        {/* Hero CTAs.
                            ┌───────────────────────────────────────────────┐
                            │   Travel eSIM (primary, full-width)           │
                            ├──────────────────────┬────────────────────────┤
                            │  Buy SIM card  (Amz) │   Activate my SIM      │
                            └──────────────────────┴────────────────────────┘
                            The long-stay product splits into two distinct
                            jobs-to-be-done: customers who don't own a SIM
                            yet (Amazon) and customers who already have one
                            in hand (the /activate page). Lumping both into
                            a single "US SIM" button forced confused users
                            into a phone-mock that they couldn't actually
                            shop in. */}
                        <div className="max-w-md">
                            <a
                                href={TRAVEL_ESIM_LANDING}
                                onClick={goTravelEsimCta}
                                className="flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform w-full"
                            >
                                <Globe size={18} /> Travel eSIM
                            </a>
                            <div className="grid sm:grid-cols-2 gap-3 mt-3">
                                <a
                                    href={AMAZON_STOREFRONT_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 bg-slate-900 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-transform"
                                >
                                    <ShoppingCart size={18} /> Buy SIM card
                                </a>
                                <a
                                    href={ACTIVATE_PATH}
                                    onClick={goActivateCta}
                                    className="flex items-center justify-center gap-2 bg-white text-slate-900 font-bold px-5 py-3 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-transform"
                                >
                                    <BadgeCheck size={18} /> Activate my SIM
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-6 text-xs text-slate-500">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            No contracts.
                            <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                            No hidden fees.
                            <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                            24/7 support.
                        </div>

                        {/* Mobile-only product photo. Sits beneath the
                            CTAs so they remain above the fold on phones,
                            while still giving mobile users a credible
                            visual of the actual SIM card. */}
                        <div className="md:hidden mt-10">
                            <div className="relative max-w-sm mx-auto">
                                <div className="absolute -inset-6 bg-gradient-to-br from-orange-500/15 to-amber-400/15 rounded-3xl blur-2xl" />
                                <img
                                    src="/evairsim-card-front.png"
                                    alt="EvairSIM US 5G data SIM card — AT&T, Verizon, T-Mobile, plug & use, data only"
                                    width={1024}
                                    height={644}
                                    className="relative w-full h-auto drop-shadow-xl"
                                    loading="eager"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <div className="relative">
                            <div className="absolute -inset-8 bg-gradient-to-br from-orange-500/20 to-amber-400/20 rounded-3xl blur-2xl" />
                            <img
                                src="/evairsim-card-front.png"
                                alt="EvairSIM US 5G data SIM card — AT&T, Verizon, T-Mobile, plug & use, data only"
                                width={1024}
                                height={644}
                                className="relative w-full h-auto drop-shadow-2xl"
                                loading="eager"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Audience pillars (split). Two stacked cards — one for each
                product. Each repeats the relevant CTA so the customer
                doesn't have to scroll back up. */}
            <section className="px-4 md:px-8 py-12 max-w-6xl mx-auto" id="travelers">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-8 flex flex-col">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                            <Globe className="text-orange-500" size={22} />
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wide text-orange-600 mb-1">
                            For travelers
                        </div>
                        <h2 className="text-2xl font-bold mb-2">eSIM in {TRAVELER_COUNTRIES} countries</h2>
                        <p className="text-slate-600 text-sm leading-relaxed mb-5">
                            Land, scan a QR, and you're online. Pay-as-you-go from $4.50.
                            No SIM swaps, no airport queues, no roaming bills.
                        </p>
                        <ul className="text-sm text-slate-700 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Plans from 1 GB to unlimited</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Top up any time, no contract</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> 4G/5G on tier-1 carriers</li>
                        </ul>
                        <a
                            href={TRAVEL_ESIM_LANDING}
                            onClick={goTravelEsimCta}
                            className="mt-auto inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-5 py-3 rounded-xl"
                        >
                            Browse plans <ArrowRight size={16} />
                        </a>
                    </div>

                    <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-8 flex flex-col" id="stay">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                            <Smartphone className="text-slate-700" size={22} />
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                            For long-stay & new arrivals
                        </div>
                        <h2 className="text-2xl font-bold mb-2">US 5G data — ${STAY_PRICE_USD}/month</h2>
                        <p className="text-slate-600 text-sm leading-relaxed mb-5">
                            Real US 5G on AT&amp;T, Verizon, and T-Mobile. Plug-and-use in any
                            unlocked phone, tablet, or hotspot. Data-only — pair with WhatsApp,
                            FaceTime or iMessage for calls and messaging.
                        </p>
                        <ul className="text-sm text-slate-700 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> No SSN, no credit check</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> AT&amp;T &middot; Verizon &middot; T-Mobile coverage</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Auto-renew or pay monthly</li>
                        </ul>
                        {/* Mirror the hero's two-button split so the
                            second-scroll CTA matches the customer's
                            existing mental model. */}
                        <div className="mt-auto grid sm:grid-cols-2 gap-3">
                            <a
                                href={AMAZON_STOREFRONT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-bold px-5 py-3 rounded-xl"
                            >
                                <ShoppingCart size={16} /> Buy SIM card
                            </a>
                            <a
                                href={ACTIVATE_PATH}
                                onClick={goActivateCta}
                                className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-bold px-5 py-3 rounded-xl border border-slate-300"
                            >
                                <BadgeCheck size={16} /> Activate my SIM
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Three pillars: coverage, price, support. */}
            <section className="bg-slate-50 px-4 md:px-8 py-16" id="why">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-2">
                        Why Evair
                    </h2>
                    <p className="text-center text-slate-600 mb-10">
                        Built for the way people actually move today.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Pillar
                            icon={<Globe className="text-orange-500" size={24} />}
                            title="Global coverage"
                            body="200+ countries with tier-1 carriers, plus a stable US 5G data plan for residents and long-stay customers."
                        />
                        <Pillar
                            icon={<DollarSign className="text-emerald-500" size={24} />}
                            title="Honest pricing"
                            body={`Travel data from $4.50. US plans from $${STAY_PRICE_USD}/mo. No taxes-on-top surprises, no contract.`}
                        />
                        <Pillar
                            icon={<Headphones className="text-blue-500" size={24} />}
                            title="Real support"
                            body="In-app live chat staffed by humans. We answer in English, Spanish, and Mandarin — usually inside 5 minutes."
                        />
                    </div>
                </div>
            </section>

            {/* Trust strip */}
            <section className="px-4 md:px-8 py-12 max-w-6xl mx-auto" id="support">
                <div className="grid md:grid-cols-4 gap-6 text-center">
                    <TrustItem icon={<Zap size={18} />} label="Instant activation" />
                    <TrustItem icon={<Shield size={18} />} label="PCI-compliant payments" />
                    <TrustItem icon={<Wifi size={18} />} label="4G / 5G everywhere" />
                    <TrustItem icon={<Headphones size={18} />} label="24/7 chat support" />
                </div>
            </section>

            {/* Final CTA */}
            <section className="px-4 md:px-8 py-16 max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
                    Ready in two taps.
                </h2>
                <p className="text-slate-600 text-lg mb-8">
                    Pick your trip or your stay. We'll handle the rest.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {/* "Get started" routes into the eSIM store on both
                        device classes — most apex traffic is travel-
                        intent, and desktop users get the full-width
                        store layout (App.tsx `showStoreLayout`). */}
                    <a
                        href={TRAVEL_ESIM_LANDING}
                        onClick={goTravelEsimCta}
                        className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-orange-500/20"
                    >
                        Get started <ArrowRight size={18} />
                    </a>
                    <a
                        href="mailto:service@evairdigital.com"
                        className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-bold px-6 py-4 rounded-xl border border-slate-200"
                    >
                        Talk to sales
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-300 px-4 md:px-8 py-10">
                <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-8 text-sm">
                    <div className="md:col-span-1">
                        <div className="mb-3">
                            <img
                                src="/evairsim-wordmark.png"
                                alt="EvairSIM"
                                width={896}
                                height={228}
                                className="h-9 w-auto"
                            />
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                            Connectivity for travelers, residents, and the people in between.
                        </p>
                    </div>
                    <FooterColumn
                        title="Travel"
                        links={[
                            { label: 'Travel eSIM', href: '/travel-esim' },
                            { label: 'Japan eSIM', href: '/travel-esim/jp' },
                            { label: 'UK eSIM', href: '/travel-esim/gb' },
                            { label: 'Mexico eSIM', href: '/travel-esim/mx' },
                            { label: 'Top up data', href: '/top-up' },
                        ]}
                    />
                    <FooterColumn
                        title="US SIMs"
                        links={[
                            { label: 'Phone & tablet', href: '/sim/phone' },
                            { label: 'Security & trail cameras', href: '/sim/camera' },
                            { label: 'IoT & smart devices', href: '/sim/iot' },
                            { label: 'Activate a SIM', href: ACTIVATE_PATH },
                        ]}
                    />
                    <FooterColumn
                        title="Resources"
                        links={[
                            { label: 'Help center', href: '/help' },
                            { label: 'Install your eSIM', href: '/help/install-esim-iphone' },
                            { label: 'Refund policy', href: '/help/refund-policy' },
                            { label: 'Blog', href: '/blog' },
                        ]}
                    />
                    <FooterColumn
                        title="Legal"
                        links={[
                            { label: 'Terms of Service', href: '/legal/terms' },
                            { label: 'Privacy Policy', href: '/legal/privacy' },
                            { label: 'Refund Policy', href: '/legal/refund' },
                        ]}
                    />
                </div>
                <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row justify-between gap-3">
                    <span>© {new Date().getFullYear()} Evair Digital. All rights reserved.</span>
                    <span>Made for travelers and the people who stay.</span>
                </div>
            </footer>
        </div>
    );
};

// ─── Internal cells ──────────────────────────────────────────────────

const Pillar: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({
    icon,
    title,
    body,
}) => (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
            {icon}
        </div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
);

const TrustItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
        <span className="text-slate-400">{icon}</span>
        {label}
    </div>
);

const FooterColumn: React.FC<{ title: string; links: { label: string; href: string }[] }> = ({
    title,
    links,
}) => (
    <div>
        <div className="text-white font-semibold mb-3">{title}</div>
        <ul className="space-y-2">
            {links.map(l => (
                <li key={l.href}>
                    <a href={l.href} className="hover:text-white transition-colors">
                        {l.label}
                    </a>
                </li>
            ))}
        </ul>
    </div>
);

export default MarketingPage;
