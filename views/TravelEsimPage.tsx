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
 *      verifies the session, calls `orderEsim`, fires off the
 *      Resend email, and we render `<DesktopEsimSuccess>` in place
 *      of the marketing content.
 *
 * Mobile path is unchanged: every CTA on the page funnels narrow-
 * viewport visitors to `/app/travel-esim/{iso2}` so the H5 phone
 * mock owns the mobile checkout. The plan grid itself never opens
 * the desktop drawer for a mobile click — defence in depth lives
 * inside the grid + drawer themselves.
 *
 * @see data/travelEsimCountries.ts
 * @see hooks/useEsimCheckoutFlow.ts
 * @see components/desktop/EsimPlanGrid.tsx
 * @see components/desktop/DesktopEsimCheckoutDrawer.tsx
 * @see components/desktop/DesktopEsimSuccess.tsx
 */

import React, { useEffect, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Globe,
    Loader2,
    QrCode,
    Wifi,
    Zap,
} from 'lucide-react';
import {
    TRAVEL_COUNTRIES,
    findCountry,
    flagEmoji,
    groupByRegion,
    type TravelCountry,
} from '../data/travelEsimCountries';
import SiteHeader from '../components/marketing/SiteHeader';
import SiteFooter from '../components/marketing/SiteFooter';
import EsimPlanGrid from '../components/desktop/EsimPlanGrid';
import DesktopEsimCheckoutDrawer from '../components/desktop/DesktopEsimCheckoutDrawer';
import DesktopEsimSuccess from '../components/desktop/DesktopEsimSuccess';
import LoginModal from './LoginModal';
import { useEsimCheckoutFlow } from '../hooks/useEsimCheckoutFlow';
import { authService } from '../services/api';
import { isMobileDevice } from '../utils/device';
import type { EsimPackage } from '../types';
import type { UserDto } from '../services/api/types';

interface TravelEsimPageProps {
    countryCode: string | null;
}

const TravelEsimPage: React.FC<TravelEsimPageProps> = ({ countryCode }) => {
    const country = countryCode ? findCountry(countryCode) : undefined;
    const flow = useEsimCheckoutFlow();

    useEffect(() => {
        if (country) {
            document.title = `${country.name} eSIM from $${country.priceFromUsd} — Evair`;
            setMetaDescription(country.blurb);
        } else {
            document.title = 'Travel eSIM in 200+ countries — Evair';
            setMetaDescription(
                'Buy a travel eSIM for your phone. Instant QR delivery, no SIM swap, works in 200+ countries.',
            );
        }
    }, [country]);

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
            {country ? (
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

    return (
        <>
            {/* Hero */}
            <section className="px-4 md:px-8 py-12 md:py-20 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-10 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                            <Globe size={12} /> {country.region}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-5">
                            <span className="mr-3 text-5xl md:text-6xl align-middle">
                                {flagEmoji(country.code)}
                            </span>
                            {country.name} eSIM
                        </h1>
                        <p className="text-lg text-slate-600 mb-6 max-w-xl leading-relaxed">
                            {country.blurb}
                        </p>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-sm text-slate-500">From</span>
                            <span className="text-4xl font-extrabold text-slate-900">
                                ${country.priceFromUsd}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <a
                                href={`/app/travel-esim/${country.code}`}
                                onClick={handleHeroCta}
                                className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform"
                            >
                                See {country.name} plans <ArrowRight size={18} />
                            </a>
                            <a
                                href="/travel-esim"
                                className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold px-5 py-3 rounded-xl border border-slate-300"
                            >
                                All countries
                            </a>
                        </div>
                        <div className="flex items-center gap-2 mt-6 text-xs text-slate-500">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            Instant QR delivery
                            <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                            No SIM swap
                            <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                            24/7 support
                        </div>
                    </div>

                    {/* Decorative carrier card */}
                    <div className="hidden md:block">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-3xl p-8 text-white shadow-2xl">
                            <div className="text-7xl mb-4">{flagEmoji(country.code)}</div>
                            <div className="text-sm uppercase tracking-wider text-slate-400 mb-2">
                                Connects to
                            </div>
                            <ul className="space-y-2">
                                {country.carriers.map(c => (
                                    <li key={c} className="flex items-center gap-2 text-sm">
                                        <Wifi size={14} className="text-emerald-400" />
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        </div>
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
                            body={`Your phone connects to ${country.carriers[0] ?? 'a local network'} the moment you land. No setup.`}
                        />
                    </div>
                </div>
            </section>

            {/* Trust strip */}
            <section className="px-4 md:px-8 py-10 max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <Trust label="Compatible iPhones" value="XS or newer" />
                    <Trust label="Compatible Androids" value="Pixel 3+ / S20+" />
                    <Trust label="Coverage" value={`${country.carriers.length} carriers`} />
                    <Trust label="Activation" value="QR scan, 1 min" />
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
                    className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-orange-500/20"
                >
                    See {country.name} plans <ArrowRight size={18} />
                </a>
            </section>

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
                className="bg-slate-900 text-white font-bold px-5 py-3 rounded-xl"
            >
                Back to plans
            </button>
            <a
                href="mailto:support@evairdigital.com"
                className="bg-white text-slate-900 font-semibold px-5 py-3 rounded-xl border border-slate-300"
            >
                Email support
            </a>
        </div>
    </section>
);

// ─── catalogue index mode ────────────────────────────────────────────

const CatalogueIndexView: React.FC = () => {
    const grouped = groupByRegion();
    const regionOrder: (keyof typeof grouped)[] = [
        'Asia',
        'Europe',
        'Americas',
        'Oceania',
        'Middle East',
        'Africa',
    ];

    return (
        <>
            <section className="px-4 md:px-8 py-12 md:py-16 max-w-6xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                    <Globe size={12} /> Travel eSIM
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-5 max-w-3xl mx-auto">
                    Stay connected in {TRAVEL_COUNTRIES.length}+ destinations
                </h1>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                    One app, one travel eSIM library, and an optional US 5G data plan
                    waiting for you when you land. Pick your country below — install
                    in minutes, connect when you arrive.
                </p>
                <a
                    href="/app#esim"
                    className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-500/20"
                >
                    Browse all plans <ArrowRight size={18} />
                </a>
            </section>

            <section className="px-4 md:px-8 pb-16 max-w-6xl mx-auto">
                {regionOrder
                    .filter(r => grouped[r]?.length)
                    .map(region => (
                        <div key={region} className="mb-10">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">{region}</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {grouped[region].map(c => (
                                    <a
                                        key={c.code}
                                        href={`/travel-esim/${c.code}`}
                                        className="bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all rounded-2xl p-4 flex items-center gap-3"
                                    >
                                        <span className="text-3xl">{flagEmoji(c.code)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-900 truncate">
                                                {c.name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                from ${c.priceFromUsd}
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-300" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
            </section>
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

const Trust: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="font-bold text-slate-900">{value}</div>
    </div>
);

function setMetaDescription(content: string): void {
    const tag = document.querySelector('meta[name="description"]');
    if (tag) {
        tag.setAttribute('content', content);
    } else {
        const m = document.createElement('meta');
        m.name = 'description';
        m.content = content;
        document.head.appendChild(m);
    }
}

export default TravelEsimPage;
