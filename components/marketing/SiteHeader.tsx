/**
 * SiteHeader — single nav used across every public-facing surface
 * (DeviceLandingPage, TravelEsimPage, HelpCenterPage, BlogPage,
 * MarketingPage). Routes + order live in `siteNavConfig.ts` with the
 * apex marketing page header.
 *
 * Active-section highlight is driven by `active` (a stable key) so
 * pages don't have to reason about pathname matching themselves.
 *
 * Narrow viewports get a collapsible sheet — desktop nav stays in the
 * top row (`md:` and up).
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import type { MobileSignInGate } from '../../hooks/useMobileSignInGate';
import { useMobileSignInGate } from '../../hooks/useMobileSignInGate';
import MobileOnlyNotice from './MobileOnlyNotice';
import { OpenAppHeaderButton } from './OpenAppHeaderButton';
import SiteHeaderAccountActions from './SiteHeaderAccountActions';
import { MARKETING_NAV_ITEMS, type MarketingNavKey } from './siteNavConfig';

export type SiteSection = MarketingNavKey | null;

interface SiteHeaderProps {
    /** Highlight the matching nav item; pass `null` for the apex. */
    active?: SiteSection;
    /**
     * When set (apex marketing shares the hero QR gate), `OPEN APP` + notice use this controller;
     * otherwise `SiteHeader` uses its own {@link useMobileSignInGate}.
     */
    gate?: MobileSignInGate;
}

const SiteHeader: React.FC<SiteHeaderProps> = ({ active = null, gate: gateProp }) => {
    const { t } = useTranslation();
    const internalGate = useMobileSignInGate('/app');
    const signInGate = gateProp ?? internalGate;
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const collapse = () => {
            if (mq.matches) setMobileOpen(false);
        };
        collapse();
        mq.addEventListener('change', collapse);
        return () => mq.removeEventListener('change', collapse);
    }, []);

    useEffect(() => {
        if (!mobileOpen) return;
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileOpen(false);
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [mobileOpen]);

    const linkCls = (isActive: boolean) =>
        isActive
            ? 'py-3 text-base font-semibold text-orange-600 border-b border-orange-100 last:border-b-0'
            : 'py-3 text-base font-semibold text-slate-800 hover:text-slate-950 border-b border-slate-100 last:border-b-0';

    return (
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
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
                <nav
                    aria-label="Main"
                    className="hidden flex-wrap justify-end md:flex md:items-center md:gap-x-4 md:gap-y-2 lg:gap-x-6 xl:gap-x-7"
                >
                    {MARKETING_NAV_ITEMS.map(item => (
                        <a
                            key={item.key}
                            href={item.href}
                            className={
                                active === item.key
                                    ? 'text-[0.8125rem] font-semibold text-orange-600 transition-colors sm:text-[0.875rem] lg:text-[0.9375rem] xl:text-base'
                                    : 'text-[0.8125rem] font-semibold text-slate-700 transition-colors hover:text-slate-900 sm:text-[0.875rem] lg:text-[0.9375rem] xl:text-base'
                            }
                        >
                            {t(item.labelKey)}
                        </a>
                    ))}
                </nav>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        className="inline-flex md:hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        aria-expanded={mobileOpen}
                        aria-controls="site-mobile-nav"
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        onClick={() => setMobileOpen(v => !v)}
                    >
                        {mobileOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
                    </button>
                    <SiteHeaderAccountActions />
                    <OpenAppHeaderButton href="/app" onClick={signInGate.gateClick} />
                </div>
            </div>

            {mobileOpen && (
                <nav
                    id="site-mobile-nav"
                    aria-label="Mobile main"
                    className="border-t border-slate-100 bg-white/98 px-4 pb-4 pt-2 shadow-inner md:hidden"
                >
                    {MARKETING_NAV_ITEMS.map(item => (
                        <a
                            key={item.key}
                            href={item.href}
                            className={linkCls(active === item.key)}
                            onClick={() => setMobileOpen(false)}
                        >
                            {t(item.labelKey)}
                        </a>
                    ))}
                </nav>
            )}

            <MobileOnlyNotice
                open={signInGate.open}
                onClose={signInGate.onClose}
                onContinueAnyway={signInGate.onContinueAnyway}
            />
        </header>
    );
};

export default SiteHeader;
