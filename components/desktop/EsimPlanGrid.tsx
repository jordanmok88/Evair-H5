/**
 * EsimPlanGrid — desktop plan grid for `/travel-esim/{country}`.
 *
 * Fetches the live catalogue scoped to a single ISO-2 country (same
 * source the H5 shop uses — `dataService.fetchPackages({ locationCode })`)
 * and renders large, readable cards with the plan's data, validity, and
 * USD price.
 *
 * Why the desktop page calls `fetchPackages` directly instead of letting
 * the customer cross into the H5 shop:
 *   - Desktop visitors land on `/travel-esim/jp` already with intent to
 *     buy — making them "click through to the store" loses ~30% per
 *     funnel step (Airalo's published numbers).
 *   - Live prices ALWAYS — the marketing `priceFromUsd` anchor in
 *     `data/travelEsimCountries.ts` is curated quarterly and drifts
 *     from the supplier feed.
 *   - Single source of truth — same backstage catalogue as the H5
 *     shop, so the price the customer sees here matches the price they
 *     would have seen in the app.
 *
 * On mobile the parent (`TravelEsimPage`) routes around this component
 * entirely — narrow viewports get redirected to `/app/travel-esim/{iso2}`
 * so the H5 phone-mock owns the mobile checkout.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Wifi, Calendar, Zap, ArrowRight, Inbox } from 'lucide-react';
import {
    fetchPackages,
    formatVolume,
    packagePriceUsd,
} from '../../services/dataService';
import type { EsimPackage } from '../../types';

interface EsimPlanGridProps {
    /** ISO-2 country code (e.g. "jp", "us"). Lower or upper case both fine. */
    countryCode: string;
    /** Marketing display name (e.g. "Japan") — used for empty / error copy. */
    countryName: string;
    /** Click handler. Parent is responsible for the next step (login / drawer). */
    onSelect: (pkg: EsimPackage) => void;
}

const EsimPlanGrid: React.FC<EsimPlanGridProps> = ({ countryCode, countryName, onSelect }) => {
    const [packages, setPackages] = useState<EsimPackage[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const iso = countryCode.toUpperCase();

    useEffect(() => {
        let cancelled = false;
        setPackages(null);
        setError(null);

        fetchPackages({ locationCode: iso })
            .then(rows => {
                if (cancelled) return;
                // Filter to single-country plans for THIS country. Multi-country
                // plans are surfaced on a separate `Regional bundles` row in the
                // H5 shop and are not relevant on a single-country marketing
                // page (they confuse the price comparison).
                const single = rows.filter(p => {
                    const csv = (p.location || '').split(',').map(s => s.trim()).filter(Boolean);
                    if (csv.length === 1) return csv[0].toUpperCase() === iso;
                    if (Array.isArray(p.coverageCodes) && p.coverageCodes.length === 1) {
                        return p.coverageCodes[0].toUpperCase() === iso;
                    }
                    return false;
                });
                setPackages(single);
            })
            .catch(err => {
                if (cancelled) return;
                console.error('[EsimPlanGrid] fetchPackages failed', err);
                setError('We could not load live plans right now. Please try again in a moment.');
                setPackages([]);
            });

        return () => { cancelled = true; };
    }, [iso]);

    const sorted = useMemo(() => {
        if (!packages) return [];
        return [...packages].sort((a, b) => {
            // Primary sort: volume ascending (small → big).
            if (a.volume !== b.volume) return a.volume - b.volume;
            // Tie-breaker: duration ascending.
            return a.duration - b.duration;
        });
    }, [packages]);

    if (packages === null) {
        return (
            <section className="px-4 md:px-8 py-12 max-w-5xl mx-auto" aria-busy="true">
                <SectionHeader countryName={countryName} />
                <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Loading live plans…
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
                <SectionHeader countryName={countryName} />
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900">
                    {error}
                </div>
            </section>
        );
    }

    if (sorted.length === 0) {
        return (
            <section className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
                <SectionHeader countryName={countryName} />
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                    <Inbox size={28} className="mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-700 font-semibold">
                        We don't have plans for {countryName} stocked yet.
                    </p>
                    <p className="text-slate-500 text-sm mt-1">
                        Try our regional bundles instead — many include {countryName}.
                    </p>
                    <a
                        href="/travel-esim"
                        className="inline-flex items-center gap-2 mt-4 text-orange-600 font-semibold"
                    >
                        Browse regional bundles <ArrowRight size={16} />
                    </a>
                </div>
            </section>
        );
    }

    return (
        <section className="px-4 md:px-8 py-12 md:py-16 max-w-6xl mx-auto" id="plans">
            <SectionHeader countryName={countryName} count={sorted.length} />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {sorted.map(pkg => (
                    <PlanCard key={pkg.packageCode} pkg={pkg} onSelect={onSelect} />
                ))}
            </div>

            <p className="text-xs text-slate-500 mt-6 max-w-2xl">
                Prices in USD. Plans activate on first data use and are valid for the listed
                number of days. Hotspot / personal hotspot supported. No SIM swap required.
            </p>
        </section>
    );
};

const SectionHeader: React.FC<{ countryName: string; count?: number }> = ({ countryName, count }) => (
    <header className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Choose your {countryName} eSIM plan
        </h2>
        <p className="text-slate-600 mt-2">
            {count !== undefined
                ? `${count} live plan${count === 1 ? '' : 's'} from local carriers, instant QR delivery.`
                : 'Live plans from local carriers, instant QR delivery.'}
        </p>
    </header>
);

const PlanCard: React.FC<{ pkg: EsimPackage; onSelect: (pkg: EsimPackage) => void }> = ({
    pkg,
    onSelect,
}) => {
    const priceUsd = packagePriceUsd(pkg);
    const volumeLabel = formatVolume(pkg.volume);
    const perGB = pkg.volume > 0
        ? (priceUsd / (pkg.volume / (1024 * 1024 * 1024)))
        : null;

    return (
        <button
            type="button"
            onClick={() => onSelect(pkg)}
            className="text-left bg-white border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all rounded-2xl p-5 flex flex-col group"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {pkg.name}
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">
                        {volumeLabel}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-extrabold text-orange-600">
                        ${priceUsd.toFixed(2)}
                    </div>
                    {perGB !== null && Number.isFinite(perGB) && perGB > 0 && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                            ${perGB.toFixed(2)}/GB
                        </div>
                    )}
                </div>
            </div>

            <ul className="space-y-2 text-sm text-slate-700 mb-5 flex-1">
                <li className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    {pkg.duration} {pkg.durationUnit === 'MONTH' ? 'months' : 'days'} validity
                </li>
                <li className="flex items-center gap-2">
                    <Zap size={14} className="text-slate-400" />
                    4G / 5G where available
                </li>
                <li className="flex items-center gap-2">
                    <Wifi size={14} className="text-slate-400" />
                    Personal hotspot supported
                </li>
            </ul>

            <span className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl group-hover:bg-orange-500 transition-colors">
                Choose {volumeLabel}
                <ArrowRight size={16} />
            </span>
        </button>
    );
};

export default EsimPlanGrid;
