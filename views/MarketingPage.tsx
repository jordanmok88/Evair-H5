/**
 * Marketing landing page — apex `evairdigital.com` and `/welcome`.
 * Hero uses a selling-point carousel (`MarketingHeroCarousel`) + shared CTAs; sections below unchanged.
 * Data-only product — no voice/SMS.
 */

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronRight, Star } from 'lucide-react';
import { applyPageSeo } from '../utils/seoHead';
import { isMobileDevice } from '../utils/device';
import { useMobileSignInGate } from '../hooks/useMobileSignInGate';
import MobileOnlyNotice from '../components/marketing/MobileOnlyNotice';
import { MarketingHeroCarousel } from '../components/marketing/MarketingHeroCarousel';
import { OpenAppHeaderButton } from '../components/marketing/OpenAppHeaderButton';
import { FooterWordmarkLink } from '../components/marketing/FooterWordmarkLink';
import { AMAZON_SIM_PRIMARY_PRODUCT_URL, AMAZON_SIM_STOREFRONT_URL } from '../constants';

const APP_PATH = '/app';
const ACTIVATE_PATH = '/activate';
const TRAVEL_ESIM_LANDING = '/travel-esim';

const goActivateCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobileDevice()) {
        e.preventDefault();
        window.location.assign(`${APP_PATH}#bind-sim`);
    }
};

/** Testimonial strip — quotes in English (US site); names/locations kept short. */
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

const MarketingPage: React.FC = () => {
    const { t } = useTranslation();
    const signInGate = useMobileSignInGate(APP_PATH);

    useEffect(() => {
        const path = typeof window !== 'undefined' ? window.location.pathname : '/';
        const canonicalPath = path === '' ? '/' : path;
        applyPageSeo({
            path: canonicalPath,
            title: 'Evair — Mobile data, simplified',
            description:
                'Travel eSIMs for short trips and US 5G data for long stays. Data-only plans, no contract, instant activation on evairdigital.com.',
        });
    }, []);

    const whyCards = useMemo(
        () =>
            [
                {
                    gradient: 'from-orange-500 via-amber-400 to-yellow-300',
                    tag: t('marketing.home_why_coverage_tag'),
                    title: t('marketing.home_why_coverage_h'),
                    body: t('marketing.home_why_coverage_p'),
                    href: TRAVEL_ESIM_LANDING,
                },
                {
                    gradient: 'from-emerald-500 via-teal-400 to-cyan-300',
                    tag: t('marketing.home_why_pricing_tag'),
                    title: t('marketing.home_why_pricing_h'),
                    body: t('marketing.home_why_pricing_p'),
                    href: '/sim/phone',
                },
                {
                    gradient: 'from-sky-500 via-blue-500 to-indigo-400',
                    tag: t('marketing.home_why_support_tag'),
                    title: t('marketing.home_why_support_h'),
                    body: t('marketing.home_why_support_p'),
                    href: `${APP_PATH}#contact`,
                },
                {
                    gradient: 'from-amber-500 via-orange-400 to-rose-400',
                    tag: t('marketing.home_why_speed_tag'),
                    title: t('marketing.home_why_speed_h'),
                    body: t('marketing.home_why_speed_p'),
                    href: ACTIVATE_PATH,
                    onClick: goActivateCta,
                },
            ] as const,
        [t],
    );

    const planCards = useMemo(
        () => [
            {
                name: t('marketing.home_plan_starter'),
                price: '$16.99',
                blurb: t('marketing.home_plan_blurb_starter'),
                cta: t('marketing.home_plan_cta_starter'),
                popular: false,
            },
            {
                name: t('marketing.home_plan_everyday'),
                price: '$29.99',
                blurb: t('marketing.home_plan_blurb_everyday'),
                cta: t('marketing.home_plan_cta_everyday'),
                popular: true,
            },
            {
                name: t('marketing.home_plan_power'),
                price: '$49.99',
                blurb: t('marketing.home_plan_blurb_power'),
                cta: t('marketing.home_plan_cta_power'),
                popular: false,
            },
        ],
        [t],
    );

    return (
        <div className="min-h-screen overflow-x-hidden bg-white text-gray-900 antialiased [text-rendering:optimizeLegibility]">
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
                            Travel eSIM
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

            <section className="bg-white px-4 py-6 sm:px-5 sm:py-8 md:px-6 md:py-10 lg:py-11">
                <div className="mx-auto w-full min-w-0 max-w-6xl">
                    <MarketingHeroCarousel
                        amazonUrl={AMAZON_SIM_STOREFRONT_URL}
                        travelLanding={TRAVEL_ESIM_LANDING}
                        activatePath={ACTIVATE_PATH}
                        onActivateClick={goActivateCta}
                    />
                </div>
            </section>

            <section id="stories" className="border-t border-gray-100 bg-white px-4 py-10 sm:px-5 md:px-8 md:py-14">
                <div className="mx-auto min-w-0 max-w-6xl">
                    <h2 className="text-left text-lg font-extrabold text-gray-900 sm:text-xl md:text-2xl">
                        {t('marketing.home_stories_title')}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
                        {t('marketing.home_stories_sub')}
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
                                        className="h-full w-full object-contain object-center transition duration-500 group-hover:scale-[1.03]"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <div className="flex min-h-0 flex-1 flex-col p-3.5 sm:p-4">
                                    <StarRow compact />
                                    <p className="mt-2 min-h-[4.25rem] text-[0.8125rem] font-semibold leading-snug text-gray-800 [overflow-wrap:anywhere] sm:min-h-[4.5rem] sm:text-sm">
                                        &ldquo;{s.quote}&rdquo;
                                    </p>
                                    <p className="mt-1.5 text-[11px] font-medium text-gray-500 sm:text-xs">{s.who}</p>
                                    <a
                                        href="/blog"
                                        className="mt-auto inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-900 bg-white py-2 text-xs font-bold text-gray-900 transition hover:bg-gray-50"
                                    >
                                        {t('marketing.home_stories_cta')}
                                    </a>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="why" className="border-t border-gray-100 bg-gray-50 px-4 py-10 sm:px-5 md:px-8 md:py-12">
                <div className="mx-auto w-full min-w-0 max-w-6xl">
                    <h2 className="text-left text-lg font-extrabold text-gray-900 sm:text-xl md:text-2xl">
                        {t('marketing.home_why_title')}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
                        {t('marketing.home_why_sub')}
                    </p>
                    <div className="mt-6 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 min-[400px]:gap-4 sm:mt-7 md:mt-8 md:gap-5">
                        {whyCards.map((c) => (
                            <a
                                key={c.title}
                                href={c.href}
                                onClick={c.onClick}
                                className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-gray-200/80 transition hover:shadow-md hover:ring-[#F27420]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] active:scale-[0.99] min-[400px]:min-h-[8.5rem] min-[400px]:p-4 sm:p-5 md:min-h-0"
                            >
                                <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${c.gradient}`} aria-hidden />
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-400 md:text-[10px]">{c.tag}</p>
                                <h3 className="mt-1.5 text-sm font-bold leading-tight text-gray-900 sm:mt-2 sm:text-base md:text-lg">
                                    {c.title}
                                </h3>
                                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-gray-600 sm:mt-2 sm:text-sm">
                                    {c.body}
                                </p>
                                <div className="mt-3 flex items-center justify-end text-[#F27420] transition group-hover:translate-x-0.5 sm:mt-4" aria-hidden>
                                    <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <section id="compare" className="border-t border-gray-100 bg-slate-50 px-4 py-10 sm:px-5 md:px-8 md:py-12">
                <div className="mx-auto w-full min-w-0 max-w-6xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 sm:text-xs">
                        {t('marketing.home_plans_eyebrow')}
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-gray-900 sm:text-xl md:text-2xl">
                        {t('marketing.home_plans_title')}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
                        {t('marketing.home_plans_sub')}
                    </p>

                    <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:gap-3 md:mt-6 md:grid md:grid-cols-3 md:gap-4 md:items-stretch">
                        {planCards.map((p) => (
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
                                            {t('marketing.home_plan_popular')}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1.5 text-lg font-extrabold leading-tight text-[#0A1128] sm:mt-2 sm:text-xl md:mt-3 md:text-2xl">
                                    {p.price}
                                    <span className="text-xs font-semibold text-gray-500 sm:text-sm"> {t('marketing.home_plan_suffix')}</span>
                                </p>
                                <p className="mt-1 text-[0.8125rem] leading-snug text-gray-600 sm:mt-2 sm:text-sm">{p.blurb}</p>
                                <p className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-500 sm:mt-1.5 sm:text-[10px]">
                                    {t('marketing.home_plan_carriers')}
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

            <section className="bg-[#0A1128] text-white">
                <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
                    <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">{t('marketing.home_ready_title')}</h2>
                    <p className="mx-auto mt-3 max-w-lg px-1 text-base text-gray-300 sm:mt-4 sm:text-lg">
                        {t('marketing.home_ready_sub')}
                    </p>
                    <div className="mt-6 flex w-full min-w-0 flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-4">
                        <a
                            href={APP_PATH}
                            onClick={signInGate.gateClick}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F27420] px-6 py-3.5 text-sm font-bold text-white transition hover:brightness-105 sm:min-h-14 sm:px-8 sm:py-4 sm:text-base"
                        >
                            {t('marketing.home_ready_get_started')} <ArrowRight className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                        </a>
                        <a
                            href="mailto:service@evairdigital.com"
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
                            <p className="text-sm text-gray-400 sm:text-sm">{t('marketing.home_footer_tagline')}</p>
                        </div>
                        <FooterColumn
                            title={t('marketing.footer_col_travel')}
                            links={[
                                { label: t('marketing.footer_link_travel_esim'), href: '/travel-esim' },
                                { label: t('marketing.footer_link_jp'), href: '/travel-esim/jp' },
                                { label: t('marketing.footer_link_uk'), href: '/travel-esim/gb' },
                                { label: t('marketing.footer_link_mx'), href: '/travel-esim/mx' },
                                { label: t('marketing.footer_link_topup'), href: '/top-up' },
                            ]}
                        />
                        <FooterColumn
                            title={t('marketing.footer_col_us')}
                            links={[
                                { label: t('marketing.footer_link_phone'), href: '/sim/phone' },
                                { label: t('marketing.footer_link_camera'), href: '/sim/camera' },
                                { label: t('marketing.footer_link_iot'), href: '/sim/iot' },
                                { label: t('marketing.footer_link_activate'), href: ACTIVATE_PATH, onClick: goActivateCta },
                            ]}
                        />
                        <FooterColumn
                            title={t('marketing.footer_col_resources')}
                            links={[
                                { label: t('marketing.footer_link_help'), href: '/help' },
                                { label: t('marketing.footer_link_install'), href: '/help/install-esim-iphone' },
                                { label: t('marketing.footer_link_refund_policy'), href: '/help/refund-policy' },
                                { label: t('marketing.footer_link_blog'), href: '/blog' },
                            ]}
                        />
                        <FooterColumn
                            title={t('marketing.footer_col_legal')}
                            links={[
                                { label: t('marketing.footer_link_terms'), href: '/legal/terms' },
                                { label: t('marketing.footer_link_privacy'), href: '/legal/privacy' },
                                { label: t('marketing.footer_link_refund'), href: '/legal/refund' },
                            ]}
                        />
                    </div>
                    <div className="mx-auto mt-6 flex max-w-6xl flex-col justify-between gap-2 border-t border-gray-700 pt-6 text-[11px] text-gray-500 sm:mt-8 sm:gap-3 sm:text-xs md:flex-row md:items-center">
                        <span>{t('marketing.home_footer_copyright', { year: new Date().getFullYear() })}</span>
                        <span>{t('marketing.home_footer_made')}</span>
                    </div>
                </footer>
            </section>

            <MobileOnlyNotice open={signInGate.open} onClose={signInGate.onClose} onContinueAnyway={signInGate.onContinueAnyway} />
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

export default MarketingPage;
