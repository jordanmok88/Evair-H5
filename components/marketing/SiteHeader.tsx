/**
 * SiteHeader — single nav used across every public-facing surface
 * (DeviceLandingPage, TravelEsimPage, HelpCenterPage, BlogPage,
 * MarketingPage). Routes + order live in `siteNavConfig.ts` with the
 * apex marketing page header.
 *
 * Active-section highlight is driven by `active` (a stable key) so
 * pages don't have to reason about pathname matching themselves.
 *
 * From `md:` and up, horizontal nav links appear in the header. Narrow
 * mobile viewports use one row: logo left, then OPEN APP, inbox,
 * account — live chat lives on the draggable edge tab
 * ({@link LiveChatEdgeLauncher}).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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

    const wordmark = (
        <a
            href="/"
            className="flex min-w-0 max-w-[min(38vw,152px)] shrink items-center sm:max-w-[min(200px,46vw)] md:max-w-[min(200px,52vw)]"
            aria-label="EvairSIM home"
        >
            <img
                src="/evairsim-wordmark.png"
                alt="EvairSIM"
                width={896}
                height={228}
                className="h-7 w-auto max-h-9 sm:h-8 sm:max-h-10 md:h-9"
            />
        </a>
    );

    const navDesktop = (
        <nav
            aria-label="Main"
            className="hidden shrink-0 flex-nowrap md:flex md:items-center md:justify-end md:gap-x-3 lg:gap-x-6 xl:gap-x-7"
        >
            {MARKETING_NAV_ITEMS.map((item) => (
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
    );

    /** Mobile: OPEN APP → inbox → account */
    const mobileActions = (
        <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
            <OpenAppHeaderButton href="/app" className="!px-2.5 text-[10px] sm:!px-4 sm:!text-xs" onClick={signInGate.gateClick} />
            <SiteHeaderAccountActions />
        </div>
    );

    /** Desktop (&ge; md): OPEN APP → inbox → account */
    const desktopActions = (
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <OpenAppHeaderButton href="/app" onClick={signInGate.gateClick} />
            <SiteHeaderAccountActions />
        </div>
    );

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
            <div className="mx-auto max-w-6xl">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 md:hidden">
                    {wordmark}
                    {mobileActions}
                </div>

                <div className="hidden h-14 min-h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:min-h-16 sm:gap-3 sm:px-4 md:flex md:px-8">
                    {wordmark}
                    {navDesktop}
                    {desktopActions}
                </div>
            </div>

            <MobileOnlyNotice open={signInGate.open} onClose={signInGate.onClose} onContinueAnyway={signInGate.onContinueAnyway} />
        </header>
    );
};

export default SiteHeader;
