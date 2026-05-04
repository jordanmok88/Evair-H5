/**
 * TravelEsimPage — Phase 2 SEO surface AND desktop commerce surface.
 *
 * Two modes, switched by the `countryCode` prop:
 *   - `null`   → catalogue index at `/travel-esim` (all countries grouped by region)
 *   - `'jp'…`  → single-country page at `/travel-esim/jp` (etc.)
 *
 * Single-country mode is what we want Google to rank for "japan
 * esim", "esim for japan", etc. The page must:
 *   - Mention country name in <title>, <h1>, and meta description
 *   - State the carrier names + "from $X.XX" anchor above the fold
 *   - Show a live plan grid + checkout for desktop visitors
 *   - Funnel mobile visitors into `/app/travel-esim/{iso2}` for the
 *     existing H5 store (eSIM tab, country pre-selected — see
 *     `utils/appTravelPath.ts` + ShopView).
 *
 * Desktop checkout flow (added Apr 2026):
 *   1. Customer clicks a plan in `<EsimPlanGrid>`.
 *   2. If logged out → `<LoginModal>` (login or register required).
 *   3. After login → `<DesktopEsimCheckoutDrawer>` slides in, captures
 *      delivery email, redirects to Stripe Checkout with explicit
 *      `successUrl` pointing back to this same page.
 *   4. After payment → Stripe redirects back here with
 *      `?stripe_status=success&session_id=…` → `useEsimCheckoutFlow`
 *      polls `/app/orders/{id}` until the
 *      `checkout.session.completed` webhook has run
 *      `OrderProvisioningService` (esim block populated), fires off the
 *      Resend email, and we render `<DesktopEsimSuccess>` in place
 *      of the marketing content.
 *
 * Mobile path is unchanged: every CTA on the page funnels narrow-
 * viewport visitors to `/app/travel-esim/{iso2}` so the H5 phone
 * mock owns the mobile checkout. The plan grid itself never opens
 * the desktop drawer for a mobile click — defence in depth lives
 * inside the grid + drawer themselves.
 *
 * @see data/travelEsimCountries.ts — curated blurbs/carriers only; catalogue
 *   index lists every stocked country via `fetchLocationFacets()` (live API +
 *   bundled snapshot fallback — never the small static SEO subset).
 * @see hooks/useEsimCheckoutFlow.ts
 * @see components/desktop/EsimPlanGrid.tsx
 * @see components/desktop/DesktopEsimCheckoutDrawer.tsx
 * @see components/desktop/DesktopEsimSuccess.tsx
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    CircleX,
    Globe,
    Loader2,
    QrCode,
    Search,
    Wifi,
    Zap,
} from 'lucide-react';
import {
    findCountry,
    type TravelCountry,
} from '../data/travelEsimCountries';
import { CUSTOMER_SERVICE_EMAIL } from '../constants';
import { retailCarrierRowForIso } from '../utils/retailCarrierLookup';
import { fetchLocationFacetsDetailed } from '../services/dataService';
import { getContinent } from '../services/esimApi';
import type { EsimCountryGroup } from '../types';
import SiteHeader from '../components/marketing/SiteHeader';
import SiteFooter from '../components/marketing/SiteFooter';
import FlagIcon from '../components/FlagIcon';
import EsimPlanGrid from '../components/desktop/EsimPlanGrid';
import DesktopEsimCheckoutDrawer from '../components/desktop/DesktopEsimCheckoutDrawer';
import DesktopEsimSuccess from '../components/desktop/DesktopEsimSuccess';
import LoginModal from './LoginModal';
import { useEsimCheckoutFlow } from '../hooks/useEsimCheckoutFlow';
import { authService } from '../services/api';
import { isMobileDevice } from '../utils/device';
import { applyPageSeo } from '../utils/seoHead';
import type { EsimPackage } from '../types';
import type { UserDto } from '../services/api/types';
import i18n from '../i18n';
import { sortRowsForShelf } from '../utils/travelEsimCatalogRank';
import { snapRetailUsdToXDot99 } from '../services/catalogPresentation';

/** Keeps facet / API min-price hero copy on the same *.99 tier as checkout. */
function formatTravelFromUsdUsd(minUsd: number): string {
    return minUsd > 0 ? snapRetailUsdToXDot99(minUsd).toFixed(2) : '—';
}

const TravelTrustPillarsBlock: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const { t } = useTranslation();
    const pad = compact ? 'p-3 md:p-4' : 'p-5 md:p-6';
    const gridGap = compact ? 'gap-2 sm:grid-cols-3' : 'gap-4 sm:grid-cols-3';
    const cardPad = compact ? 'p-3' : 'p-4';
    const iconWrap = compact ? 'mb-1.5 h-8 w-8' : 'mb-2 h-9 w-9';
    const iconSize = compact ? 17 : 20;
    const titleCls = compact ? 'text-xs font-bold text-slate-900' : 'text-sm font-bold text-slate-900';
    const bodyCls = compact
        ? 'mt-1 text-[11px] leading-snug text-slate-600'
        : 'mt-1.5 text-xs leading-relaxed text-slate-600';

    return (
        <section
            className={`rounded-2xl border border-slate-200 bg-slate-50/60 ${compact ? 'rounded-xl' : ''} ${pad}`}
            aria-labelledby="travel-trust-heading"
        >
            <h2 id="travel-trust-heading" className="sr-only">
                {t('travel_page.trust_heading')}
            </h2>
            <div className={`grid ${gridGap}`}>
                <div className={`rounded-xl border border-slate-100 bg-white ${cardPad} text-left`}>
                    <div
                        className={`flex ${iconWrap} items-center justify-center rounded-lg bg-orange-50 text-orange-600`}
                    >
                        <Zap size={iconSize} aria-hidden />
                    </div>
                    <h3 className={titleCls}>{t('travel_page.trust_speed_title')}</h3>
                    <p className={bodyCls}>{t('travel_page.trust_speed_body')}</p>
                </div>
                <div className={`rounded-xl border border-slate-100 bg-white ${cardPad} text-left`}>
                    <div
                        className={`flex ${iconWrap} items-center justify-center rounded-lg bg-orange-50 text-orange-600`}
                    >
                        <Globe size={iconSize} aria-hidden />
                    </div>
                    <h3 className={titleCls}>{t('travel_page.trust_us_ip_title')}</h3>
                    <p className={bodyCls}>{t('travel_page.trust_us_ip_body')}</p>
                </div>
                <div className={`rounded-xl border border-slate-100 bg-white ${cardPad} text-left`}>
                    <div
                        className={`flex ${iconWrap} items-center justify-center rounded-lg bg-orange-50 text-orange-600`}
                    >
                        <Wifi size={iconSize} aria-hidden />
                    </div>
                    <h3 className={titleCls}>{t('travel_page.trust_apn_title')}</h3>
                    <p className={bodyCls}>{t('travel_page.trust_apn_body')}</p>
                </div>
            </div>
        </section>
    );
};

const TravelMiniFaqBlock: React.FC = () => {
    const { t } = useTranslation();
    const itemClass =
        'group rounded-xl border border-slate-200 bg-white px-4 py-3 open:border-orange-200 open:bg-orange-50/30';
    const summaryClass =
        'cursor-pointer list-none text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden';
    const bodyClass = 'mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-600';

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6" aria-labelledby="travel-faq-heading">
            <h2 id="travel-faq-heading" className="mb-3 text-base font-bold text-slate-900">
                {t('travel_page.faq_heading')}
            </h2>
            <div className="space-y-2">
                <details className={itemClass}>
                    <summary className={summaryClass}>{t('travel_page.faq_q1')}</summary>
                    <p className={bodyClass}>{t('travel_page.faq_a1')}</p>
                </details>
                <details className={itemClass}>
                    <summary className={summaryClass}>{t('travel_page.faq_q2')}</summary>
                    <p className={bodyClass}>
                        {t('travel_page.faq_a2_before_link')}
                        <a
                            href="/legal/refund"
                            className="font-semibold text-orange-600 underline underline-offset-2 hover:text-orange-700"
                        >
                            {t('travel_page.faq_refund_link')}
                        </a>
                        {t('travel_page.faq_a2_after_link')}
                    </p>
                </details>
                <details className={itemClass}>
                    <summary className={summaryClass}>{t('travel_page.faq_q3')}</summary>
                    <p className={bodyClass}>
                        {t('travel_page.faq_a3_before_link')}
                        <a
                            href="/help/cancel-auto-renew"
                            className="font-semibold text-orange-600 underline underline-offset-2 hover:text-orange-700"
                        >
                            {t('travel_page.faq_autorenew_link')}
                        </a>
                        {t('travel_page.faq_a3_after_link')}
                    </p>
                </details>
                <details className={itemClass}>
                    <summary className={summaryClass}>{t('travel_page.faq_q4')}</summary>
                    <p className={bodyClass}>
                        {t('travel_page.faq_a4')}{' '}
                        <a
                            href="/help/install-esim-iphone"
                            className="font-semibold text-orange-600 underline underline-offset-2 hover:text-orange-700"
                        >
                            {t('travel_page.faq_install_iphone')}
                        </a>
                        {' · '}
                        <a
                            href="/help/install-esim-android"
                            className="font-semibold text-orange-600 underline underline-offset-2 hover:text-orange-700"
                        >
                            {t('travel_page.faq_install_android')}
                        </a>
                    </p>
                </details>
                <details className={itemClass}>
                    <summary className={summaryClass}>{t('travel_page.faq_q5')}</summary>
                    <p className={bodyClass}>{t('travel_page.faq_a5')}</p>
                </details>
            </div>
        </section>
    );
};

/** Maps ISO codes to catalogue shelf headers (marketing index). */
const MIDDLE_EAST_SHELF = new Set([
    'AE', 'SA', 'QA', 'IL', 'BH', 'KW', 'OM', 'YE', 'JO', 'LB', 'IQ', 'IR', 'SY',
]);

function shelfRegionForIso2(isoLower: string): TravelCountry['region'] {
    const u = isoLower.toUpperCase();
    if (MIDDLE_EAST_SHELF.has(u)) return 'Middle East';
    const c = getContinent(u);
    if (c === 'Asia' || c === 'Europe' || c === 'Americas' || c === 'Africa' || c === 'Oceania') {
        return c;
    }
    return 'Other';
}

type ShelfRow = { code: string; name: string; priceFromUsd: string };

function buildShelfRowsSingleCountries(groups: EsimCountryGroup[]): Record<string, ShelfRow[]> {
    const out: Record<string, ShelfRow[]> = {};
    for (const g of groups) {
        if (g.isMultiRegion) continue;
        const code = g.locationCode.toLowerCase();
        const shelf = shelfRegionForIso2(code);
        const minUsd = g.minPrice ?? 0;
        const priceFromUsd = formatTravelFromUsdUsd(minUsd);
        (out[shelf] ??= []).push({ code, name: g.locationName, priceFromUsd });
    }
    for (const k of Object.keys(out)) {
        out[k] = sortRowsForShelf(k, out[k]!);
    }
    return out;
}

type DynamicCountryState =
    | { kind: 'unset' }
    | { kind: 'loading' }
    | { kind: 'ok'; country: TravelCountry }
    | { kind: 'missing' };

interface TravelEsimPageProps {
    countryCode: string | null;
}

const TravelEsimPage: React.FC<TravelEsimPageProps> = ({ countryCode }) => {
    const staticCountry = countryCode ? findCountry(countryCode) : undefined;
    const [dynamic, setDynamic] = useState<DynamicCountryState>({ kind: 'unset' });
    const flow = useEsimCheckoutFlow();

    useEffect(() => {
        if (!countryCode || staticCountry) {
            setDynamic({ kind: 'unset' });
            return;
        }
        setDynamic({ kind: 'loading' });
        let cancel = false;
        (async () => {
            try {
                const { groups: facets } = await fetchLocationFacetsDetailed(true);
                if (cancel) return;
                const g = facets.find(
                    f =>
                        !f.isMultiRegion &&
                        f.locationCode.toLowerCase() === countryCode.toLowerCase(),
                );
                if (!g) {
                    setDynamic({ kind: 'missing' });
                    return;
                }
                const code = g.locationCode.toLowerCase();
                const minP = g.minPrice ?? 0;
                const isoUpper = code.toUpperCase();
                const cm = retailCarrierRowForIso(isoUpper);
                const carriers = cm
                    ? cm.carrier.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean)
                    : [i18n.t('travel_esim_grid.plan_network_generic')];
                setDynamic({
                    kind: 'ok',
                    country: {
                        code,
                        name: g.locationName,
                        region: shelfRegionForIso2(code),
                        carriers,
                        priceFromUsd: formatTravelFromUsdUsd(minP),
                        blurb: `Data-only travel eSIM for ${g.locationName}. Pick a plan below — instant QR delivery, no SIM swap.`,
                    },
                });
            } catch {
                if (!cancel) setDynamic({ kind: 'missing' });
            }
        })();
        return () => {
            cancel = true;
        };
    }, [countryCode, staticCountry]);

    const country: TravelCountry | undefined =
        staticCountry ?? (dynamic.kind === 'ok' ? dynamic.country : undefined);

    const showDynamicLoader =
        Boolean(countryCode) &&
        !staticCountry &&
        (dynamic.kind === 'loading' || dynamic.kind === 'unset');
    const showDynamicMissing =
        Boolean(countryCode) && !staticCountry && dynamic.kind === 'missing';

    useEffect(() => {
        if (country) {
            const dollars =
                country.priceFromUsd !== '—'
                    ? ` from $${country.priceFromUsd}`
                    : '';
            applyPageSeo({
                path: `/travel-esim/${country.code}`,
                title: `${country.name} eSIM${dollars} — Evair`,
                description: country.blurb,
            });
        } else if (!countryCode) {
            applyPageSeo({
                path: '/travel-esim',
                title: 'Travel eSIM in 200+ countries — Evair',
                description:
                    'Buy a travel eSIM for your mobile. Instant QR delivery, no SIM swap, works in 200+ countries.',
            });
        }
    }, [country, countryCode]);

    // Success / verifying / provisioning takes over the whole page —
    // these states only appear after a Stripe redirect, and the
    // customer's intent is now "show me my eSIM" not "browse more".
    if (country && (flow.phase === 'verifying' || flow.phase === 'provisioning')) {
        return (
            <div className="min-h-screen bg-white text-slate-900">
                <SiteHeader active="travel" />
                <ProvisioningView phase={flow.phase} />
                <SiteFooter />
            </div>
        );
    }

    if (country && flow.phase === 'success' && flow.result) {
        return (
            <div className="min-h-screen bg-white text-slate-900">
                <SiteHeader active="travel" />
                <DesktopEsimSuccess
                    result={flow.result}
                    pending={flow.pending}
                    emailSent={flow.emailSent}
                />
                <SiteFooter />
            </div>
        );
    }

    if (country && flow.phase === 'error') {
        return (
            <div className="min-h-screen bg-white text-slate-900">
                <SiteHeader active="travel" />
                <ErrorView message={flow.error} onDismiss={flow.reset} />
                <SiteFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <SiteHeader active="travel" />
            {showDynamicLoader ? (
                <CountryFacetsLoaderView />
            ) : showDynamicMissing ? (
                <CountryNotFoundView code={countryCode!} />
            ) : country ? (
                <SingleCountryView
                    country={country}
                    showCancelledBanner={flow.phase === 'cancelled'}
                    onDismissCancelledBanner={flow.reset}
                />
            ) : (
                <CatalogueIndexView />
            )}
            <SiteFooter />
        </div>
    );
};

// ─── single country mode ─────────────────────────────────────────────

/**
 * Hero visual uses flagcdn.com — widths like w800 are not served (always 404;
 * Safari shows the blue broken-image glyph). Cascades to w640 → w320 → emoji.
 */
const HeroCountryBanner: React.FC<{ code: string; name: string }> = ({ code, name }) => {
    const iso = code.trim().toLowerCase();
    const [tier, setTier] = useState<'w640' | 'w320' | 'emoji'>('w640');

    if (tier === 'emoji') {
        const u = iso.toUpperCase();
        const glyph =
            u.length === 2 && /^[A-Z]{2}$/.test(u)
                ? String.fromCodePoint(
                      0x1f1e6 + u.charCodeAt(0)! - 65,
                      0x1f1e6 + u.charCodeAt(1)! - 65,
                  )
                : '🌐';
        return (
            <div className="flex w-full max-w-[min(620px,calc(100vw-32px))] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl px-6 py-8 shadow-xl ring-1 ring-slate-900/[0.08] md:max-w-[min(680px,46vw)] md:rounded-3xl lg:max-w-none lg:w-[min(680px,max(520px,40vw))]">
                <span className="text-7xl leading-none md:text-8xl lg:text-9xl" aria-hidden>
                    {glyph}
                </span>
                <span className="text-xs font-bold text-slate-600 md:text-sm">{name}</span>
            </div>
        );
    }

    const src =
        tier === 'w640' ? `https://flagcdn.com/w640/${iso}.png` : `https://flagcdn.com/w320/${iso}.png`;

    return (
        <div className="shrink-0 overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-900/[0.08] md:rounded-3xl">
            {/*
              Do not inset the bitmap in a tinted box (`bg-slate-100` + padding + `contain`):
              that reads as “wrong matte” framing. CDN PNGs are already the rectangular
              hoist/fly extents — size by width + h-auto preserves each country’s ratio
              edge-to-edge. Never use object-cover inside a mismatched fixed box — it crops
              wide flags (CA, …) down to center charge only.
            */}
            <img
                src={src}
                alt=""
                className="block h-auto w-[min(520px,calc(100vw-32px))] max-w-none md:w-[min(620px,max(460px,44vw))] lg:w-[min(680px,max(520px,40vw))]"
                width={640}
                height={320}
                loading="lazy"
                decoding="async"
                sizes="(min-width: 1024px) 680px, (min-width: 768px) 44vw, calc(100vw - 32px)"
                onError={() => setTier((t) => (t === 'w640' ? 'w320' : 'emoji'))}
            />
            <span className="sr-only">{name}</span>
        </div>
    );
};

interface SingleCountryViewProps {
    country: TravelCountry;
    showCancelledBanner: boolean;
    onDismissCancelledBanner: () => void;
}

const SingleCountryView: React.FC<SingleCountryViewProps> = ({
    country,
    showCancelledBanner,
    onDismissCancelledBanner,
}) => {
    // Local state owns the desktop purchase journey. Mobile customers
    // never reach these states because every CTA short-circuits to
    // `/app/travel-esim/{iso2}` via `isMobileDevice()`.
    const [selectedPkg, setSelectedPkg] = useState<EsimPackage | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    // Re-evaluated on every login transition. We start from the token
    // that authService persists in localStorage so a returning customer
    // doesn't have to log in again.
    const [isLoggedIn, setIsLoggedIn] = useState(() => authService.isLoggedIn());
    const [customerEmail, setCustomerEmail] = useState<string | undefined>(undefined);

    // The CTAs at the top of the marketing hero need to do different
    // things on mobile (deep-link H5) vs. desktop (smooth-scroll to the
    // plan grid we render below). Decision happens at click time so
    // pre-rendered SEO bots — which look like desktop — see the desktop
    // anchor, not the mobile redirect.
    const handleHeroCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isMobileDevice()) {
            // The default href already points at /app/travel-esim/{iso2}
            // so we don't preventDefault — let the browser navigate.
            return;
        }
        e.preventDefault();
        const grid = document.getElementById('plans');
        if (grid) {
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSelectPlan = (pkg: EsimPackage) => {
        if (isMobileDevice()) {
            // Defence in depth — narrow viewports go straight to H5.
            window.location.assign(`/app/travel-esim/${country.code}`);
            return;
        }
        setSelectedPkg(pkg);
        if (!isLoggedIn) {
            setLoginOpen(true);
            return;
        }
        setDrawerOpen(true);
    };

    const handleLoggedIn = (user: UserDto) => {
        setIsLoggedIn(true);
        setCustomerEmail(user.email);
        setLoginOpen(false);
        // If we got here from clicking a plan, continue straight into the
        // checkout drawer — same trip, no extra clicks.
        if (selectedPkg) setDrawerOpen(true);
    };

    const heroNetworkGeneration =
        retailCarrierRowForIso(country.code.toUpperCase())?.network?.trim() || '4G/5G';

    return (
        <>
            {/* Hero — flex (not 50/50 grid) so the flag card doesn’t leave a huge empty half-column on wide screens */}
            <section className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10 xl:max-w-6xl">
                <div className="flex flex-col-reverse items-stretch gap-6 md:flex-row md:items-start md:gap-7 lg:gap-9 xl:gap-10">
                    <div className="min-w-0 max-w-xl flex-1 md:max-w-none md:pr-2 lg:max-w-xl xl:max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 md:text-xs mb-3">
                            <Globe size={12} /> {country.region}
                        </div>
                        <h1 className="mb-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-4xl xl:text-[2.65rem]">
                            {country.name} eSIM
                        </h1>
                        <p className="mb-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                            {country.blurb}
                        </p>
                        <div className="mb-4 flex flex-wrap items-baseline gap-2 md:mb-5">
                            {country.priceFromUsd !== '—' ? (
                                <>
                                    <span className="text-sm text-slate-500">From</span>
                                    <span className="text-3xl font-extrabold text-slate-900 md:text-4xl">
                                        ${country.priceFromUsd}
                                    </span>
                                </>
                            ) : (
                                <span className="text-lg font-semibold text-slate-700 md:text-xl">
                                    See live prices below
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-6 lg:gap-x-8">
                            <div className="flex shrink-0 flex-wrap gap-2 md:gap-3">
                                <a
                                    href={`/app/travel-esim/${country.code}`}
                                    onClick={handleHeroCta}
                                    className="btn btn-primary !min-h-0 gap-2 px-4 py-2.5 text-sm active:scale-[0.98] md:px-5 md:py-3"
                                >
                                    See {country.name} plans <ArrowRight size={18} />
                                </a>
                                <a
                                    href="/travel-esim"
                                    className="btn btn-secondary !min-h-0 gap-2 px-4 py-2.5 text-sm font-semibold md:px-5 md:py-3"
                                >
                                    All countries
                                </a>
                            </div>
                            <div className="sm:max-md:border-l-0 md:mt-0.5 md:min-w-0 md:border-l md:border-slate-200 md:pl-6 lg:pl-8">
                                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 md:text-[11px]">
                                    Connects to
                                </div>
                                <ul className="max-w-[20rem] space-y-1">
                                    {country.carriers.map(carrierName => (
                                        <li
                                            key={carrierName}
                                            className="flex items-center gap-2 text-xs font-semibold text-slate-800 md:text-sm"
                                        >
                                            <Wifi size={14} className="shrink-0 text-emerald-600" aria-hidden />
                                            <span className="truncate">{carrierName}</span>
                                            <span className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-500">
                                                · {heroNetworkGeneration}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 md:text-xs">
                            <span className="inline-flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                Instant QR delivery
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                No SIM swap
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                24/7 support
                            </span>
                        </div>
                    </div>

                    <div className="flex shrink-0 justify-center md:justify-start md:pt-0">
                        <HeroCountryBanner code={country.code} name={country.name} />
                    </div>
                </div>
            </section>

            {/* Cancelled-payment notice */}
            {showCancelledBanner && (
                <div className="px-4 md:px-8 max-w-6xl mx-auto -mt-4 mb-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-semibold text-amber-900">Payment cancelled</p>
                            <p className="text-sm text-amber-800 mt-0.5">
                                No charge was made. Pick a plan again whenever you're ready.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onDismissCancelledBanner}
                            className="text-sm font-semibold text-amber-700 hover:text-amber-900"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-6 px-4 md:px-8 max-w-6xl mx-auto pb-2">
                <TravelTrustPillarsBlock />
            </div>

            {/* Live plan grid (desktop checkout entry point) */}
            <EsimPlanGrid
                countryCode={country.code}
                countryName={country.name}
                onSelect={handleSelectPlan}
            />

            {/* How it works */}
            <section className="px-4 md:px-8 py-12 md:py-16 bg-slate-50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-2">
                        Online before you leave the airport
                    </h2>
                    <p className="text-center text-slate-600 mb-10">
                        Three steps. No SIM card swap. No data roaming charges.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Step
                            num={1}
                            icon={<Globe size={22} className="text-orange-500" />}
                            title="Pick your plan"
                            body={`Choose how many GB and how many days you'll be in ${country.name}.`}
                        />
                        <Step
                            num={2}
                            icon={<QrCode size={22} className="text-orange-500" />}
                            title="Scan the QR"
                            body="Install the eSIM with a single scan. Works on any unlocked iPhone (XS+) or modern Android."
                        />
                        <Step
                            num={3}
                            icon={<Zap size={22} className="text-orange-500" />}
                            title="Land and connect"
                            body={`Your mobile connects to ${country.carriers[0] ?? 'a local network'} the moment you land. No setup.`}
                        />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="px-4 md:px-8 py-12 md:py-16 max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
                    Ready for {country.name}?
                </h2>
                <p className="text-slate-600 mb-6">
                    Buy now, install when you have Wi-Fi at home, connect when you land.
                </p>
                <a
                    href={`/app/travel-esim/${country.code}`}
                    onClick={handleHeroCta}
                    className="btn btn-primary gap-2 px-6 py-4 text-base font-bold"
                >
                    See {country.name} plans <ArrowRight size={18} />
                </a>
            </section>

            <div className="space-y-6 px-4 md:px-8 max-w-6xl mx-auto pb-12 md:pb-16">
                <TravelMiniFaqBlock />
            </div>

            {/* Modals / drawers — mounted at the section root so they
                overlay the page chrome, but only render when open. */}
            <LoginModal
                isOpen={loginOpen}
                onClose={() => setLoginOpen(false)}
                onLogin={handleLoggedIn}
            />
            <DesktopEsimCheckoutDrawer
                open={drawerOpen}
                pkg={selectedPkg}
                countryCode={country.code}
                countryName={country.name}
                customerEmail={customerEmail}
                onClose={() => setDrawerOpen(false)}
            />
        </>
    );
};

// ─── post-Stripe transient screens ───────────────────────────────────

const ProvisioningView: React.FC<{ phase: 'verifying' | 'provisioning' }> = ({ phase }) => {
    const headline =
        phase === 'verifying' ? 'Confirming your payment…' : 'Provisioning your eSIM…';
    const sub =
        phase === 'verifying'
            ? 'Talking to Stripe — this only takes a few seconds.'
            : 'Allocating an eSIM and your QR code. Please keep this tab open.';
    return (
        <section className="px-4 md:px-8 py-20 md:py-28 max-w-2xl mx-auto text-center">
            <Loader2 size={42} className="animate-spin text-orange-500 mx-auto mb-6" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
                {headline}
            </h1>
            <p className="text-slate-600">{sub}</p>
        </section>
    );
};

const ErrorView: React.FC<{ message: string | null; onDismiss: () => void }> = ({
    message,
    onDismiss,
}) => (
    <section className="px-4 md:px-8 py-20 max-w-2xl mx-auto text-center">
        <div className="inline-flex w-16 h-16 rounded-full bg-amber-50 items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-amber-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Something went wrong
        </h1>
        <p className="text-slate-600 mb-6">
            {message ?? 'Please contact support and reference your Stripe receipt.'}
        </p>
        <div className="flex justify-center gap-3">
            <button
                type="button"
                onClick={onDismiss}
                className="btn btn-neutral-dark px-5 py-3 text-sm font-bold"
            >
                Back to plans
            </button>
            <a
                href={`mailto:${CUSTOMER_SERVICE_EMAIL}`}
                className="btn btn-secondary px-5 py-3 text-sm font-semibold"
            >
                Email support
            </a>
        </div>
    </section>
);

const CountryFacetsLoaderView: React.FC = () => (
    <section className="px-4 md:px-8 py-24 md:py-32 max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
        <Loader2 size={40} className="animate-spin text-orange-500 mb-6" aria-hidden />
        <p className="text-slate-600 font-medium">Loading destination…</p>
    </section>
);

const CountryNotFoundView: React.FC<{ code: string }> = ({ code }) => (
    <section className="px-4 md:px-8 py-20 md:py-28 max-w-xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            <Globe size={12} /> Travel eSIM
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
            No plans matched “{code.toUpperCase()}”
        </h1>
        <p className="text-slate-600 mb-8">
            This code is not in our live catalogue right now. Try browsing all destinations, or open
            the app — regional bundles sometimes use a nearby popular country tile.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
            <a
                href="/travel-esim"
                className="btn btn-primary gap-2 px-5 py-3 text-sm font-bold"
            >
                Browse destinations <ArrowRight size={18} />
            </a>
            <a
                href="/app"
                className="btn btn-secondary gap-2 px-5 py-3 text-sm font-semibold"
            >
                Open the app
            </a>
        </div>
    </section>
);

// ─── catalogue index mode ────────────────────────────────────────────

/**
 * Per-region "see all" toggle.
 *
 * Each region collapses to `INITIAL_VISIBLE_PER_REGION` cards by
 * default. The toggle expands the rest *inline* — no /app redirect.
 * Earlier iterations linked "See all" to the H5 store, which forced
 * desktop users into a phone-mock view of a catalogue they were
 * trying to browse on a 27" monitor; the inline expansion keeps the
 * desktop-native browsing surface intact.
 */
const INITIAL_VISIBLE_PER_REGION = 6;

/**
 * Decorative slot-machine style counts for the catalogue hero — not real data until facets load.
 * Mixes randomized jumps with occasional “sticky” waypoint digits so it feels chaotic but readable.
 */
function rollLoadingDestinationCount(): number {
    const waypoint = (): number =>
        ([2, 3, 11, 32, 86, 110, 138, 150, 168, 175, 178])[Math.floor(Math.random() * 11)]!;
    const r = Math.random();
    if (r < 0.11) return waypoint();
    if (r < 0.23) return 1 + Math.floor(Math.random() * 12); // punchy lows
    if (r < 0.43) return 18 + Math.floor(Math.random() * 52); // 18–69
    if (r < 0.68) return 88 + Math.floor(Math.random() * 48); // 88–135
    return 140 + Math.floor(Math.random() * 60); // 140–199
}

/** Americas + Asia surface first — US outbound audience. Remaining continents follow. */
const CATALOGUE_SHELF_ORDER: TravelCountry['region'][] = [
    'Americas',
    'Asia',
    'Europe',
    'Oceania',
    'Middle East',
    'Africa',
    'Other',
];

const CatalogueIndexView: React.FC = () => {
    const [facetState, setFacetState] = useState<
        | { kind: 'loading' }
        | {
              kind: 'ready';
              grouped: Record<string, ShelfRow[]>;
              singleCountryCount: number;
              source: 'live' | 'embed';
          }
    >({ kind: 'loading' });

    useEffect(() => {
        let cancel = false;
        (async () => {
            const { groups, usedEmbeddedFallback } = await fetchLocationFacetsDetailed(true);
            if (cancel) return;
            const singles = groups.filter(f => !f.isMultiRegion);
            setFacetState({
                kind: 'ready',
                grouped: buildShelfRowsSingleCountries(singles),
                singleCountryCount: singles.length,
                source: usedEmbeddedFallback ? 'embed' : 'live',
            });
        })();
        return () => {
            cancel = true;
        };
    }, []);

    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
        () => new Set(),
    );

    const [catalogueSearch, setCatalogueSearch] = useState('');

    const toggleRegion = (region: string) => {
        setExpandedRegions(prev => {
            const next = new Set(prev);
            if (next.has(region)) next.delete(region);
            else next.add(region);
            return next;
        });
    };

    const grouped = facetState.kind === 'ready' ? facetState.grouped : {};

    const filteredGrouped = useMemo(() => {
        const q = catalogueSearch.trim().toLowerCase();
        if (!q) return grouped;
        const next: Record<string, ShelfRow[]> = {};
        for (const shelf of CATALOGUE_SHELF_ORDER) {
            const list = grouped[shelf];
            if (!list?.length) continue;
            const hit = list.filter(
                row =>
                    row.name.toLowerCase().includes(q) ||
                    row.code.toLowerCase().includes(q),
            );
            if (hit.length) next[shelf] = hit;
        }
        return next;
    }, [grouped, catalogueSearch]);

    const headlineCount =
        facetState.kind === 'ready'
            ? facetState.singleCountryCount >= 200
                ? '200+'
                : String(facetState.singleCountryCount)
            : null;

    const showHeadlineCountPlaceholder = headlineCount === null;

    /** Fun slot-machine ticker — stops as soon as `headlineCount` is known */
    const [rollickCount, setRollickCount] = useState(() => rollLoadingDestinationCount());

    useEffect(() => {
        if (!showHeadlineCountPlaceholder) return;
        let cancelled = false;
        let tid: ReturnType<typeof setTimeout> | undefined;

        const tick = () => {
            if (cancelled) return;
            setRollickCount(rollLoadingDestinationCount());
            tid = window.setTimeout(tick, 70 + Math.random() * 150);
        };

        tid = window.setTimeout(tick, 45);
        return () => {
            cancelled = true;
            if (tid !== undefined) window.clearTimeout(tid);
        };
    }, [showHeadlineCountPlaceholder]);

    return (
        <>
            <section
                aria-busy={showHeadlineCountPlaceholder}
                className="mx-auto max-w-6xl px-4 pt-6 text-center md:px-8 md:pt-8 pb-3 md:pb-4"
            >
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 md:mb-2.5 md:px-3 md:py-1 md:text-xs">
                    <Globe size={12} /> Travel eSIM
                </div>
                <h1 className="mx-auto mb-2 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:mb-3 md:text-4xl lg:text-[2.5rem]">
                    Stay connected in{' '}
                    {showHeadlineCountPlaceholder ? (
                        <>
                            <span
                                aria-hidden="true"
                                className="inline-block min-w-[3.75ch] text-center tabular-nums text-brand-orange drop-shadow-[0_1px_8px_rgba(255,102,0,0.35)]"
                            >
                                {rollickCount}
                            </span>
                            <span className="sr-only">Loading how many destinations are in the catalogue.</span>
                        </>
                    ) : (
                        <span className="inline-block min-w-[3.75ch] text-center tabular-nums text-brand-orange drop-shadow-[0_1px_8px_rgba(255,102,0,0.35)]">
                            {headlineCount}
                        </span>
                    )}{' '}
                    destinations
                </h1>
                <p className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2 text-sm leading-snug text-slate-600 md:text-base md:leading-relaxed">
                    {facetState.kind === 'loading' && (
                        <Loader2
                            size={18}
                            className="shrink-0 animate-spin text-orange-500"
                            aria-hidden
                        />
                    )}
                    <span>
                        One app, one travel eSIM library, and an optional US 5G data plan waiting for you
                        when you land. Pick your destination below — install in minutes, connect when you
                        arrive.
                    </span>
                </p>
                {facetState.kind === 'ready' && facetState.source === 'embed' && (
                    <div className="mx-auto mt-3 max-w-2xl rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5 text-left text-xs text-sky-950 md:mt-4 md:px-4 md:text-sm">
                        Full destination list loaded from cache while we reconnect — prices refresh as soon as
                        the live catalogue is reachable again.
                    </div>
                )}
            </section>

            <div className="mx-auto max-w-6xl space-y-3 px-4 pb-2 md:px-8 md:pb-3">
                <TravelTrustPillarsBlock compact />
            </div>

            <section
                id="popular-destinations"
                className="mx-auto max-w-6xl px-4 pb-12 pt-2 md:px-8 md:pb-14 md:pt-3"
            >
                {facetState.kind === 'ready' && (
                    <div className="mx-auto mb-5 max-w-xl md:mb-6">
                        <label htmlFor="travel-esim-catalogue-search" className="sr-only">
                            Search destinations
                        </label>
                        <div className="relative">
                            <Search
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                aria-hidden
                            />
                            <input
                                id="travel-esim-catalogue-search"
                                type="search"
                                enterKeyHint="search"
                                placeholder="Search by country…"
                                value={catalogueSearch}
                                onChange={e => setCatalogueSearch(e.target.value)}
                                className={`w-full rounded-xl border border-slate-200 bg-white py-3 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition ${catalogueSearch.trim() ? 'pl-10 pr-11' : 'pl-10 pr-4'}`}
                            />
                            {catalogueSearch.trim().length > 0 && (
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Clear search"
                                    onClick={() => setCatalogueSearch('')}
                                >
                                    <CircleX size={18} aria-hidden />
                                </button>
                            )}
                        </div>
                        {catalogueSearch.trim() && (
                            <p className="mt-2 text-center text-sm text-slate-500">
                                Showing matches across all regions. Clear search to browse the full catalogue by
                                region.
                            </p>
                        )}
                    </div>
                )}
                {facetState.kind === 'loading' && (
                    <div className="flex justify-center py-8 md:py-10">
                        <Loader2 size={36} className="animate-spin text-orange-500" aria-hidden />
                    </div>
                )}
                {facetState.kind === 'ready' &&
                    catalogueSearch.trim() &&
                    !CATALOGUE_SHELF_ORDER.some(s => filteredGrouped[s]?.length) && (
                        <p className="text-center text-slate-600 py-12 px-4">
                            No destinations match{' '}
                            <span className="font-semibold text-slate-900">"{catalogueSearch.trim()}"</span>.
                            Try another spelling or browse the full catalogue.
                        </p>
                    )}
                {facetState.kind === 'ready' &&
                    CATALOGUE_SHELF_ORDER.filter(r => filteredGrouped[r]?.length).map(region => {
                        const all = filteredGrouped[region]!;
                        const isExpanded = expandedRegions.has(region);
                        const showToggle = all.length > INITIAL_VISIBLE_PER_REGION;
                        const visible = isExpanded ? all : all.slice(0, INITIAL_VISIBLE_PER_REGION);
                        const hiddenCount = all.length - INITIAL_VISIBLE_PER_REGION;

                        return (
                            <div key={region} className="mb-12">
                                <div className="flex items-baseline justify-between mb-4">
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                                        {region}
                                        <span className="ml-2 text-sm font-normal text-slate-400">
                                            {all.length}{' '}
                                            {all.length === 1 ? 'destination' : 'destinations'}
                                        </span>
                                    </h3>
                                    {showToggle && (
                                        <button
                                            type="button"
                                            onClick={() => toggleRegion(region as string)}
                                            className="text-sm font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 shrink-0"
                                            aria-expanded={isExpanded}
                                            aria-controls={`region-grid-${region}`}
                                        >
                                            {isExpanded ? 'Show fewer' : `See all ${all.length}`}
                                            <ArrowRight
                                                size={14}
                                                className={`transition-transform ${
                                                    isExpanded ? 'rotate-90' : ''
                                                }`}
                                            />
                                        </button>
                                    )}
                                </div>
                                <div
                                    id={`region-grid-${region}`}
                                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                                >
                                    {visible.map(c => (
                                        <a
                                            key={c.code}
                                            href={`/travel-esim/${c.code}`}
                                            className="bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all rounded-2xl p-4 flex items-center gap-3"
                                        >
                                            <FlagIcon countryCode={c.code} size="md" className="shrink-0 shadow-sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-900 truncate">
                                                    {c.name}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {c.priceFromUsd === '—'
                                                        ? 'See plans'
                                                        : `from $${c.priceFromUsd}`}
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-300 shrink-0" />
                                        </a>
                                    ))}
                                </div>
                                {showToggle && !isExpanded && (
                                    <button
                                        type="button"
                                        onClick={() => toggleRegion(region as string)}
                                        className="mt-4 w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/40 transition-colors text-sm font-semibold"
                                        aria-expanded={isExpanded}
                                        aria-controls={`region-grid-${region}`}
                                    >
                                        See {hiddenCount} more in {region}
                                        <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
            </section>

            <div className="space-y-6 px-4 md:px-8 max-w-6xl mx-auto pb-12 md:pb-16 pt-8">
                <TravelMiniFaqBlock />
            </div>
        </>
    );
};

// ─── small cells ────────────────────────────────────────────────────

const Step: React.FC<{ num: number; icon: React.ReactNode; title: string; body: string }> = ({
    num,
    icon,
    title,
    body,
}) => (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                {icon}
            </div>
            <span className="text-xs font-bold text-slate-400">STEP {num}</span>
        </div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
);

export default TravelEsimPage;
