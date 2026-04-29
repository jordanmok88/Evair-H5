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
 *   - Funnel into `/app` for the actual purchase — plan cards are now
 *     immediately after the compact hero on all device pages.
 *
 * Sections (conversion-first):
 *   1. Header
 *   2. Compact hero — speed badge, title, subtitle, throttle (honest disclosure), trust row
 *   3. Plan tiers (**primary conversion** — visible without scrolling past long prose)
 *   4. Three pillars — why Evair after price clarity
 *   5. Phone only: carrier comparison table (estimates)
 *   6. Camera / IoT: compatible devices mosaic + list
 *   7. FAQ
 *   8. Final CTA
 *   9. Footer
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

            {/* Compact hero — plans follow immediately below for conversion */}
            <section className="mx-auto max-w-6xl px-4 pb-6 pt-8 md:px-8 md:pb-8 md:pt-11">
                <div className="max-w-3xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                        <Gauge size={12} /> {content.speedHeadline}
                    </div>
                    <h1 className="mb-3 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-slate-900 md:mb-4 md:text-4xl lg:text-5xl">
                        {content.heroTitle}
                    </h1>
                    <p className="mb-4 max-w-xl text-base leading-snug text-slate-600 md:text-lg md:leading-relaxed">
                        {content.heroSubtitle}
                    </p>
                    <p className="mb-5 max-w-2xl border-l-4 border-orange-400 pl-4 text-sm leading-relaxed text-slate-700">
                        <strong className="font-semibold text-slate-800">Speed honesty:</strong> {content.throttleNote}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-500 sm:text-xs">
                        <span className="inline-flex items-center gap-1">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            No contract.
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            No hidden fees.
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            US support.
                        </span>
                    </div>
                </div>
            </section>

            {/* Plans — primary CTA */}
            <section
                id="plans"
                className="scroll-mt-28 px-4 pb-10 pt-2 md:px-8 md:pb-12 max-w-6xl mx-auto"
            >
                <h2 className="mb-2 text-center text-3xl font-extrabold md:text-4xl">Pick a plan</h2>
                <p className="mx-auto mb-8 max-w-lg text-center text-slate-600">
                    All plans renew monthly. Cancel any time, no fees.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                    {content.plans.map(plan => (
                        <div
                            key={plan.name}
                            className={`rounded-2xl p-6 border-2 ${
                                plan.highlight
                                    ? 'border-orange-500 bg-orange-50/40 shadow-xl shadow-orange-500/10'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            <div className="mb-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold">{plan.name}</span>
                                {plan.highlight && (
                                    <span className="rounded bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                        Most popular
                                    </span>
                                )}
                            </div>
                            <div className="mb-3 flex items-end gap-1">
                                <span className="text-4xl font-extrabold">${plan.priceUsd}</span>
                                <span className="mb-1 text-sm text-slate-500">/ month</span>
                            </div>
                            <p className="mb-5 text-sm leading-relaxed text-slate-600">{plan.summary}</p>
                            <a
                                href={content.ctaHref}
                                className={`block rounded-xl py-2.5 text-center font-bold ${
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

            {/* Why Evair — after shopper sees price */}
            <section className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
                <div className="grid gap-4 md:grid-cols-3">
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

            {/* Phone only: carrier comparison */}
            {content.carrierComparison && (
                <section
                    id={content.carrierComparison.sectionId}
                    className="scroll-mt-24 border-y border-slate-200 bg-slate-50 px-4 py-10 md:px-8 md:py-12"
                >
                    <div className="mx-auto max-w-6xl">
                        <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500 md:text-xs">
                            {content.carrierComparison.asOf}
                        </p>
                        <h2 className="mt-2 text-center text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
                            {content.carrierComparison.headline}
                        </h2>
                        <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-snug text-slate-600">
                            {content.carrierComparison.subhead}
                        </p>

                        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <table className="w-full min-w-[520px] border-collapse text-left text-xs md:min-w-0 md:text-sm">
                                <caption className="border-b border-slate-100 px-4 py-2.5 text-left text-xs font-medium text-slate-500 md:px-5">
                                    {content.carrierComparison.tableCaption}
                                </caption>
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-100/80">
                                        <th
                                            scope="col"
                                            className="w-[24%] px-3 py-2.5 font-semibold text-slate-800 md:px-4"
                                        >
                                            &nbsp;
                                        </th>
                                        <th
                                            scope="col"
                                            className="w-[25%] bg-orange-50 px-2 py-2.5 font-bold text-[#c2410c] md:px-3"
                                        >
                                            Evair
                                        </th>
                                        <th
                                            scope="col"
                                            className="w-[25%] px-2 py-2.5 font-semibold text-slate-800 md:px-3"
                                        >
                                            AT&amp;T <span className="block text-[10px] font-normal text-slate-500">(est.)</span>
                                        </th>
                                        <th
                                            scope="col"
                                            className="w-[26%] px-2 py-2.5 font-semibold text-slate-800 md:px-3"
                                        >
                                            Verizon <span className="block text-[10px] font-normal text-slate-500">(est.)</span>
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
                                                className="px-3 py-2.5 align-top text-xs font-medium text-slate-800 md:px-4 md:text-sm"
                                            >
                                                {row.label}
                                            </th>
                                            <td className="bg-orange-50/50 px-2 py-2.5 align-top text-slate-700 md:px-3">
                                                {row.evair}
                                            </td>
                                            <td className="px-2 py-2.5 align-top text-slate-600 md:px-3">{row.att}</td>
                                            <td className="px-2 py-2.5 align-top text-slate-600 md:px-3">
                                                {row.verizon}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {content.carrierComparison.takeaways.length > 0 && (
                            <ul className="mt-5 space-y-2 text-sm leading-relaxed text-slate-700">
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
                        )}

                        <p className="mt-4 flex gap-2 text-xs leading-relaxed text-slate-500">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            {content.carrierComparison.methodNote}
                        </p>
                    </div>
                </section>
            )}

            {/* Camera / IoT — editorial product imagery (premium stock photography) */}
            {category !== 'phone' && (
                <section
                    id="built-for"
                    className="border-t border-slate-200 bg-slate-50 px-4 py-10 md:px-8 md:py-12"
                >
                    <div className="mx-auto max-w-6xl">
                        <h2 className="mb-8 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 md:mb-10">
                            Built for
                        </h2>
                        <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 [&>li]:m-0 [&>li]:p-0">
                            {content.devices.map((d, i) => (
                                <li
                                    key={`${category}-${d.label}-${String(i)}`}
                                    className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100"
                                >
                                    {d.productPhotoUrl ? (
                                        <figure className="relative m-0 aspect-[4/5] w-full bg-slate-200 sm:aspect-[3/4]">
                                            <img
                                                src={d.productPhotoUrl}
                                                alt={d.productPhotoAlt ?? `${d.label} — illustrative product imagery`}
                                                className="h-full w-full origin-center object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                                                style={{
                                                    objectPosition:
                                                        d.productPhotoObjectPosition ?? 'center center',
                                                }}
                                                decoding="async"
                                                loading="lazy"
                                                sizes="(min-width: 1024px) 28vw, (min-width: 640px) 44vw, 92vw"
                                            />
                                            <div
                                                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/78 via-black/15 to-transparent"
                                                aria-hidden
                                            />
                                            <figcaption
                                                className="absolute inset-x-0 bottom-0 p-4"
                                                aria-hidden
                                            >
                                                <p className="text-sm font-semibold leading-snug text-white drop-shadow-sm md:text-[15px]">
                                                    {d.label}
                                                </p>
                                            </figcaption>
                                        </figure>
                                    ) : (
                                        <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 bg-white p-6 text-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                                                <d.icon className="text-orange-500" size={28} />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-800">{d.label}</p>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

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
