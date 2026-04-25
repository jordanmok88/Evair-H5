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

const NAV_ITEMS: { key: Exclude<SiteSection, null>; label: string; href: string }[] = [
    { key: 'phone', label: 'Phone', href: '/sim/phone' },
    { key: 'camera', label: 'Camera', href: '/sim/camera' },
    { key: 'iot', label: 'IoT', href: '/sim/iot' },
    { key: 'travel', label: 'Travel eSIM', href: '/travel-esim' },
    { key: 'help', label: 'Help', href: '/help' },
    { key: 'blog', label: 'Blog', href: '/blog' },
];

const SiteHeader: React.FC<SiteHeaderProps> = ({ active = null }) => (
    <header className="sticky top-0 bg-white/90 backdrop-blur-md z-30 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            {/* Official EvairSIM wordmark — shipped at native 896×228 (≈3.93:1).
                We render at h-8 (32 px) so the visible wordmark is ~126 px wide,
                matching the previous icon + text layout. The wordmark is the
                only logo treatment Marketing/Brand uses across surfaces; do
                not pair it with an extra text label or it will read as a
                duplicated brand name. */}
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
                        {item.label}
                    </a>
                ))}
            </nav>
            {/* Sign-in CTA.
                Labelled "Mobile Sign in" so desktop visitors aren't
                surprised when the destination is a mobile-shaped UI:
                /app still renders the iPhone-style mock for every
                tab except eSIM (which is the public store and is
                full-width). The href stays `/app` regardless of
                device — there is only one customer-app surface. */}
            <a
                href="/app"
                className="text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
                Mobile Sign in →
            </a>
        </div>
    </header>
);

export default SiteHeader;
