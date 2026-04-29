import React, { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BadgeCheck,
    CheckCircle2,
    Globe,
    ShoppingCart,
    Star,
} from 'lucide-react';

const SLIDE_DURATION_MS = 8000;

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

/** Home hero: selling slides, full-width progress line (no arrows), imagery + shared CTAs. */
export function MarketingHeroCarousel(props: MarketingHeroCarouselProps) {
    const { t } = useTranslation();
    const { amazonUrl, travelLanding, activatePath, onTravelClick, onActivateClick } = props;
    const reducedMotion = usePrefersReducedMotion();
    const [index, setIndex] = useState(0);
    const [progressBurst, setProgressBurst] = useState(0);
    const regionId = useId();

    const selectSlide = useCallback((i: number) => {
        setIndex(i);
    }, []);

    useEffect(() => {
        setProgressBurst((b) => b + 1);
    }, [index]);

    const goNext = useCallback(() => {
        setIndex((i) => (i + 1) % SLIDE_COUNT);
    }, []);

    useEffect(() => {
        if (reducedMotion) return undefined;
        const timer = window.setInterval(() => goNext(), SLIDE_DURATION_MS);
        return () => window.clearInterval(timer);
    }, [reducedMotion, goNext]);

    const line1Keys = ['marketing.home_hero_stay', 'marketing.hero_slide2_stay', 'marketing.hero_slide3_stay'] as const;
    const line2Keys = ['marketing.home_hero_anywhere', 'marketing.hero_slide2_accent', 'marketing.hero_slide3_accent'] as const;
    const subKeys = ['marketing.home_hero_sub', 'marketing.hero_slide2_sub', 'marketing.hero_slide3_sub'] as const;

    const visual = MARKETING_HERO_VISUAL_SLIDES[index];

    return (
        <div className="w-full">
            <div
                className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12"
                role="region"
                aria-roledescription="carousel"
                aria-labelledby={regionId}
            >
                <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
                    <span id={regionId} className="sr-only">
                        {t('marketing.hero_carousel_region')}
                    </span>

                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700 sm:mb-4">
                        <Star className="h-3 w-3 shrink-0" fill="currentColor" />
                        {t('marketing.home_badge')}
                    </div>

                    <div className="min-h-[11.5rem] w-full max-w-xl sm:min-h-[10.5rem] md:min-h-[12rem]" aria-live={reducedMotion ? 'polite' : 'off'}>
                        <div key={index}>
                            <h1 className="text-pretty text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl md:text-6xl md:leading-[1.1]">
                                <span className="block">{t(line1Keys[index])}</span>
                                <span className="mt-1 block bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent md:mt-1.5">
                                    {t(line2Keys[index])}
                                </span>
                            </h1>
                            <p className="mx-auto mt-4 max-w-md px-1 text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg lg:mx-0 lg:max-w-xl lg:px-0">
                                {t(subKeys[index])}
                            </p>
                        </div>
                    </div>

                    {/* Imagery below copy on mobile/tablet — matches slide theme */}
                    <div className="mt-7 w-full lg:hidden">
                        <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-1 ring-gray-100">
                            <img
                                key={`m-${visual.src}-${index}`}
                                src={visual.src}
                                alt={t(visual.altKey)}
                                sizes="100vw"
                                className="h-full w-full object-cover object-center"
                                decoding="async"
                                loading="eager"
                                fetchPriority={index === 0 ? 'high' : 'auto'}
                            />
                        </div>
                    </div>

                    {/* Progress line matches CTA width (max-w-md); tap zones for slide jump */}
                    <div className="mx-auto mt-7 w-full max-w-md sm:mt-8 lg:mx-0">
                        {!reducedMotion ? (
                            <div className="relative w-full">
                                <div className="h-2 w-full rounded-full bg-gray-100 shadow-inner md:h-2.5">
                                    <div
                                        key={`bar-${progressBurst}`}
                                        className="marketing-hero-progress-fill h-full rounded-full bg-gradient-to-r from-orange-500 via-[#FF6600] to-amber-400"
                                        style={{ animationDuration: `${SLIDE_DURATION_MS}ms` }}
                                    />
                                </div>
                                <div
                                    className="absolute inset-x-0 bottom-0 top-[-10px] flex sm:top-[-12px]"
                                    role="group"
                                    aria-label={t('marketing.hero_carousel_dots')}
                                >
                                    {Array.from({ length: SLIDE_COUNT }, (_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className={`flex-1 touch-manipulation rounded-sm border-0 bg-transparent px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 ${
                                                i === index ? 'cursor-default' : 'cursor-pointer'
                                            }`}
                                            aria-current={i === index ? true : undefined}
                                            aria-label={t('marketing.hero_carousel_slide_label', {
                                                current: i + 1,
                                                total: SLIDE_COUNT,
                                            })}
                                            onClick={() => selectSlide(i)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex gap-2 sm:gap-3"
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
                                        className={`h-2 flex-1 rounded-full transition-colors sm:h-2.5 ${
                                            i === index ? 'bg-[#FF6600]' : 'bg-gray-200 hover:bg-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 w-full max-w-md sm:mt-9">
                        <a
                            href={travelLanding}
                            onClick={onTravelClick}
                            className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition active:scale-[0.98] sm:min-h-14 sm:text-base"
                        >
                            <Globe className="h-[18px] w-[18px] shrink-0" />
                            {t('marketing.home_travel_esim')}
                        </a>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <a
                                href={amazonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition active:scale-[0.98] sm:min-h-14 sm:text-base"
                                aria-label={t('marketing.buy_sim_card_aria')}
                            >
                                <ShoppingCart className="h-[18px] w-[18px] shrink-0" />
                                {t('marketing.buy_sim_card')}
                            </a>
                            <a
                                href={activatePath}
                                onClick={onActivateClick}
                                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition active:scale-[0.98] sm:min-h-14 sm:text-base"
                            >
                                <BadgeCheck className="h-[18px] w-[18px] shrink-0" />
                                {t('marketing.home_activate')}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Desktop: photo column — 50/50 grid so art reads at parity with copy */}
                <div className="relative hidden w-full min-w-0 lg:block">
                    <div className="sticky top-24 overflow-hidden rounded-2xl bg-gray-100 shadow-lg ring-1 ring-gray-200/80 aspect-[3/4] min-h-[min(28rem,55vh)] w-full max-h-[min(640px,72vh)]">
                        <img
                            key={`d-${visual.src}-${index}`}
                            src={visual.src}
                            alt={t(visual.altKey)}
                            sizes="(min-width: 1024px) min(46vw, 560px), 0px"
                            className="h-full w-full min-h-[20rem] object-cover object-center"
                            decoding="async"
                            loading="eager"
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-6 flex w-full min-w-0 max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-1 text-[clamp(0.65rem,2.2vw,0.875rem)] text-slate-500 sm:mt-8 sm:gap-x-3 sm:gap-y-0 sm:text-sm lg:mt-10">
                <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                    {t('marketing.trust_no_contracts')}
                </span>
                <span className="inline-flex items-center gap-1 sm:ml-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                    {t('marketing.trust_no_hidden_fees')}
                </span>
                <span className="inline-flex items-center gap-1 sm:ml-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                    {t('marketing.trust_support')}
                </span>
            </div>
        </div>
    );
}
