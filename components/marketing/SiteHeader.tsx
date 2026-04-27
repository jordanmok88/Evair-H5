/**
 * SiteHeader — single nav used across every public-facing surface
 * (DeviceLandingPage, TravelEsimPage, HelpCenterPage, BlogPage,
 * MarketingPage). Adding a new top-level link means editing this
 * file once.
 *
 * Active-section highlight is driven by `active` (a stable key) so
 * pages don't have to reason about pathname matching themselves.
 *
 * Visual style is the same sticky / blurred 64-px chrome we used on
 * MarketingPage — kept generic enough that the active-section pages
 * can layer their own CTA buttons in the page body without colliding.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMobileSignInGate } from '../../hooks/useMobileSignInGate';
import MobileOnlyNotice from './MobileOnlyNotice';
import { OpenAppHeaderButton } from './OpenAppHeaderButton';

export type SiteSection =
    | 'phone'
    | 'camera'
    | 'iot'
    | 'travel'
    | 'help'
    | 'blog'
    | null;

interface SiteHeaderProps {
    /** Highlight the matching nav item; pass `null` for the apex. */
    active?: SiteSection;
}

const NAV_ITEMS: { key: Exclude<SiteSection, null>; href: string }[] = [
    { key: 'phone', href: '/sim/phone' },
    { key: 'camera', href: '/sim/camera' },
    { key: 'iot', href: '/sim/iot' },
    { key: 'travel', href: '/travel-esim' },
    { key: 'help', href: '/help' },
    { key: 'blog', href: '/blog' },
];

const STATIC_NAV_LABEL: Record<Exclude<SiteSection, 'phone' | null>, string> = {
    camera: 'Camera',
    iot: 'IoT',
    travel: 'Travel eSIM',
    help: 'Help',
    blog: 'Blog',
};

const SiteHeader: React.FC<SiteHeaderProps> = ({ active = null }) => {
    const { t } = useTranslation();
    const signInGate = useMobileSignInGate('/app');
    return (
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
            <div className="mx-auto flex h-14 min-h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:min-h-16 sm:gap-3 sm:px-4 md:px-8">
                {/* Official EvairSIM wordmark — shipped at native 896×228 (≈3.93:1).
                    We render at h-8 (32 px) so the visible wordmark is ~126 px wide,
                    matching the previous icon + text layout. The wordmark is the
                    only logo treatment Marketing/Brand uses across surfaces; do
                    not pair it with an extra text label or it will read as a
                    duplicated brand name. */}
                <a href="/" className="flex min-w-0 max-w-[min(200px,52vw)] shrink items-center" aria-label="EvairSIM home">
                    <img
                        src="/evairsim-wordmark.png"
                        alt="EvairSIM"
                        width={896}
                        height={228}
                        className="h-7 w-auto max-h-9 sm:h-8 sm:max-h-10 md:h-9"
                    />
                </a>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                    {NAV_ITEMS.map(item => (
                        <a
                            key={item.key}
                            href={item.href}
                            className={
                                active === item.key
                                    ? 'text-orange-600 font-semibold'
                                    : 'hover:text-slate-900'
                            }
                        >
                            {item.key === 'phone' ? t('marketing.nav_mobile') : STATIC_NAV_LABEL[item.key]}
                        </a>
                    ))}
                </nav>
                <OpenAppHeaderButton href="/app" onClick={signInGate.gateClick} />
            </div>

            <MobileOnlyNotice
                open={signInGate.open}
                onClose={signInGate.onClose}
                onContinueAnyway={signInGate.onContinueAnyway}
            />
        </header>
    );
};

export default SiteHeader;
