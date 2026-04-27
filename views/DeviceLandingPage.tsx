/**
 * DeviceLandingPage — Phase 2 SEO acquisition surface.
 *
 * Single component renders all three device-category landing pages
 * (`/sim/phone`, `/sim/camera`, `/sim/iot`). Content is driven from
 * `data/deviceLandings.ts`, this file is presentation only.
 *
 * Audience: Google searchers (e.g. "best SIM card for SPYPOINT
 * camera"). The page must:
 *   - Render the speed cap and throttle behaviour above the fold
 *     (Jordan's brand principle: honest pricing → fewer refunds).
 *   - Be readable when JS is slow / fonts haven't loaded — no
 *     animation gating, no API calls.
 *   - Funnel into `/app` for the actual purchase. We don't try to
 *     close the sale on the SEO page itself.
 *
 * Sections:
 *   1. Header (apex Evair logo + back to marketing site)
 *   2. Hero (title + subtitle + speed badge + CTA)
 *   3. Compatible devices
 *   4. Three pillars
 *   5. Plan tiers
 *   6. FAQ
 *   7. Final CTA
 *   8. Footer (shared with MarketingPage in spirit)
 *
 * @see data/deviceLandings.ts
 * @see docs/EVAIRSIM_ROADMAP_ZH.md §四 — Phase 2
 */

import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Gauge, Info } from 'lucide-react';
import { DEVICE_CONTENT } from '../data/deviceLandings';
import type { DeviceCategory } from '../utils/routing';
import SiteHeader from '../components/marketing/SiteHeader';
import SiteFooter from '../components/marketing/SiteFooter';
import { applyPageSeo } from '../utils/seoHead';

interface DeviceLandingPageProps {
    category: DeviceCategory;
}

const DeviceLandingPage: React.FC<DeviceLandingPageProps> = ({ category }) => {
    const content = DEVICE_CONTENT[category];
    const compareHref = content.carrierComparison ? `#${content.carrierComparison.sectionId}` : '/welcome';

    // Set tab title + meta description from JS for now. When we move to
    // a real SSR/SSG setup these become server-rendered <head> tags;
    // until then JS-set values are still indexed by Google after
    // hydration (Bing too, since 2024).
    useEffect(() => {
        const path = `/sim/${category}`;
        applyPageSeo({
            path,
            title: `${content.heroTitle} — Evair`,
            description: content.heroSubtitle,
        });
    }, [category, content]);

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <SiteHeader active={category} />

            {/* Hero */}
            <section className="px-4 md:px-8 py-12 md:py-20 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-10 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                            <Gauge size={12} /> {content.speedHeadline}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-5">
                            {content.heroTitle}
                        </h1>
                        <p className="text-lg text-slate-600 mb-6 max-w-xl leading-relaxed">
                            {content.heroSubtitle}
                        </p>
                        <p className="text-sm text-slate-500 mb-8 max-w-xl leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <strong className="text-slate-700">Speed honesty:</strong>{' '}
                            {content.throttleNote}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <a
                                href={content.ctaHref}
                                className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform"
                            >
                                {content.ctaLabel} <ArrowRight size={18} />
                            </a>
                            <a
                                href={compareHref}
                                className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold px-5 py-3 rounded-xl border border-slate-300"
                            >
                                {content.carrierComparison ? 'See price vs. big 3' : 'Compare all plans'}
                            </a>
                        </div>
                        <div className="flex items-center gap-2 mt-6 text-xs text-slate-500">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            No contract.
                            <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                            No hidden fees.
                            <CheckCircle2 size={14} className="text-emerald-500 ml-2" />
                            US support.
                        </div>
                    </div>

                    {/* Decorative device mosaic — purely visual */}
                    <div className="hidden md:block">
                        <div className="grid grid-cols-3 gap-3">
                            {content.devices.slice(0, 9).map((d, i) => (
                                <div
                                    key={`${d.label}-${i}`}
                                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600 ${
                                        i === 4
                                            ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20'
                                            : 'bg-slate-50 border border-slate-200'
                                    }`}
                                >
                                    <d.icon size={26} />
                                    <span className="text-[11px] font-semibold text-center px-1">
                                        {d.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Phone only: Evair vs AT&T / Verizon / T‑Mobile (estimates + disclaimers) */}
            {content.carrierComparison && (
                <section
                    id={content.carrierComparison.sectionId}
                    className="scroll-mt-24 border-y border-slate-200 bg-slate-50 px-4 py-12 md:px-8 md:py-16"
                >
                    <div className="mx-auto max-w-6xl">
                        <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
                            {content.carrierComparison.asOf}
                        </p>
                        <h2 className="mt-3 text-center text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                            {content.carrierComparison.headline}
                        </h2>
                        <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-relaxed text-slate-600 md:text-base">
                            {content.carrierComparison.subhead}
                        </p>

                        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full min-w-[640px] border-collapse text-left text-xs md:min-w-0 md:text-sm">
                                <caption className="border-b border-slate-100 px-4 py-3 text-left text-xs font-semibold text-slate-600 md:px-6">
                                    {content.carrierComparison.tableCaption}
                                </caption>
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-100/80">
                                        <th
                                            scope="col"
                                            className="w-[18%] px-3 py-3 font-semibold text-slate-800 md:px-4"
                                        >
                                            Feature
                                        </th>
                                        <th
                                            scope="col"
                                            className="w-[20.5%] bg-orange-50 px-2 py-3 font-bold text-[#c2410c] md:px-3"
                                        >
                                            Evair
                                        </th>
                                        <th scope="col" className="w-[20.5%] px-2 py-3 font-semibold text-slate-800 md:px-3">
                                            AT&amp;T <span className="block text-[10px] font-normal text-slate-500">(est.)</span>
                                        </th>
                                        <th scope="col" className="w-[20.5%] px-2 py-3 font-semibold text-slate-800 md:px-3">
                                            Verizon <span className="block text-[10px] font-normal text-slate-500">(est.)</span>
                                        </th>
                                        <th scope="col" className="w-[20.5%] px-2 py-3 font-semibold text-slate-800 md:px-3">
                                            T‑Mobile <span className="block text-[10px] font-normal text-slate-500">(est.)</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {content.carrierComparison.rows.map((row) => (
                                        <tr
                                            key={row.label}
                                            className="border-b border-slate-100 last:border-b-0"
                                        >
                                            <th
                                                scope="row"
                                                className="px-3 py-3 align-top font-medium text-slate-800 md:px-4"
                                            >
                                                {row.label}
                                            </th>
                                            <td className="bg-orange-50/50 px-2 py-3 align-top text-slate-700 md:px-3">
                                                {row.evair}
                                            </td>
                                            <td className="px-2 py-3 align-top text-slate-600 md:px-3">{row.att}</td>
                                            <td className="px-2 py-3 align-top text-slate-600 md:px-3">
                                                {row.verizon}
                                            </td>
                                            <td className="px-2 py-3 align-top text-slate-600 md:px-3">
                                                {row.tMobile}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="mt-6 space-y-2 text-sm leading-relaxed text-slate-700">
                            {content.carrierComparison.takeaways.map((t, i) => (
                                <li key={`takeaway-${i}`} className="flex gap-2">
                                    <CheckCircle2
                                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                                        aria-hidden
                                    />
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600 shadow-sm">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                            <p>{content.carrierComparison.methodNote}</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Compatible devices strip — mobile shows the same data the
                hero mosaic shows on desktop, so nothing is hidden */}
            <section className="md:hidden px-4 py-8 bg-slate-50">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Built for
                </h2>
                <div className="grid grid-cols-2 gap-2">
                    {content.devices.map(d => (
                        <div
                            key={d.label}
                            className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2"
                        >
                            <d.icon size={16} className="text-slate-500" />
                            <span className="text-sm text-slate-700">{d.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pillars — phone: gradient rail + inline icon; others: original cards */}
            <section className="px-4 md:px-8 py-12 md:py-16 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-3 gap-4">
                    {content.pillars.map(p =>
                        category === 'phone' ? (
                            <div
                                key={p.title}
                                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div
                                    className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300"
                                    aria-hidden
                                />
                                <h3 className="mb-1.5 flex items-center gap-2 pt-0.5 text-lg font-bold text-slate-900">
                                    <p.icon size={20} className="shrink-0 text-[#F27420]" />
                                    {p.title}
                                </h3>
                                <p className="text-sm leading-relaxed text-slate-600">{p.body}</p>
                            </div>
                        ) : (
                            <div
                                key={p.title}
                                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                            >
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
                                    <p.icon size={22} className="text-orange-500" />
                                </div>
                                <h3 className="mb-1 text-lg font-bold">{p.title}</h3>
                                <p className="text-sm leading-relaxed text-slate-600">{p.body}</p>
                            </div>
                        ),
                    )}
                </div>
            </section>

            {/* Plans */}
            <section className="px-4 md:px-8 py-12 max-w-6xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-2">
                    Pick a plan
                </h2>
                <p className="text-center text-slate-600 mb-8">
                    All plans renew monthly. Cancel any time, no fees.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                    {content.plans.map(plan => (
                        <div
                            key={plan.name}
                            className={`rounded-2xl p-6 border-2 ${
                                plan.highlight
                                    ? 'border-orange-500 bg-orange-50/40 shadow-xl shadow-orange-500/10'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-2xl font-bold">{plan.name}</span>
                                {plan.highlight && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white px-2 py-0.5 rounded">
                                        Most popular
                                    </span>
                                )}
                            </div>
                            <div className="flex items-end gap-1 mb-3">
                                <span className="text-4xl font-extrabold">${plan.priceUsd}</span>
                                <span className="text-slate-500 mb-1 text-sm">/ month</span>
                            </div>
                            <p className="text-slate-600 text-sm mb-5 leading-relaxed">
                                {plan.summary}
                            </p>
                            <a
                                href={content.ctaHref}
                                className={`block text-center font-bold py-2.5 rounded-xl ${
                                    plan.highlight
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-900 text-white'
                                }`}
                            >
                                Get {plan.name}
                            </a>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section className="px-4 md:px-8 py-12 md:py-16 bg-slate-50">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8">
                        Common questions
                    </h2>
                    <div className="space-y-3">
                        {content.faq.map(item => (
                            <details
                                key={item.q}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden group"
                            >
                                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-slate-900 flex items-center justify-between">
                                    {item.q}
                                    <span className="text-slate-400 group-open:rotate-180 transition-transform">
                                        ▾
                                    </span>
                                </summary>
                                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
                                    {item.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="px-4 md:px-8 py-12 md:py-16 max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
                    Ready when you are.
                </h2>
                <p className="text-slate-600 mb-6">
                    Activate in minutes. No contract, no hidden fees.
                </p>
                <a
                    href={content.ctaHref}
                    className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-orange-500/20"
                >
                    {content.ctaLabel} <ArrowRight size={18} />
                </a>
            </section>

            <SiteFooter />
        </div>
    );
};

export default DeviceLandingPage;
