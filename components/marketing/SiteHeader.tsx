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
            <a href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900">
                <img
                    src="/evairsim-logo.png"
                    alt="EvairSIM"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-lg shadow-sm"
                />
                <span className="hidden sm:inline">EvairSIM</span>
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
            <a
                href="/app"
                className="text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
                Sign in →
            </a>
        </div>
    </header>
);

export default SiteHeader;
