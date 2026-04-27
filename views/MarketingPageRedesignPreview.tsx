/**
 * Homepage layout redesign — PREVIEW ONLY at `/welcome-preview`.
 * Does not replace `MarketingPage` (`/` or `/welcome`) until approved.
 */

import React, { useEffect } from 'react';
import {
    ArrowRight,
    BadgeCheck,
    CheckCircle2,
    DollarSign,
    Globe,
    Headphones,
    Zap,
    ShoppingCart,
    Star,
} from 'lucide-react';
import { applyPageSeo } from '../utils/seoHead';
import { isMobileDevice } from '../utils/device';
import { useMobileSignInGate } from '../hooks/useMobileSignInGate';
import MobileOnlyNotice from '../components/marketing/MobileOnlyNotice';

const APP_PATH = '/app';
const ACTIVATE_PATH = '/activate';
const TRAVEL_ESIM_LANDING = '/travel-esim';
const STAY_PRICE_USD = '9.99';

const goTravelEsimCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobileDevice()) {
        e.preventDefault();
        window.location.assign(`${APP_PATH}#esim`);
    }
};

const goActivateCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobileDevice()) {
        e.preventDefault();
        window.location.assign(`${APP_PATH}#bind-sim`);
    }
};

/** Placeholder photography — swap for licensed brand shots when approved. */
const CAROUSEL_IMAGES = {
    traveler:
        'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=800&q=80',
    iot: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    longStay:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
} as const;

const MarketingPageRedesignPreview: React.FC = () => {
    const signInGate = useMobileSignInGate(APP_PATH);

    useEffect(() => {
        applyPageSeo({
            path: '/welcome-preview',
            title: 'Evair — Homepage preview (draft)',
            description:
                'Draft marketing layout preview. Travel eSIMs and US 5G data — not the live homepage.',
        });
    }, []);

    return (
        <div className="min-h-screen bg-white text-gray-900 antialiased">
            <div className="bg-amber-100 border-b border-amber-200 text-amber-950 text-center text-sm font-medium py-2.5 px-4">
                <strong>Draft preview</strong> — this page is only at{' '}
                <span className="font-mono">/welcome-preview</span>. Production{' '}
                <span className="font-mono">/</span> and <span className="font-mono">/welcome</span> are
                unchanged until you approve a merge.
            </div>

            {/* ── Nav (match live: logo + links + sign-in) ───────────────── */}
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
                    <a href="/" className="flex items-center" aria-label="EvairSIM home">
                        <img
                            src="/evairsim-wordmark.png"
                            alt="EvairSIM"
                            width={896}
                            height={228}
                            className="h-8 w-auto"
                        />
                    </a>
                    <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
                        <a href="/travel-esim" className="transition hover:text-gray-900">
                            Travel eSIM
                        </a>
                        <a href="/sim/phone" className="transition hover:text-gray-900">
                            Phone
                        </a>
                        <a href="/sim/camera" className="transition hover:text-gray-900">
                            Camera
                        </a>
                        <a href="/sim/iot" className="transition hover:text-gray-900">
                            IoT
                        </a>
                        <a href="/help" className="transition hover:text-gray-900">
                            Help
                        </a>
                        <a href="/blog" className="transition hover:text-gray-900">
                            Blog
                        </a>
                    </nav>
                    <a
                        href={APP_PATH}
                        onClick={signInGate.gateClick}
                        className="text-sm font-semibold text-[#F27420] transition hover:text-orange-700"
                    >
                        Mobile Sign in →
                    </a>
                </div>
            </header>

            {/* ── 1. Hero ─────────────────────────────────────────────── */}
            <section className="bg-white px-4 py-16 md:py-24">
                <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#c45a10]">
                        <Star size={12} fill="currentColor" /> Mobile data, simplified
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                        Go Online Anywhere.
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
                        Travel eSIMs for short trips. A US 5G data plan for long stays. Data-only, no
                        contracts, instant activation.
                    </p>
                    <div className="mt-10 flex w-full max-w-xl flex-col items-stretch gap-3 md:flex-row md:justify-center">
                        <a
                            href={TRAVEL_ESIM_LANDING}
                            onClick={goTravelEsimCta}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F27420] px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-105 active:scale-[0.98]"
                        >
                            <Globe size={18} /> Travel eSIM
                        </a>
                        <a
                            href={`${APP_PATH}#sim-card`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A1128] px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-slate-900/30 transition hover:bg-[#121f45] active:scale-[0.98]"
                        >
                            <ShoppingCart size={18} /> Buy SIM card
                        </a>
                        <a
                            href={ACTIVATE_PATH}
                            onClick={goActivateCta}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-4 text-center text-base font-bold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
                        >
                            <BadgeCheck size={18} /> Activate my SIM
                        </a>
                    </div>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
                            No contracts.
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
                            No hidden fees.
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
                            24/7 support.
                        </span>
                    </div>
                </div>
            </section>

            {/* ── 2. Customer carousel ─────────────────────────────────── */}
            <section className="border-t border-gray-100 bg-white px-4 py-14 md:px-8">
                <div className="mx-auto max-w-6xl">
                    <h2 className="mb-8 text-left text-2xl font-extrabold text-gray-900 md:text-3xl">
                        Trusted by travelers and builders.
                    </h2>
                    <div className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
                        {[
                            {
                                img: CAROUSEL_IMAGES.traveler,
                                alt: 'Traveler using phone in a busy airport',
                                quote:
                                    'Landed at JFK and had 5G before I even reached baggage claim.',
                            },
                            {
                                img: CAROUSEL_IMAGES.iot,
                                alt: 'Hands setting up outdoor or IoT hardware',
                                quote:
                                    'The perfect plug-and-play solution for my remote security setup.',
                            },
                            {
                                img: CAROUSEL_IMAGES.longStay,
                                alt: 'Person on a video call with a tablet in a sunny cafe',
                                quote:
                                    "Cheaper than local carriers and I didn't need an SSN to get started.",
                            },
                        ].map((card, i) => (
                            <article
                                key={i}
                                className="w-[min(100%,320px)] shrink-0 snap-center overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md md:w-[300px]"
                            >
                                <div className="h-48 w-full overflow-hidden bg-gray-100">
                                    <img
                                        src={card.img}
                                        alt={card.alt}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="p-5">
                                    <p className="text-sm font-medium leading-relaxed text-gray-700">
                                        &ldquo;{card.quote}&rdquo;
                                    </p>
                                    <a
                                        href="/blog"
                                        className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#F27420] hover:underline"
                                    >
                                        Read Story <ArrowRight size={14} />
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 3. Why Evair ─────────────────────────────────────────── */}
            <section className="border-t border-gray-100 bg-gray-50 px-4 py-16 md:px-8">
                <div className="mx-auto max-w-5xl">
                    <h2 className="text-center text-2xl font-extrabold text-gray-900 md:text-3xl">
                        Built for the way you actually move.
                    </h2>
                    <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                        {[
                            {
                                icon: <Globe className="text-orange-500" size={24} />,
                                title: 'Global coverage.',
                                body: '200+ countries with tier-1 carriers, plus ultra-stable US 5G for residents and long stays.',
                            },
                            {
                                icon: <DollarSign className="text-emerald-500" size={24} />,
                                title: 'Honest pricing.',
                                body: `Travel data from $4.50. US plans from $${STAY_PRICE_USD}/mo. Zero taxes-on-top surprises.`,
                            },
                            {
                                icon: <Headphones className="text-blue-500" size={24} />,
                                title: 'Real human support.',
                                body: 'In-app live chat in English, Spanish, and Mandarin. We usually answer in under 5 minutes.',
                            },
                            {
                                icon: <Zap className="text-amber-500" size={24} />,
                                title: 'Instant activation.',
                                body: 'No SIM swaps, no airport queues, no roaming shock.',
                            },
                        ].map((c) => (
                            <div
                                key={c.title}
                                className="rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                                    {c.icon}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">{c.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">{c.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 4. Product deep dives ─────────────────────────────────── */}
            <section className="border-t border-gray-100">
                <div className="bg-orange-50 px-6 py-16">
                    <div className="mx-auto max-w-3xl">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-800">
                            For travelers
                        </p>
                        <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
                            eSIMs in 200+ countries
                        </h2>
                        <p className="mt-4 text-lg text-gray-700">
                            Land, scan a QR code, and you&apos;re online. Pay-as-you-go.
                        </p>
                        <ul className="mt-6 space-y-3 text-gray-800">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                                <span>Plans from 1GB to Unlimited</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                                <span>Top up anytime</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                                <span>4G/5G on tier-1 carriers</span>
                            </li>
                        </ul>
                        <a
                            href={TRAVEL_ESIM_LANDING}
                            onClick={goTravelEsimCta}
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#F27420] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:brightness-105"
                        >
                            Browse plans <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-16">
                    <div className="mx-auto max-w-3xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                            For long-stay, IoT &amp; new arrivals
                        </p>
                        <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
                            US 5G Data — ${STAY_PRICE_USD}/month
                        </h2>
                        <p className="mt-4 text-lg text-gray-700">
                            Real US 5G on AT&amp;T, Verizon, and T-Mobile. Plug-and-use in any unlocked phone,
                            tablet, portable router, or smart device.
                        </p>
                        <ul className="mt-6 space-y-3 text-gray-800">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                                <span>No SSN or credit check</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                                <span>Broad US coverage</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                                <span>Auto-renew or pay monthly</span>
                            </li>
                        </ul>
                        <a
                            href={`${APP_PATH}#sim-card`}
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0A1128] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#121f45]"
                        >
                            Buy physical SIM <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
            </section>

            {/* ── 5. CTA + footer (navy) ───────────────────────────────── */}
            <section className="bg-[#0A1128] text-white">
                <div className="mx-auto max-w-3xl px-6 py-16 text-center">
                    <h2 className="text-3xl font-extrabold md:text-4xl">Ready in two taps.</h2>
                    <p className="mx-auto mt-4 max-w-lg text-lg text-gray-300">
                        Pick your trip, your device, or your stay. We&apos;ll handle the connection.
                    </p>
                    <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
                        <a
                            href={TRAVEL_ESIM_LANDING}
                            onClick={goTravelEsimCta}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F27420] px-8 py-4 text-base font-bold text-white transition hover:brightness-105"
                        >
                            Get started <ArrowRight size={18} />
                        </a>
                        <a
                            href="mailto:service@evairdigital.com"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white bg-transparent px-8 py-4 text-base font-bold text-white transition hover:bg-white/10"
                        >
                            Talk to sales
                        </a>
                    </div>
                </div>
                <footer className="border-t border-gray-700 px-4 py-10 md:px-8">
                    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 text-sm text-gray-300 md:grid-cols-5">
                        <div className="col-span-2 md:col-span-1">
                            <img
                                src="/evairsim-wordmark.png"
                                alt="EvairSIM"
                                width={896}
                                height={228}
                                className="mb-3 h-9 w-auto brightness-0 invert"
                            />
                            <p className="text-gray-400">
                                Connectivity for travelers, residents, and the people in between.
                            </p>
                        </div>
                        <FooterColumn
                            title="Travel"
                            links={[
                                { label: 'Travel eSIM', href: '/travel-esim', onClick: goTravelEsimCta },
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
                                { label: 'Activate a SIM', href: ACTIVATE_PATH, onClick: goActivateCta },
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
                    <div className="mx-auto mt-8 flex max-w-6xl flex-col justify-between gap-3 border-t border-gray-700 pt-6 text-xs text-gray-500 md:flex-row">
                        <span>© {new Date().getFullYear()} Evair Digital. All rights reserved.</span>
                        <span>Made for travelers and the people who stay.</span>
                    </div>
                </footer>
            </section>

            <MobileOnlyNotice
                open={signInGate.open}
                onClose={signInGate.onClose}
                onContinueAnyway={signInGate.onContinueAnyway}
            />
        </div>
    );
};

interface FooterLink {
    label: string;
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const FooterColumn: React.FC<{ title: string; links: FooterLink[] }> = ({ title, links }) => (
    <div>
        <div className="mb-3 font-semibold text-white">{title}</div>
        <ul className="space-y-2">
            {links.map((l, idx) => (
                <li key={`${title}-${l.label}-${idx}`}>
                    <a href={l.href} onClick={l.onClick} className="text-gray-300 transition hover:text-white">
                        {l.label}
                    </a>
                </li>
            ))}
        </ul>
    </div>
);

export default MarketingPageRedesignPreview;
