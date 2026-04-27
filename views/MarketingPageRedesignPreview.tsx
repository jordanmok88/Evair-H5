/**
 * Homepage layout redesign — PREVIEW ONLY at `/welcome-preview`.
 * Does not replace `MarketingPage` (`/` or `/welcome`) until approved.
 */

import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { applyPageSeo } from '../utils/seoHead';
import { isMobileDevice } from '../utils/device';

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

/** Placeholder photography — replace with brand / licensed assets before merge to `/welcome`. */
const HAPPY_STORIES = [
    {
        img: 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=720&q=80',
        alt: 'Travelers exploring a city together',
        quote: 'Landed at JFK and had 5G before we reached baggage claim.',
        who: 'Alex & Sam · NYC',
    },
    {
        img: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=720&q=80',
        alt: 'Remote team collaborating outdoors',
        quote: 'Plug-and-play for our trail cams — no APN drama, just data.',
        who: 'Morgan · Colorado',
    },
    {
        img: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=720&q=80',
        alt: 'Friends at a cafe with a laptop',
        quote: "Cheaper than local carriers — no SSN, no twelve-page form.",
        who: 'Priya · Austin',
    },
] as const;

function StarRow({ compact }: { compact?: boolean }) {
    const size = compact ? 11 : 14;
    return (
        <div className="flex gap-0.5 text-amber-400" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={size} className="fill-current" strokeWidth={0} />
            ))}
        </div>
    );
}

const MarketingPageRedesignPreview: React.FC = () => {
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

            {/* ── Nav: single “Open” → H5 customer shell at /app (no app strip, no gate) ── */}
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
                    <a href="/" className="flex min-w-0 items-center" aria-label="EvairSIM home">
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
                        className="shrink-0 rounded-full bg-[#2563eb] px-5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#1d4ed8] active:scale-[0.98]"
                    >
                        Open
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
                            className="inline-flex items-center justify-center rounded-xl bg-[#F27420] px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-105 active:scale-[0.98]"
                        >
                            Travel eSIM
                        </a>
                        <a
                            href={`${APP_PATH}#sim-card`}
                            className="inline-flex items-center justify-center rounded-xl bg-[#0A1128] px-6 py-4 text-center text-base font-bold text-white shadow-lg shadow-slate-900/30 transition hover:bg-[#121f45] active:scale-[0.98]"
                        >
                            Buy SIM card
                        </a>
                        <a
                            href={ACTIVATE_PATH}
                            onClick={goActivateCta}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-4 text-center text-base font-bold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
                        >
                            Activate my SIM
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

            {/* ── 2. Happy customers — compact horizontal carousel (reference: tighter cards) ── */}
            <section id="stories" className="border-t border-gray-100 bg-white px-4 py-12 md:px-8 md:py-14">
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-left text-xl font-extrabold text-gray-900 md:text-2xl">
                        Our happy customers
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600 md:text-base">
                        Real people staying connected — swipe for more stories.
                    </p>

                    <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-5 md:px-0">
                        {HAPPY_STORIES.map((s) => (
                            <article
                                key={s.who}
                                className="group flex w-[min(78vw,260px)] shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md md:w-[240px]"
                            >
                                <div className="h-36 w-full overflow-hidden bg-gray-100 sm:h-40">
                                    <img
                                        src={s.img}
                                        alt={s.alt}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="flex flex-1 flex-col p-4">
                                    <StarRow compact />
                                    <p className="mt-2 text-sm font-semibold leading-snug text-gray-800">
                                        &ldquo;{s.quote}&rdquo;
                                    </p>
                                    <p className="mt-2 text-xs font-medium text-gray-500">{s.who}</p>
                                    <a
                                        href="/blog"
                                        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-gray-900 bg-white py-2 text-xs font-bold text-gray-900 transition hover:bg-gray-50"
                                    >
                                        See stories
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 3. Why Evair (premium cards — gradient rail, no tiny icon tiles) ── */}
            <section id="why" className="border-t border-gray-100 bg-gray-50 px-4 py-16 md:px-8">
                <div className="mx-auto max-w-5xl">
                    <h2 className="text-center text-2xl font-extrabold text-gray-900 md:text-3xl">
                        Built for the way you actually move.
                    </h2>
                    <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                        {[
                            {
                                gradient: 'from-orange-500 via-amber-400 to-yellow-300',
                                tag: 'Coverage',
                                title: 'Global coverage.',
                                body: '200+ countries with tier-1 carriers, plus ultra-stable US 5G for residents and long stays.',
                            },
                            {
                                gradient: 'from-emerald-500 via-teal-400 to-cyan-300',
                                tag: 'Pricing',
                                title: 'Honest pricing.',
                                body: `Travel data from $4.50. US plans from $${STAY_PRICE_USD}/mo. Zero taxes-on-top surprises.`,
                            },
                            {
                                gradient: 'from-sky-500 via-blue-500 to-indigo-400',
                                tag: 'Support',
                                title: 'Real human support.',
                                body: 'In-app live chat in English, Spanish, and Mandarin. We usually answer in under 5 minutes.',
                            },
                            {
                                gradient: 'from-amber-500 via-orange-400 to-rose-400',
                                tag: 'Speed',
                                title: 'Instant activation.',
                                body: 'No SIM swaps, no airport queues, no roaming shock.',
                            },
                        ].map((c) => (
                            <article
                                key={c.title}
                                className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100/90 transition hover:shadow-lg hover:ring-gray-200"
                            >
                                <div
                                    className={`absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r ${c.gradient}`}
                                    aria-hidden
                                />
                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                                    {c.tag}
                                </p>
                                <h3 className="mt-3 text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
                                    {c.title}
                                </h3>
                                <p className="mt-4 text-base leading-relaxed text-gray-600">{c.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 4. Product deep dives ─────────────────────────────────── */}
            <section id="compare" className="border-t border-gray-100">
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
