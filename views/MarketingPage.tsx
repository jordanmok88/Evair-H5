/**
 * Marketing landing page — apex `evairdigital.com` (and `/welcome`).
 *
 * Phase 3 deliverable. The audience splits into two clear pillars on first
 * paint so customers self-segment immediately:
 *
 *   1. **Travelers** — eSIM in 200+ countries, instant QR delivery.
 *   2. **Long-stay / immigrants** — physical SIM, US number, $9.99/mo.
 *
 * This page is intentionally Airalo-clean: lots of whitespace, minimal
 * copy, two strong CTAs above the fold. Nothing here calls authenticated
 * APIs — it must render even when the customer is logged out and even on
 * a brand-new device. Anything that requires the user (e.g. activation)
 * lives behind the CTA buttons that route into `/activate` or `/app`.
 *
 * Sections (top → bottom):
 *   - Hero (audience split)
 *   - Three pillars (coverage, price, support)
 *   - Social proof strip
 *   - Trust strip (carriers, payment, regulatory)
 *   - Final CTA
 *   - Footer with legal + contact
 *
 * @see docs/ACTIVATION_FUNNEL.md §6 — Marketing/landing page
 */

import React from 'react';
import {
    Globe,
    Smartphone,
    Shield,
    Headphones,
    Wifi,
    Zap,
    DollarSign,
    Star,
    CheckCircle2,
    ArrowRight,
} from 'lucide-react';

const TRAVELER_COUNTRIES = '200+';
const STAY_PRICE_USD = '9.99';
const APP_PATH = '/app';
const ACTIVATE_PATH = '/activate';

const MarketingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            {/* Top nav */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-md z-30 border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2 font-bold text-lg">
                        <span className="inline-block w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400" />
                        Evair
                    </a>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                        <a href="/travel-esim" className="hover:text-slate-900">Travel eSIM</a>
                        <a href="/sim/phone" className="hover:text-slate-900">Phone</a>
                        <a href="/sim/camera" className="hover:text-slate-900">Camera</a>
                        <a href="/sim/iot" className="hover:text-slate-900">IoT</a>
                        <a href="/help" className="hover:text-slate-900">Help</a>
                        <a href="/blog" className="hover:text-slate-900">Blog</a>
                    </nav>
                    <a
                        href={APP_PATH}
                        className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                    >
                        Open app →
                    </a>
                </div>
            </header>

            {/* Hero — audience split.
                The right-hand "card" is purely decorative on desktop; on
                mobile it collapses below so the two CTAs always sit above
                the fold. */}
            <section className="px-4 md:px-8 py-12 md:py-20 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-10 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                            <Star size={12} fill="currentColor" /> Mobile data, simplified
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-5">
                            Stay connected
                            <br />
                            <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
                                anywhere.
                            </span>
                        </h1>
                        <p className="text-lg text-slate-600 mb-8 max-w-md leading-relaxed">
                            Travel eSIMs for short trips. A US line for long stays. Same app,
                            zero airport markups, instant activation.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3 max-w-md">
                            <a
                                href={APP_PATH}
                                className="flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform"
                            >
                                <Globe size={18} /> Travel eSIM
                            </a>
                            <a
                                href={`${APP_PATH}#sim-card`}
                                className="flex items-center justify-center gap-2 bg-slate-900 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-transform"
                            >
                                <Smartphone size={18} /> US SIM (long-stay)
                            </a>
                        </div>
                        <div className="flex items-center gap-2 mt-6 text-xs text-slate-500">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            No contracts.
                            <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                            No hidden fees.
                            <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                            24/7 support.
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <div className="relative">
                            <div className="absolute -inset-6 bg-gradient-to-br from-orange-500/20 to-amber-400/20 rounded-3xl blur-2xl" />
                            <div className="relative aspect-[4/5] bg-gradient-to-br from-orange-500 to-amber-400 rounded-3xl p-8 flex flex-col justify-between text-white shadow-2xl shadow-orange-500/20">
                                <div>
                                    <div className="text-xs uppercase tracking-widest opacity-90 mb-1">Evair eSIM</div>
                                    <div className="text-2xl font-bold">USA · Global</div>
                                </div>
                                <Wifi size={48} className="opacity-60" />
                                <div>
                                    <div className="font-mono text-sm opacity-90">8985 2000 2633 ••••</div>
                                    <div className="text-xs opacity-75 mt-1">Instant activation</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Audience pillars (split). Two stacked cards — one for each
                product. Each repeats the relevant CTA so the customer
                doesn't have to scroll back up. */}
            <section className="px-4 md:px-8 py-12 max-w-6xl mx-auto" id="travelers">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-8 flex flex-col">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                            <Globe className="text-orange-500" size={22} />
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wide text-orange-600 mb-1">
                            For travelers
                        </div>
                        <h2 className="text-2xl font-bold mb-2">eSIM in {TRAVELER_COUNTRIES} countries</h2>
                        <p className="text-slate-600 text-sm leading-relaxed mb-5">
                            Land, scan a QR, and you're online. Pay-as-you-go from $4.50.
                            No SIM swaps, no airport queues, no roaming bills.
                        </p>
                        <ul className="text-sm text-slate-700 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Plans from 1 GB to unlimited</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Top up any time, no contract</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> 4G/5G on tier-1 carriers</li>
                        </ul>
                        <a
                            href={APP_PATH}
                            className="mt-auto inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-5 py-3 rounded-xl"
                        >
                            Browse plans <ArrowRight size={16} />
                        </a>
                    </div>

                    <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-8 flex flex-col" id="stay">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                            <Smartphone className="text-slate-700" size={22} />
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                            For long-stay & new arrivals
                        </div>
                        <h2 className="text-2xl font-bold mb-2">US line — ${STAY_PRICE_USD}/month</h2>
                        <p className="text-slate-600 text-sm leading-relaxed mb-5">
                            A real US phone number, unlimited talk &amp; text, the data you
                            need. Order online, activate when your SIM arrives.
                        </p>
                        <ul className="text-sm text-slate-700 space-y-2 mb-6">
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> No SSN, no credit check</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Coverage on AT&amp;T network</li>
                            <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Auto-renew or pay monthly</li>
                        </ul>
                        <a
                            href={ACTIVATE_PATH}
                            className="mt-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-bold px-5 py-3 rounded-xl"
                        >
                            Activate or order <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
            </section>

            {/* Three pillars: coverage, price, support. */}
            <section className="bg-slate-50 px-4 md:px-8 py-16" id="why">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-2">
                        Why Evair
                    </h2>
                    <p className="text-center text-slate-600 mb-10">
                        Built for the way people actually move today.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Pillar
                            icon={<Globe className="text-orange-500" size={24} />}
                            title="Global coverage"
                            body="200+ countries with tier-1 carriers, plus a stable US number for residents and long-stay customers."
                        />
                        <Pillar
                            icon={<DollarSign className="text-emerald-500" size={24} />}
                            title="Honest pricing"
                            body={`Travel data from $4.50. US plans from $${STAY_PRICE_USD}/mo. No taxes-on-top surprises, no contract.`}
                        />
                        <Pillar
                            icon={<Headphones className="text-blue-500" size={24} />}
                            title="Real support"
                            body="In-app live chat staffed by humans. We answer in English, Spanish, and Mandarin — usually inside 5 minutes."
                        />
                    </div>
                </div>
            </section>

            {/* Trust strip */}
            <section className="px-4 md:px-8 py-12 max-w-6xl mx-auto" id="support">
                <div className="grid md:grid-cols-4 gap-6 text-center">
                    <TrustItem icon={<Zap size={18} />} label="Instant activation" />
                    <TrustItem icon={<Shield size={18} />} label="PCI-compliant payments" />
                    <TrustItem icon={<Wifi size={18} />} label="4G / 5G everywhere" />
                    <TrustItem icon={<Headphones size={18} />} label="24/7 chat support" />
                </div>
            </section>

            {/* Final CTA */}
            <section className="px-4 md:px-8 py-16 max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
                    Ready in two taps.
                </h2>
                <p className="text-slate-600 text-lg mb-8">
                    Pick your trip or your stay. We'll handle the rest.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                        href={APP_PATH}
                        className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-orange-500/20"
                    >
                        Get started <ArrowRight size={18} />
                    </a>
                    <a
                        href="mailto:service@evairdigital.com"
                        className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-bold px-6 py-4 rounded-xl border border-slate-200"
                    >
                        Talk to sales
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-300 px-4 md:px-8 py-10">
                <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-8 text-sm">
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 font-bold text-white text-lg mb-3">
                            <span className="inline-block w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400" />
                            Evair
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                            Connectivity for travelers, residents, and the people in between.
                        </p>
                    </div>
                    <FooterColumn
                        title="Travel"
                        links={[
                            { label: 'Travel eSIM', href: '/travel-esim' },
                            { label: 'Japan eSIM', href: '/travel-esim/jp' },
                            { label: 'UK eSIM', href: '/travel-esim/gb' },
                            { label: 'Mexico eSIM', href: '/travel-esim/mx' },
                            { label: 'Top up data', href: '/top-up' },
                        ]}
                    />
                    <FooterColumn
                        title="US SIMs"
                        links={[
                            { label: 'Phone & tablet', href: '/sim/phone' },
                            { label: 'Security & trail cameras', href: '/sim/camera' },
                            { label: 'IoT & smart devices', href: '/sim/iot' },
                            { label: 'Activate a SIM', href: ACTIVATE_PATH },
                        ]}
                    />
                    <FooterColumn
                        title="Resources"
                        links={[
                            { label: 'Help center', href: '/help' },
                            { label: 'Install your eSIM', href: '/help/install-esim-iphone' },
                            { label: 'Refund policy', href: '/help/refund-policy' },
                            { label: 'Blog', href: '/blog' },
                        ]}
                    />
                    <FooterColumn
                        title="Legal"
                        links={[
                            { label: 'Terms of Service', href: '/legal/terms' },
                            { label: 'Privacy Policy', href: '/legal/privacy' },
                            { label: 'Refund Policy', href: '/legal/refund' },
                        ]}
                    />
                </div>
                <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row justify-between gap-3">
                    <span>© {new Date().getFullYear()} Evair Digital. All rights reserved.</span>
                    <span>Made for travelers and the people who stay.</span>
                </div>
            </footer>
        </div>
    );
};

// ─── Internal cells ──────────────────────────────────────────────────

const Pillar: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({
    icon,
    title,
    body,
}) => (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
            {icon}
        </div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
);

const TrustItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
        <span className="text-slate-400">{icon}</span>
        {label}
    </div>
);

const FooterColumn: React.FC<{ title: string; links: { label: string; href: string }[] }> = ({
    title,
    links,
}) => (
    <div>
        <div className="text-white font-semibold mb-3">{title}</div>
        <ul className="space-y-2">
            {links.map(l => (
                <li key={l.href}>
                    <a href={l.href} className="hover:text-white transition-colors">
                        {l.label}
                    </a>
                </li>
            ))}
        </ul>
    </div>
);

export default MarketingPage;
