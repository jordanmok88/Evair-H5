import React, { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BadgeCheck,
    CheckCircle2,
    Globe,
    ShoppingCart,
    Star,
} from 'lucide-react';

/** Seconds between carousel steps (each advance picks a delay in this range). */
const SLIDE_INTERVAL_MIN_MS = 3000;
const SLIDE_INTERVAL_MAX_MS = 5000;

function nextSlideDelayMs(): number {
    const r = SLIDE_INTERVAL_MIN_MS + Math.random() * (SLIDE_INTERVAL_MAX_MS - SLIDE_INTERVAL_MIN_MS);
    return Math.round(r);
}

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const apply = () => setReduced(mq.matches);
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
    }, []);
    return reduced;
}

/**
 * Hero art per slide (Unsplash). Use stable `ixlib=rb-4.0.3` URLs — some bare `photo-…` IDs 404 over time.
 * Slide 2 was updated after a dead asset caused broken images on desktop.
 */
export const MARKETING_HERO_VISUAL_SLIDES = [
    {
        src: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=82',
        altKey: 'marketing.hero_slide1_img_alt' as const,
    },
    {
        src: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=82',
        altKey: 'marketing.hero_slide2_img_alt' as const,
    },
    {
        src: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=82',
        altKey: 'marketing.hero_slide3_img_alt' as const,
    },
] as const;

export interface MarketingHeroCarouselProps {
    amazonUrl: string;
    travelLanding: string;
    activatePath: string;
    onTravelClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    onActivateClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const SLIDE_COUNT = MARKETING_HERO_VISUAL_SLIDES.length;

function HeroTrustStrip({
    className,
    id,
}: {
    className?: string;
    /** Optional id so one strip can aria-labelledby for screen readers when both exist in DOM (only one visible). */
    id?: string;
}) {
    const { t } = useTranslation();
    return (
        <div
            id={id}
            className={`flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[clamp(0.625rem,2vw,0.8125rem)] text-slate-500 sm:gap-x-2.5 sm:text-sm [&_svg]:mt-px ${className ?? ''}`}
        >
            <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500 sm:h-3.5 sm:w-3.5" aria-hidden />
                {t('marketing.trust_no_contracts')}
            </span>
            <span className="inline-flex items-center gap-1 sm:ml-0.5">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500 sm:h-3.5 sm:w-3.5" aria-hidden />
                {t('marketing.trust_no_hidden_fees')}
            </span>
            <span className="inline-flex items-center gap-1 sm:ml-0.5">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500 sm:h-3.5 sm:w-3.5" aria-hidden />
                {t('marketing.trust_support')}
            </span>
        </div>
    );
}

/** Home hero: selling slides; three striped indicators (jump, no sweeping bar), imagery + CTAs. */
export function MarketingHeroCarousel(props: MarketingHeroCarouselProps) {
    const { t } = useTranslation();
    const { amazonUrl, travelLanding, activatePath, onTravelClick, onActivateClick } = props;
    const reducedMotion = usePrefersReducedMotion();
    const [index, setIndex] = useState(0);
    const regionId = useId();

    const selectSlide = useCallback((i: number) => {
        setIndex(i);
    }, []);

    const goNext = useCallback(() => {
        setIndex((i) => (i + 1) % SLIDE_COUNT);
    }, []);

    useEffect(() => {
        if (reducedMotion) return undefined;
        const id = window.setTimeout(() => {
            goNext();
        }, nextSlideDelayMs());
        return () => window.clearTimeout(id);
    }, [index, reducedMotion, goNext]);

    const line1Keys = ['marketing.home_hero_stay', 'marketing.hero_slide2_stay', 'marketing.hero_slide3_stay'] as const;
    const line2Keys = ['marketing.home_hero_anywhere', 'marketing.hero_slide2_accent', 'marketing.hero_slide3_accent'] as const;
    const subKeys = ['marketing.home_hero_sub', 'marketing.hero_slide2_sub', 'marketing.hero_slide3_sub'] as const;

    const visual = MARKETING_HERO_VISUAL_SLIDES[index];

    return (
        <div className="w-full">
            <div
                className="grid w-full items-start gap-4 sm:gap-5 lg:grid-cols-2 lg:items-center lg:gap-6 xl:gap-8"
                role="region"
                aria-roledescription="carousel"
                aria-labelledby={regionId}
            >
                <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
                    <span id={regionId} className="sr-only">
                        {t('marketing.hero_carousel_region')}
                    </span>

                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 sm:mb-2.5 sm:gap-2 sm:px-3 sm:py-1 sm:text-xs">
                        <Star className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" fill="currentColor" />
                        {t('marketing.home_badge')}
                    </div>

                    <div className="min-h-[9rem] w-full max-w-xl sm:min-h-[8.75rem] md:min-h-[9rem]" aria-live={reducedMotion ? 'polite' : 'off'}>
                        <div key={index}>
                            <h1 className="text-pretty text-[1.6875rem] font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl md:text-5xl md:leading-[1.08]">
                                <span className="block">{t(line1Keys[index])}</span>
                                <span className="mt-0.5 block bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent sm:mt-1 md:mt-1.5">
                                    {t(line2Keys[index])}
                                </span>
                            </h1>
                            <p className="mx-auto mt-2 max-w-md px-0 text-sm leading-snug text-slate-600 sm:mt-3 sm:text-base sm:leading-relaxed md:text-[1.0625rem] lg:mx-0 lg:max-w-xl">
                                {t(subKeys[index])}
                            </p>
                        </div>
                    </div>

                    {/* Trust line before hero art on small screens — keeps conversion points above the fold */}
                    <HeroTrustStrip
                        id="marketing-hero-trust"
                        className="mt-3 max-w-xl px-1 lg:hidden"
                    />

                    {/* Imagery below copy on mobile/tablet — capped height keeps trust + CTAs in first screen */}
                    <div className="mt-4 w-full sm:mt-5 lg:hidden">
                        <div className="relative h-[clamp(9rem,38vmin,240px)] w-full overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-1 ring-gray-100 sm:h-[clamp(10rem,40vmin,280px)]">
                            <img
                                key={`m-${visual.src}-${index}`}
                                src={visual.src}
                                alt={t(visual.altKey)}
                                sizes="100vw"
                                className="absolute inset-0 h-full w-full object-cover object-center"
                                decoding="async"
                                loading="eager"
                                fetchPriority={index === 0 ? 'high' : 'auto'}
                            />
                        </div>
                    </div>

                    {/* Three stripes — active one fills brand orange; advances every 3–5s (no sweep animation) */}
                    <div
                        className="mx-auto mt-4 flex w-full max-w-md gap-2 sm:mt-5 sm:gap-2.5 lg:mx-0"
                        role="group"
                        aria-label={t('marketing.hero_carousel_dots')}
                    >
                        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => selectSlide(i)}
                                aria-current={i === index ? true : undefined}
                                aria-label={t('marketing.hero_carousel_slide_label', {
                                    current: i + 1,
                                    total: SLIDE_COUNT,
                                })}
                                className={`h-2 min-h-[8px] flex-1 touch-manipulation rounded-full border-0 shadow-inner outline-none transition-colors duration-75 focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 sm:h-2.5 ${
                                    i === index
                                        ? 'cursor-default bg-gradient-to-r from-orange-500 to-amber-400 shadow-sm'
                                        : 'cursor-pointer bg-gray-200 hover:bg-gray-300'
                                }`}
                            />
                        ))}
                    </div>

                    <div className="mt-5 w-full max-w-md sm:mt-6">
                        <a
                            href={travelLanding}
                            onClick={onTravelClick}
                            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition active:scale-[0.98] sm:min-h-12 sm:px-5 sm:py-3 sm:text-base"
                        >
                            <Globe className="h-[18px] w-[18px] shrink-0" />
                            {t('marketing.home_travel_esim')}
                        </a>
                        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:mt-3 sm:grid-cols-2 sm:gap-3">
                            <a
                                href={amazonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition active:scale-[0.98] sm:min-h-12 sm:py-3 sm:text-base"
                                aria-label={t('marketing.buy_sim_card_aria')}
                            >
                                <ShoppingCart className="h-[18px] w-[18px] shrink-0" />
                                {t('marketing.buy_sim_card')}
                            </a>
                            <a
                                href={activatePath}
                                onClick={onActivateClick}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition active:scale-[0.98] sm:min-h-12 sm:py-3 sm:text-base"
                            >
                                <BadgeCheck className="h-[18px] w-[18px] shrink-0" />
                                {t('marketing.home_activate')}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Desktop: shorter max height vs viewport so trust row stays above the fold on common laptop sizes */}
                <div className="relative hidden w-full min-w-0 lg:block">
                    <div className="sticky top-[4.25rem] max-h-[min(28rem,min(62dvh,calc(100dvh-10.5rem)))] overflow-hidden rounded-2xl bg-gray-100 shadow-lg ring-1 ring-gray-200/80 aspect-[5/6] min-h-[16rem] w-full xl:aspect-[4/5] xl:max-h-[min(32rem,min(65dvh,calc(100dvh-9.5rem)))]">
                        <img
                            key={`d-${visual.src}-${index}`}
                            src={visual.src}
                            alt={t(visual.altKey)}
                            sizes="(min-width: 1024px) min(46vw, 560px), 0px"
                            className="h-full w-full min-h-[14rem] object-cover object-center"
                            decoding="async"
                            loading="eager"
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                        />
                    </div>
                </div>
            </div>

            {/* Full-width trust row on lg+ (mobile shows strip above hero image inside the carousel column). */}
            <HeroTrustStrip className="mt-5 hidden px-2 sm:mt-6 lg:flex xl:mt-7" />
        </div>
    );
}
