import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CheckCircle2, Coins, Globe, ShoppingCart, Star } from 'lucide-react';

/** Autoplay spacing (≥4s): each advance picks a delay in this range. */
const SLIDE_INTERVAL_MIN_MS = 4300;
const SLIDE_INTERVAL_MAX_MS = 5200;

/** Minimum horizontal drag (px) before a touch is treated as a slide swipe (not a tap). */
const MOBILE_SWIPE_MIN_PX = 48;

const PLAN_HREF_PHONE = '/sim/phone#plans';
const PLAN_HREF_IOT = '/sim/iot#plans';
const PLAN_HREF_CAMERA = '/sim/camera#plans';

/** Rounded frame only — border removed for cleaner photography presentation. */
const HERO_ART_FRAME_CLASS = 'overflow-hidden rounded-2xl';

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
 * Carousel order matches **`N-uuid.png` batch numbering (N = 1 … 9)**: trio first, then
 * `cell-01`→`cell-09` skips by content (see filenames → paths map below).
 * Caption / alt **`_1` … `_9`** keys always match **image subject**, not array index.
 * Headline bands: `Math.floor(slideIndex / 3)` cycles three homepage marketing lines.
 *
 * Filename → `public/marketing/` paths: **1** `hero-mobile-tablet-hotspot.png`; **2** `device-built-for/cell-01.png`;
 * **3** cell-07; **4** cell-02; **5** cell-03; **6** cell-08; **7** cell-09; **8** cell-06; **9** cell-04
 * (`cell-05` is POS-only on `/sim/iot`, not shown here).
 */
export const MARKETING_HERO_VISUAL_SLIDES = [
    {
        src: '/marketing/hero-mobile-tablet-hotspot.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_5' as const,
        captionKey: 'marketing.hero_slide_caption_5' as const,
        planHref: PLAN_HREF_PHONE,
    },
    {
        src: '/marketing/device-built-for/cell-01.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_1' as const,
        captionKey: 'marketing.hero_slide_caption_1' as const,
        planHref: PLAN_HREF_IOT,
    },
    {
        src: '/marketing/device-built-for/cell-07.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_7' as const,
        captionKey: 'marketing.hero_slide_caption_7' as const,
        planHref: PLAN_HREF_CAMERA,
    },
    {
        src: '/marketing/device-built-for/cell-02.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_2' as const,
        captionKey: 'marketing.hero_slide_caption_2' as const,
        planHref: PLAN_HREF_IOT,
    },
    {
        src: '/marketing/device-built-for/cell-03.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_3' as const,
        captionKey: 'marketing.hero_slide_caption_3' as const,
        planHref: PLAN_HREF_IOT,
    },
    {
        src: '/marketing/device-built-for/cell-08.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_8' as const,
        captionKey: 'marketing.hero_slide_caption_8' as const,
        planHref: PLAN_HREF_CAMERA,
    },
    {
        src: '/marketing/device-built-for/cell-09.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_9' as const,
        captionKey: 'marketing.hero_slide_caption_9' as const,
        planHref: PLAN_HREF_CAMERA,
    },
    {
        src: '/marketing/device-built-for/cell-06.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_6' as const,
        captionKey: 'marketing.hero_slide_caption_6' as const,
        planHref: PLAN_HREF_IOT,
    },
    {
        src: '/marketing/device-built-for/cell-04.png',
        altKey: 'marketing.hero_slide_mobile_img_alt_4' as const,
        captionKey: 'marketing.hero_slide_caption_4' as const,
        planHref: PLAN_HREF_IOT,
    },
] as const;

export interface MarketingHeroCarouselProps {
    amazonUrl: string;
    travelLanding: string;
    activatePath: string;
    /** Optional override; omit so Travel eSIM uses `travelLanding` (e.g. `/travel-esim`) on all devices. */
    onTravelClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
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

/** Fixed-height viewport + layered images cross-fade (~900ms) so aspect variance never collapses layout. */
function HeroSlidesCrossfade({
    activeIndex,
    variant,
    figureClassName,
    reducedMotion,
}: {
    activeIndex: number;
    variant: 'mobile' | 'desktop';
    figureClassName: string;
    reducedMotion: boolean;
}) {
    const { t } = useTranslation();
    const fade =
        reducedMotion ? 'transition-none duration-0' : 'transition-opacity duration-[900ms] ease-in-out';
    const hClass =
        variant === 'mobile'
            ? 'h-[240px] sm:h-[268px]'
            : 'h-[340px] min-h-[300px] lg:h-[380px] xl:h-[408px]';
    const activeCaption = MARKETING_HERO_VISUAL_SLIDES[activeIndex];
    const sizesAttr =
        variant === 'mobile' ? '100vw' : '(min-width: 1024px) min(46vw, 560px), 0px';

    return (
        <figure className={`relative ${figureClassName}`}>
            <div className={`relative w-full shrink-0 overflow-hidden ${hClass}`}>
                {MARKETING_HERO_VISUAL_SLIDES.map((slide, i) => (
                    <img
                        key={slide.src}
                        src={slide.src}
                        alt={i === activeIndex ? t(slide.altKey) : ''}
                        aria-hidden={i !== activeIndex}
                        sizes={sizesAttr}
                        className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-center ${fade} ${
                            i === activeIndex ? 'z-[1] opacity-100' : 'z-0 opacity-0'
                        }`}
                        decoding="async"
                        loading={i === 0 || i === activeIndex ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : 'auto'}
                    />
                ))}
                <div
                    className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/78 via-black/15 to-transparent"
                    aria-hidden
                />
            </div>
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] p-3 sm:p-4">
                <p className="text-left text-sm font-semibold leading-snug text-white drop-shadow-sm md:text-[15px] lg:text-base">
                    {t(activeCaption.captionKey)}
                </p>
            </figcaption>
        </figure>
    );
}

/** Home hero CTAs — shared `.btn` system; primary = gradient, secondary row = outline. */
const heroCtaPrimaryClass =
    'btn btn-primary !min-h-0 min-h-[2.5rem] w-full shrink-0 gap-2 px-2 py-2 text-[11px] font-bold leading-tight sm:min-h-11 sm:gap-1.5 sm:px-3 sm:text-sm';
const heroCtaSecondaryClass =
    'btn btn-outline !min-h-0 min-h-[2.5rem] w-full shrink-0 gap-1 px-2 py-2 text-[11px] font-bold leading-tight sm:min-h-11 sm:gap-1.5 sm:px-3 sm:text-sm';

/** Home hero: selling slides; striped indicators (jump, swipe on touch), imagery + CTAs. */
export function MarketingHeroCarousel(props: MarketingHeroCarouselProps) {
    const { t } = useTranslation();
    const { amazonUrl, travelLanding, activatePath, onTravelClick, onActivateClick } = props;
    const reducedMotion = usePrefersReducedMotion();
    const [index, setIndex] = useState(0);
    const regionId = useId();
    const mobileTouchStartX = useRef<number | null>(null);
    /** After a horizontal swipe, block the trailing synthetic click so the slide link doesn't fire. */
    const blockSlideLinkNavigateRef = useRef(false);

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

    const handleMobileSwipeStart = useCallback((e: React.TouchEvent) => {
        mobileTouchStartX.current = e.touches[0]?.clientX ?? null;
    }, []);

    const handleMobileSwipeEnd = useCallback(
        (e: React.TouchEvent) => {
            const start = mobileTouchStartX.current;
            mobileTouchStartX.current = null;
            const end = e.changedTouches[0]?.clientX;
            if (start == null || end == null) return;
            const dx = end - start;
            if (Math.abs(dx) < MOBILE_SWIPE_MIN_PX) return;
            blockSlideLinkNavigateRef.current = true;
            window.setTimeout(() => {
                blockSlideLinkNavigateRef.current = false;
            }, 450);
            if (dx < 0) {
                setIndex((i) => (i + 1) % SLIDE_COUNT);
            } else {
                setIndex((i) => (i - 1 + SLIDE_COUNT) % SLIDE_COUNT);
            }
        },
        [],
    );

    const onSlidePlanLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        if (blockSlideLinkNavigateRef.current) {
            e.preventDefault();
        }
    }, []);

    const line1Keys = ['marketing.home_hero_stay', 'marketing.hero_slide2_stay', 'marketing.hero_slide3_stay'] as const;
    const line2Keys = ['marketing.home_hero_anywhere', 'marketing.hero_slide2_accent', 'marketing.hero_slide3_accent'] as const;
    const subKeys = ['marketing.home_hero_sub', 'marketing.hero_slide2_sub', 'marketing.hero_slide3_sub'] as const;

    const headlineIndex = Math.min(2, Math.floor(index / 3)) as 0 | 1 | 2;
    const visual = MARKETING_HERO_VISUAL_SLIDES[index];

    const planLinkAria = t('marketing.hero_slide_open_plan_aria', {
        product: t(visual.captionKey),
    });

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
                        <div key={headlineIndex}>
                            <h1 className="text-pretty text-[1.6875rem] font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl md:text-5xl md:leading-[1.08]">
                                <span className="block">{t(line1Keys[headlineIndex])}</span>
                                <span className="mt-0.5 block bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent sm:mt-1 md:mt-1.5">
                                    {t(line2Keys[headlineIndex])}
                                </span>
                            </h1>
                            <p className="mx-auto mt-2 max-w-md px-0 text-sm leading-snug text-slate-600 sm:mt-3 sm:text-base sm:leading-relaxed md:text-[1.0625rem] lg:mx-0 lg:max-w-xl">
                                {t(subKeys[headlineIndex])}
                            </p>
                        </div>
                    </div>

                    {/* Trust strip before hero art on small screens. Chat: edge tab. */}
                    <div className="mt-3 w-full max-w-xl px-1 lg:hidden">
                        <HeroTrustStrip id="marketing-hero-trust" className="" />
                    </div>

                    {/* Touch swipe advances slides; tapping opens Pick a plan for that slide's category */}
                    <div
                        className="mt-4 w-full touch-pan-y sm:mt-5 lg:hidden"
                        onTouchStart={handleMobileSwipeStart}
                        onTouchEnd={handleMobileSwipeEnd}
                        role="presentation"
                    >
                        <a
                            href={visual.planHref}
                            onClick={onSlidePlanLinkClick}
                            aria-label={planLinkAria}
                            className="block touch-manipulation outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
                        >
                            <HeroSlidesCrossfade
                                activeIndex={index}
                                variant="mobile"
                                reducedMotion={reducedMotion}
                                figureClassName={`m-0 w-full bg-transparent ${HERO_ART_FRAME_CLASS}`}
                            />
                        </a>
                    </div>

                    {/* Stripes — active one fills brand orange */}
                    <div
                        className="mx-auto mt-4 flex w-full max-w-md gap-1.5 sm:mt-5 sm:gap-2 lg:mx-0"
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
                                className={`h-1.5 min-h-[6px] flex-1 touch-manipulation rounded-full border-0 shadow-inner outline-none transition-colors duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 sm:h-2 ${
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
                            className={heroCtaPrimaryClass}
                        >
                            <Globe className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" aria-hidden />
                            {t('marketing.home_travel_esim')}
                        </a>
                        <div className="mt-2 grid grid-cols-3 items-stretch gap-1.5 sm:mt-2.5 sm:gap-2">
                            <a
                                href={amazonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={heroCtaSecondaryClass}
                                aria-label={t('marketing.buy_sim_card_aria')}
                            >
                                <ShoppingCart className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                                {t('marketing.hero_cta_buy_sim')}
                            </a>
                            <a href={activatePath} onClick={onActivateClick} className={heroCtaSecondaryClass}>
                                <BadgeCheck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                                {t('marketing.hero_cta_activate_sim')}
                            </a>
                            <a href="/top-up" className={heroCtaSecondaryClass}>
                                <Coins className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                                {t('marketing.hero_cta_topup_sim')}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Desktop: fixed-height crossfade + bottom-left captions; frame via sticky wrapper. */}
                <div className="relative hidden w-full min-w-0 lg:block">
                    <div className={`sticky top-[4.25rem] w-full bg-transparent ${HERO_ART_FRAME_CLASS}`}>
                        <a
                            href={visual.planHref}
                            aria-label={planLinkAria}
                            className="block w-full outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-4"
                        >
                            <HeroSlidesCrossfade
                                activeIndex={index}
                                variant="desktop"
                                reducedMotion={reducedMotion}
                                figureClassName="m-0 w-full"
                            />
                        </a>
                    </div>
                </div>
            </div>

            {/* Full-width trust row on lg+ (mobile shows strip above hero image inside the carousel column). */}
            <HeroTrustStrip className="mt-5 hidden px-2 sm:mt-6 lg:flex xl:mt-7" />
        </div>
    );
}
