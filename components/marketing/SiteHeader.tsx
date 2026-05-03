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
 * mobile viewports omit the old hamburger drawer to keep the bar from
 * feeling crowded; visitors use in-page CTAs, footer links, and OPEN APP.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MobileSignInGate } from '../../hooks/useMobileSignInGate';
import { useMobileSignInGate } from '../../hooks/useMobileSignInGate';
import MobileOnlyNotice from './MobileOnlyNotice';
import { OpenAppHeaderButton } from './OpenAppHeaderButton';
import AppShellLiveChatButton from '../AppShellLiveChatButton';
import SiteHeaderAccountActions from './SiteHeaderAccountActions';
import { MARKETING_NAV_ITEMS, type MarketingNavKey } from './siteNavConfig';
import { EVAIR_OPEN_MARKETING_CONTACT_EVENT } from '../../utils/evairMarketingEvents';

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
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <AppShellLiveChatButton
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent(EVAIR_OPEN_MARKETING_CONTACT_EVENT));
                        }}
                        className="relative flex max-w-[min(100vw-12rem,9rem)] shrink-0 items-center gap-0.5 overflow-hidden rounded-full bg-gradient-to-r from-[#FF6600] to-[#FF8A3D] px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm active:scale-[0.98] transition-transform sm:max-w-none sm:gap-1 sm:px-3 sm:py-2 sm:text-[11px]"
                    />
                    <SiteHeaderAccountActions />
                    <OpenAppHeaderButton href="/app" onClick={signInGate.gateClick} />
                </div>
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
