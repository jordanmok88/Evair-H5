/**
 * Homepage layout sandbox — `/welcome-preview`.
 * The approved design now ships on `MarketingPage` (`/` and `/welcome`).
 * This route remains for A/B or QA comparisons.
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronRight, Star } from 'lucide-react';
import { applyPageSeo } from '../utils/seoHead';
import { isMobileDevice } from '../utils/device';
import { FooterWordmarkLink } from '../components/marketing/FooterWordmarkLink';
import { OpenAppHeaderButton } from '../components/marketing/OpenAppHeaderButton';
import { MARKETING_NAV_ITEMS } from '../components/marketing/siteNavConfig';
import MobileOnlyNotice from '../components/marketing/MobileOnlyNotice';
import { useMobileSignInGate } from '../hooks/useMobileSignInGate';
import { AMAZON_SIM_PRIMARY_PRODUCT_URL, AMAZON_SIM_STOREFRONT_URL } from '../constants';

const APP_PATH = '/app';
const APP_SUPPORT_CHAT_HREF = '/app#contact';
const ACTIVATE_PATH = '/activate';
const TRAVEL_ESIM_LANDING = '/travel-esim';

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
    {
        img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=720&q=80',
        alt: 'Airport departure gate with travelers',
        quote: 'Paris layover, one tap — data worked before wheels touched the tarmac.',
        who: 'Chris · Seattle',
    },
    {
        img: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=720&q=80',
        alt: 'Family on the beach',
        quote: 'Kids streamed maps in the rental van; we never hunted for Wi‑Fi again.',
        who: 'The Okoye family · Atlanta',
    },
] as const;

function StarRow({ compact, center }: { compact?: boolean; center?: boolean }) {
    const size = compact ? 11 : 14;
    return (
        <div className={`flex gap-0.5 text-amber-400${center ? ' justify-center' : ''}`} aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={size} className="fill-current" strokeWidth={0} />
            ))}
        </div>
    );
}

const MarketingPageRedesignPreview: React.FC = () => {
    const { t } = useTranslation();
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
        <div className="min-h-screen overflow-x-hidden bg-white text-gray-900 antialiased [text-rendering:optimizeLegibility]">
            <div className="pt-safe bg-amber-100 border-b border-amber-200 px-3 py-2.5 text-center text-xs font-medium text-amber-950 sm:px-4 sm:text-sm sm:leading-snug">
                <strong>Draft preview</strong> — this page is only at{' '}
                <span className="font-mono">/welcome-preview</span>. Production{' '}
                <span className="font-mono">/</span> and <span className="font-mono">/welcome</span> are
                unchanged until you approve a merge.
            </div>

            {/* ── Nav: OPEN APP (same CTA as production marketing home) ── */}
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
                <div className="mx-auto flex h-14 min-h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:min-h-16 sm:gap-3 sm:px-4 md:px-8">
                    <a href="/" className="flex min-w-0 max-w-[min(200px,52vw)] shrink items-center" aria-label="EvairSIM home">
                        <img
                            src="/evairsim-wordmark.png"
                            alt="EvairSIM"
                            width={896}
                            height={228}
                            className="h-7 w-auto max-h-9 sm:h-8 sm:max-h-10 md:h-9"
                        />
                    </a>
                    <nav className="hidden min-w-0 flex-wrap items-center justify-end gap-x-5 gap-y-2 text-[0.9375rem] font-semibold leading-snug text-gray-800 md:flex lg:gap-x-7 lg:text-base">
                        <a href="/travel-esim" className="transition-colors hover:text-gray-950">
                            Global eSIM
                        </a>
                        <a href="/sim/phone" className="transition-colors hover:text-gray-950">
                            {t('marketing.nav_mobile')}
                        </a>
                        <a href="/sim/camera" className="transition-colors hover:text-gray-950">
                            Camera
                        </a>
                        <a href="/sim/iot" className="transition-colors hover:text-gray-950">
                            IoT
                        </a>
                        <a href="/help" className="transition-colors hover:text-gray-950">
                            Help
                        </a>
                        <a href="/blog" className="transition-colors hover:text-gray-950">
                            Blog
                        </a>
                    </nav>
                    <OpenAppHeaderButton href={APP_PATH} onClick={signInGate.gateClick} />
                </div>
            </header>

            {/* ── 1. Hero — fluid type + safe tap targets ───────────────── */}
            <section className="bg-white px-4 py-12 sm:px-5 sm:py-16 md:px-6 md:py-20 lg:py-24">
                <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col items-center text-center">
                    <div className="mb-3 inline-flex max-w-[95%] items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c45a10] sm:mb-4 sm:gap-2 sm:px-3 sm:text-xs">
                        <Star className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" fill="currentColor" /> Mobile data, simplified
                    </div>
                    <h1 className="text-[1.7rem] font-extrabold leading-[1.12] tracking-tight text-gray-900 min-[400px]:text-3xl sm:text-4xl sm:leading-tight md:text-5xl lg:text-6xl">
                        Go Online Anywhere.
                    </h1>
                    <p className="mt-4 max-w-2xl px-1 text-base leading-relaxed text-gray-600 sm:mt-6 sm:text-lg">
                        Travel eSIMs for short trips. A US 5G data plan for long stays. Data-only, no
                        contracts, instant activation.
                    </p>
                    <div className="mt-8 flex w-full min-w-0 max-w-xl flex-col items-stretch gap-2.5 sm:mt-10 sm:gap-3 md:flex-row md:justify-center md:gap-3">
                        <a
                            href={TRAVEL_ESIM_LANDING}
                            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#F27420] px-5 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-105 active:scale-[0.99] sm:min-h-14 sm:px-6 sm:text-base"
                        >
                            Global eSIM
                        </a>
                        <a
                            href={AMAZON_SIM_STOREFRONT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0A1128] px-5 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-slate-900/30 transition hover:bg-[#121f45] active:scale-[0.99] sm:min-h-14 sm:px-6 sm:text-base"
                        >
                            Buy SIM card
                        </a>
                        <a
                            href={ACTIVATE_PATH}
                            onClick={goActivateCta}
                            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3.5 text-center text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50 active:scale-[0.99] sm:min-h-14 sm:px-6 sm:text-base"
                        >
                            Activate my SIM
                        </a>
                    </div>
                    <div className="mt-7 flex w-full min-w-0 justify-center px-0.5 sm:mt-9 sm:px-0">
                        <p className="flex max-w-full items-center gap-1.5 text-[clamp(0.62rem,2.7vw,0.875rem)] font-medium leading-tight text-gray-500 sm:text-sm">
                            <CheckCircle2
                                className="h-3 w-3 shrink-0 text-emerald-500 sm:h-[18px] sm:w-[18px]"
                                aria-hidden
                            />
                            <span className="min-w-0 whitespace-nowrap">
                                No contracts · No hidden fees · 24/7 support
                            </span>
                        </p>
                    </div>
                </div>
            </section>

            {/* ── 2. Happy customers — carousel: scroll-padding + aligned card bodies ── */}
            <section id="stories" className="border-t border-gray-100 bg-white px-4 py-10 sm:px-5 md:px-8 md:py-14">
                <div className="mx-auto max-w-6xl min-w-0">
                    <h2 className="text-left text-lg font-extrabold text-gray-900 sm:text-xl md:text-2xl">
                        Our Happy Customers
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
                        Real people staying connected — swipe for more stories.
                    </p>

                    <div
                        className="-mx-4 mt-6 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain px-4 pb-3 sm:mt-8 sm:gap-4 md:mx-0 md:px-0 md:pb-2"
                        style={{ scrollPaddingInline: '1rem' }}
                    >
                        {HAPPY_STORIES.map((s) => (
                            <article
                                key={s.who}
                                className="group flex w-[min(82vw,17.5rem)] min-w-0 shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md sm:min-w-[15rem] sm:max-w-[17.5rem] sm:w-60 md:w-[15.5rem] lg:w-64"
                            >
                                <div className="aspect-[5/3] w-full shrink-0 overflow-hidden bg-gray-100">
                                    <img
                                        src={s.img}
                                        alt={s.alt}
                                        width={400}
                                        height={240}
                                        sizes="(max-width: 640px) 82vw, 240px"
                                        className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className="flex min-h-0 flex-1 flex-col">
                                    <div className="flex flex-1 flex-col items-center px-4 py-5 text-center sm:px-5 sm:py-6">
                                        <StarRow compact center />
                                        <p className="mt-4 min-h-[4.25rem] text-[0.8125rem] font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere] sm:min-h-[4.5rem] sm:text-sm">
                                            &ldquo;{s.quote}&rdquo;
                                        </p>
                                        <p className="mt-3 max-w-[16rem] text-[11px] font-medium leading-snug text-gray-500 sm:text-xs">
                                            {s.who}
                                        </p>
                                    </div>
                                    <div className="border-t border-gray-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
                                        <a
                                            href="/blog"
                                            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-900 bg-white py-2.5 text-xs font-bold text-gray-900 transition hover:bg-gray-50"
                                        >
                                            See stories
                                        </a>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 3. Why Evair — same max width as pricing + stories (max-w-6xl) ─ */}
            <section id="why" className="border-t border-gray-100 bg-gray-50 px-4 py-10 sm:px-5 md:px-8 md:py-12">
                <div className="mx-auto w-full min-w-0 max-w-6xl">
                    <h2 className="text-left text-lg font-extrabold text-gray-900 sm:text-xl md:text-2xl">
                        Built for the way you actually move.
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
                        Global trips, long-stay US data, and support in three languages — without the fine print
                        runaround.
                    </p>
                    <div className="mt-6 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 min-[400px]:gap-4 sm:mt-7 md:mt-8 md:gap-5">
                        {[
                            {
                                gradient: 'from-orange-500 via-amber-400 to-yellow-300',
                                tag: 'Coverage',
                                title: 'Global coverage.',
                                body: '200+ countries, tier-1 carriers, plus stable US 5G for long stays.',
                                href: TRAVEL_ESIM_LANDING,
                            },
                            {
                                gradient: 'from-emerald-500 via-teal-400 to-cyan-300',
                                tag: 'Pricing',
                                title: 'Honest pricing.',
                                body: 'US data vs. AT&T & Verizon — no fluff.',
                                href: '/sim/phone',
                            },
                            {
                                gradient: 'from-sky-500 via-blue-500 to-indigo-400',
                                tag: 'Support',
                                title: 'Real human support.',
                                body: 'Live chat in English, Spanish & Mandarin — fast replies.',
                                href: `${APP_PATH}#contact`,
                            },
                            {
                                gradient: 'from-amber-500 via-orange-400 to-rose-400',
                                tag: 'Speed',
                                title: 'Instant activation.',
                                body: 'No SIM swaps, no airport queues, no roaming shock.',
                                href: ACTIVATE_PATH,
                                onClick: goActivateCta,
                            },
                        ].map((c) => (
                            <a
                                key={c.title}
                                href={c.href}
                                onClick={c.onClick}
                                className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-gray-200/80 transition active:scale-[0.99] hover:shadow-md hover:ring-[#F27420]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] min-[400px]:min-h-[8.5rem] min-[400px]:p-4 sm:p-5 md:min-h-0"
                            >
                                <div
                                    className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${c.gradient}`}
                                    aria-hidden
                                />
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 md:text-[10px]">
                                    {c.tag}
                                </p>
                                <h3 className="mt-1.5 text-sm font-bold leading-tight text-gray-900 sm:mt-2 sm:text-base md:text-lg">
                                    {c.title}
                                </h3>
                                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-gray-600 sm:mt-2 sm:text-sm">
                                    {c.body}
                                </p>
                                <div
                                    className="mt-3 flex items-center justify-end text-[#F27420] transition group-hover:translate-x-0.5 sm:mt-4"
                                    aria-hidden
                                >
                                    <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 4. Long-stay / IoT — same content width as section 3 (max-w-6xl) ── */}
            <section id="compare" className="border-t border-gray-100 bg-slate-50 px-4 py-10 sm:px-5 md:px-8 md:py-12">
                <div className="mx-auto w-full min-w-0 max-w-6xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 sm:text-xs">
                        For long-stay, IoT &amp; new arrivals
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-gray-900 sm:text-xl md:text-2xl">US 5G data plans</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
                        Real US 5G on AT&amp;T &amp; Verizon. High-speed bucket, then unlimited at 256 Kbps — top up
                        anytime in the app.
                    </p>

                    {/* Mobile: compact vertical stack (all 3 plans in one screenful). md+: 3-col grid. */}
                    <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:gap-3 md:mt-6 md:grid md:grid-cols-3 md:gap-4 md:items-stretch">
                        {[
                            {
                                name: 'Starter',
                                price: '$16.99',
                                blurb: '5 GB high-speed + unlimited 256 Kbps',
                                cta: 'Get Starter',
                                popular: false,
                            },
                            {
                                name: 'Everyday',
                                price: '$29.99',
                                blurb: '10 GB high-speed + unlimited 256 Kbps',
                                cta: 'Get Everyday',
                                popular: true,
                            },
                            {
                                name: 'Power',
                                price: '$49.99',
                                blurb: '20 GB high-speed + unlimited 256 Kbps',
                                cta: 'Get Power',
                                popular: false,
                            },
                        ].map((p) => (
                            <div
                                key={p.name}
                                className={`flex h-full w-full min-w-0 flex-col rounded-xl border bg-white p-3.5 shadow-sm sm:p-4 md:min-h-[19rem] md:rounded-2xl md:p-5 ${
                                    p.popular
                                        ? 'border-[#F27420] ring-2 ring-[#F27420]/30 bg-orange-50/40'
                                        : 'border-gray-200'
                                }`}
                            >
                                <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                                    <h3 className="text-sm font-bold text-[#0A1128] sm:text-base md:text-lg">{p.name}</h3>
                                    {p.popular && (
                                        <span className="shrink-0 rounded-full bg-[#F27420] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white sm:px-2 sm:text-[9px]">
                                            Most popular
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1.5 text-lg font-extrabold leading-tight text-[#0A1128] sm:mt-2 sm:text-xl md:mt-3 md:text-2xl">
                                    {p.price}
                                    <span className="text-xs font-semibold text-gray-500 sm:text-sm"> / mo</span>
                                </p>
                                <p className="mt-1 text-[0.8125rem] leading-snug text-gray-600 sm:mt-2 sm:text-sm">{p.blurb}</p>
                                <p className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-500 sm:mt-1.5 sm:text-[10px]">
                                    AT&amp;T &amp; Verizon
                                </p>
                                <a
                                    href={AMAZON_SIM_PRIMARY_PRODUCT_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-bold transition sm:min-h-11 sm:rounded-xl sm:py-2.5 sm:text-sm md:mt-auto md:min-h-12 md:py-3 ${
                                        p.popular
                                            ? 'bg-[#F27420] text-white hover:brightness-105'
                                            : 'bg-[#0A1128] text-white hover:bg-[#121f45]'
                                    }`}
                                >
                                    {p.cta}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 5. CTA + footer (navy) — fluid type, stacked footer on mobile ─── */}
            <section className="bg-[#0A1128] text-white">
                <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
                    <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">
                        Ready in two taps.
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg px-1 text-base text-gray-300 sm:mt-4 sm:text-lg">
                        Pick your trip, your device, or your stay. We&apos;ll handle the connection.
                    </p>
                    <div className="mt-6 flex w-full min-w-0 flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-4">
                        <a
                            href={APP_PATH}
                            onClick={signInGate.gateClick}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F27420] px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-105 sm:min-h-14 sm:px-8 sm:py-4 sm:text-base"
                        >
                            Get started
                        </a>
                        <a
                            href={APP_SUPPORT_CHAT_HREF}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-white bg-transparent px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 sm:min-h-14 sm:px-8 sm:py-4 sm:text-base"
                        >
                            {t('marketing.home_ready_talk')}
                        </a>
                    </div>
                </div>
                <footer className="border-t border-gray-700 px-4 py-8 pb-safe-bottom sm:px-6 md:px-8 md:py-10">
                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 text-sm text-gray-300 min-[480px]:grid-cols-2 md:grid-cols-5">
                        <div className="min-w-0 min-[480px]:col-span-2 md:col-span-1">
                            <FooterWordmarkLink />
                            <p className="text-sm text-gray-400 sm:text-sm">
                                Connectivity for travelers, residents, and the people in between.
                            </p>
                        </div>
                        <FooterColumn
                            title="Travel"
                            links={[
                                { label: 'Global eSIM', href: '/travel-esim' },
                                { label: 'Japan eSIM', href: '/travel-esim/jp' },
                                { label: 'UK eSIM', href: '/travel-esim/gb' },
                                { label: 'Mexico eSIM', href: '/travel-esim/mx' },
                                { label: 'Top up data', href: '/top-up' },
                            ]}
                        />
                        <FooterColumn
                            title="SIM cards"
                            links={[
                                { label: t('marketing.footer_link_phone'), href: '/sim/phone' },
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
                    <div className="mx-auto mt-6 flex max-w-6xl flex-col justify-between gap-2 border-t border-gray-700 pt-6 text-[11px] text-gray-500 sm:mt-8 sm:gap-3 sm:text-xs md:flex-row md:items-center">
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
