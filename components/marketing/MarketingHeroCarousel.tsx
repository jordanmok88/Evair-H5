import React, { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BadgeCheck,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Globe,
    ShoppingCart,
    Smartphone,
    Star,
    Zap,
} from 'lucide-react';

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

const SLIDE_ICONS = [Globe, Zap, Smartphone] as const;

export interface MarketingHeroCarouselProps {
    amazonUrl: string;
    travelLanding: string;
    activatePath: string;
    onTravelClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    onActivateClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const SLIDE_COUNT = SLIDE_ICONS.length;

/** Home hero: selling-point slides + shared CTAs capped to max-w-md. Auto-advance off when prefers-reduced-motion. */
export function MarketingHeroCarousel(props: MarketingHeroCarouselProps) {
    const { t } = useTranslation();
    const { amazonUrl, travelLanding, activatePath, onTravelClick, onActivateClick } = props;
    const reducedMotion = usePrefersReducedMotion();
    const [index, setIndex] = useState(0);
    const regionId = useId();

    const goPrev = useCallback(() => {
        setIndex((i) => (i - 1 + SLIDE_COUNT) % SLIDE_COUNT);
    }, []);

    const goNext = useCallback(() => {
        setIndex((i) => (i + 1) % SLIDE_COUNT);
    }, []);

    useEffect(() => {
        if (reducedMotion) return undefined;
        const timer = window.setInterval(goNext, 8000);
        return () => window.clearInterval(timer);
    }, [reducedMotion, goNext]);

    const line1Keys = ['marketing.home_hero_stay', 'marketing.hero_slide2_stay', 'marketing.hero_slide3_stay'] as const;
    const line2Keys = ['marketing.home_hero_anywhere', 'marketing.hero_slide2_accent', 'marketing.hero_slide3_accent'] as const;
    const subKeys = ['marketing.home_hero_sub', 'marketing.hero_slide2_sub', 'marketing.hero_slide3_sub'] as const;

    const gradients = [
        'from-orange-50 to-amber-100',
        'from-emerald-50 to-teal-50',
        'from-slate-100 to-orange-50',
    ] as const;
    const SlideIcon = SLIDE_ICONS[index];

    return (
        <div className="w-full">
            <div
                className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_min(240px,34%)] lg:gap-10 xl:gap-12"
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

                    <div className="min-h-[13rem] w-full max-w-xl sm:min-h-[12rem]" aria-live={reducedMotion ? 'polite' : 'off'}>
                        <div key={index}>
                            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                                <span className="block">{t(line1Keys[index])}</span>
                                <span className="mt-1 block bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
                                    {t(line2Keys[index])}
                                </span>
                            </h1>
                            <p className="mt-4 max-w-md px-1 text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg lg:mx-0 lg:max-w-xl lg:px-0">
                                {t(subKeys[index])}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-8">
                        <div className="flex w-full items-center justify-center gap-2 lg:justify-start">
                            <button
                                type="button"
                                onClick={goPrev}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
                                aria-label={t('marketing.hero_carousel_prev')}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <nav className="flex gap-2" aria-label={t('marketing.hero_carousel_dots')} role="navigation">
                                {Array.from({ length: SLIDE_COUNT }, (_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        aria-current={i === index ? true : undefined}
                                        aria-label={t('marketing.hero_carousel_slide_label', {
                                            current: i + 1,
                                            total: SLIDE_COUNT,
                                        })}
                                        className={`h-2 rounded-full transition-all ${
                                            i === index ? 'w-7 bg-orange-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
                                        }`}
                                        onClick={() => setIndex(i)}
                                    />
                                ))}
                            </nav>
                            <button
                                type="button"
                                onClick={goNext}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
                                aria-label={t('marketing.hero_carousel_next')}
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mx-auto w-full lg:mx-0">
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
                </div>

                <div className="hidden min-h-[14rem] lg:flex lg:items-center lg:justify-center" aria-hidden>
                    <div className={`flex w-full max-w-[280px] items-center justify-center rounded-2xl bg-gradient-to-br p-10 shadow-inner ${gradients[index]}`}>
                        <SlideIcon className="h-24 w-24 text-[#FF6600]" strokeWidth={1.15} />
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
