/**
 * EsimPlanGrid — desktop plan grid for `/travel-esim/{country}`.
 *
 * Fetches the live catalogue scoped to a single ISO-2 country (same
 * source the H5 shop uses — `dataService.fetchPackages({ locationCode })`)
 * and renders large, readable cards with the plan's data, validity, and
 * USD price.
 *
 * Presentation: validity sections (one-day prepaid hidden) stacked on one
 * scrollable page — no tabs. Breakout IP tiers show a combined premium label.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Wifi, Calendar, Zap, ArrowRight, Inbox, Radio } from 'lucide-react';
import {
    fetchPackages,
    formatVolume,
    packagePriceUsd,
} from '../../services/dataService';
import type { EsimPackage } from '../../types';
import RetailSingletonDurationRoll from '../../components/RetailSingletonDurationRoll';
import {
    bucketPlansByValidity,
    inferRetailPremiumSkuTier,
    isMostPopularRetailBucket,
    sanitizedRetailPlanMarketingName,
    segmentRetailBucketsForPresentation,
    sortRetailBucketsMostPopularFirst,
} from '../../utils/travelEsimPlanBuckets';
import { planCardNetworkLine } from '../../utils/retailPackageNetworks';

interface EsimPlanGridProps {
    /** ISO-2 country code (e.g. "jp", "us"). Lower or upper case both fine. */
    countryCode: string;
    /** Marketing display name (e.g. "Japan") — used for empty / error copy. */
    countryName: string;
    /** Click handler. Parent is responsible for the next step (login / drawer). */
    onSelect: (pkg: EsimPackage) => void;
}

const EsimPlanGrid: React.FC<EsimPlanGridProps> = ({ countryCode, countryName, onSelect }) => {
    const { t } = useTranslation();
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
                setError(t('travel_esim_grid.error_load'));
                setPackages([]);
            });

        return () => { cancelled = true; };
    }, [iso, t]);

    const buckets = useMemo(() => {
        if (!packages) return [];
        return sortRetailBucketsMostPopularFirst(bucketPlansByValidity(packages));
    }, [packages]);

    const presentationSegments = useMemo(
        () => segmentRetailBucketsForPresentation(buckets),
        [buckets],
    );

    const totalEligible = useMemo(() => buckets.reduce((a, b) => a + b.packages.length, 0), [buckets]);

    if (packages === null) {
        return (
            <section className="px-4 md:px-8 py-12 max-w-5xl mx-auto" aria-busy="true">
                <SectionHeader countryName={countryName} t={t} />
                <div className="flex items-center justify-center py-16 text-slate-500">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    {t('travel_esim_grid.loading')}
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
                <SectionHeader countryName={countryName} t={t} />
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900">
                    {error}
                </div>
            </section>
        );
    }

    if (totalEligible === 0) {
        const hasRawPlans = packages.length > 0;
        return (
            <section className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
                <SectionHeader countryName={countryName} t={t} />
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                    <Inbox size={28} className="mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-700 font-semibold">
                        {hasRawPlans
                            ? t('shop.plan_long_stay_notice')
                            : t('travel_esim_grid.empty_headline', { country: countryName })}
                    </p>
                    {!hasRawPlans && (
                        <p className="text-slate-500 text-sm mt-1">
                            {t('travel_esim_grid.empty_try_regional_other', { country: countryName })}
                        </p>
                    )}
                    <a
                        href="/travel-esim"
                        className="inline-flex items-center gap-2 mt-4 text-orange-600 font-semibold"
                    >
                        {t('travel_esim_grid.browse_regional')} <ArrowRight size={16} />
                    </a>
                </div>
            </section>
        );
    }

    const subtitlePluralKey =
        totalEligible === 1 ? 'travel_esim_grid.subtitle_live_grouped_one' : 'travel_esim_grid.subtitle_live_grouped_other';

    return (
        <section className="px-4 md:px-8 py-12 md:py-16 max-w-6xl mx-auto" id="plans">
            <SectionHeader
                countryName={countryName}
                description={t(subtitlePluralKey, { count: totalEligible })}
                t={t}
            />

            <div className="space-y-12">
                {presentationSegments.map((seg, segIdx) =>
                    seg.kind === 'multi' ? (
                    <div
                        key={`${seg.bucket.durationUnit}-${seg.bucket.duration}-multi`}
                        id={`plans-${seg.bucket.sortOrder}-${seg.bucket.durationUnit}-${seg.bucket.duration}`}
                    >
                        <div className="mb-4 pb-2 border-b border-slate-200">
                            {isMostPopularRetailBucket(seg.bucket) && (
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-orange-600 mb-1">
                                    {t('shop.plan_section_most_popular')}
                                </p>
                            )}
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                {seg.bucket.durationUnit === 'MONTH'
                                    ? t('shop.plan_duration_section_months', { months: seg.bucket.duration })
                                    : t('shop.plan_duration_section_days', { days: seg.bucket.duration })}
                                <span className="ml-2 text-sm font-semibold text-slate-400">
                                    ({seg.bucket.packages.length})
                                </span>
                            </h3>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                            {seg.bucket.packages.map(pkg => (
                                <PlanCard
                                    key={pkg.packageCode}
                                    pkg={pkg}
                                    onSelect={onSelect}
                                    t={t}
                                    className="h-full"
                                />
                            ))}
                        </div>
                    </div>
                    ) : (
                    <RetailSingletonDurationRoll
                        key={`singleton-roll-${segIdx}-${seg.buckets.map(b => `${b.durationUnit}-${b.duration}`).join('-')}`}
                        buckets={seg.buckets}
                        ariaLabel={t('travel_esim_grid.singleton_roll_aria')}
                        renderColumnHeader={bucket => (
                            <div className="pb-2 border-b border-slate-200">
                                {isMostPopularRetailBucket(bucket) && (
                                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-orange-600 mb-1">
                                        {t('shop.plan_section_most_popular')}
                                    </p>
                                )}
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                    {bucket.durationUnit === 'MONTH'
                                        ? t('shop.plan_duration_section_months', { months: bucket.duration })
                                        : t('shop.plan_duration_section_days', { days: bucket.duration })}
                                    <span className="ml-2 text-sm font-semibold text-slate-400">
                                        ({bucket.packages.length})
                                    </span>
                                </h3>
                            </div>
                        )}
                        renderCard={bucket => {
                            const pkg = bucket.packages[0];
                            return pkg ? (
                                <PlanCard key={pkg.packageCode} pkg={pkg} onSelect={onSelect} t={t} className="h-full w-full" />
                            ) : null;
                        }}
                    />
                    )
                )}
            </div>

            <p className="text-xs text-slate-500 mt-8 max-w-2xl">
                {t('travel_esim_grid.footer_disclaimer')}
            </p>
        </section>
    );
};

const SectionHeader: React.FC<{
    countryName: string;
    /** Omit for loading/error — falls back to the generic loading subtitle. */
    description?: string;
    t: ReturnType<typeof useTranslation>['t'];
}> = ({ countryName, description, t }) => (
    <header className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('travel_esim_grid.choose_plan_title', { country: countryName })}
        </h2>
        <p className="text-slate-600 mt-2">
            {description ?? t('travel_esim_grid.subtitle_loading')}
        </p>
    </header>
);

const PlanCard: React.FC<{
    pkg: EsimPackage;
    onSelect: (pkg: EsimPackage) => void;
    t: ReturnType<typeof useTranslation>['t'];
    className?: string;
}> = ({
    pkg,
    onSelect,
    t,
    className = '',
}) => {
    const tier = inferRetailPremiumSkuTier(pkg);
    const isPremium = tier !== null;
    const priceUsd = packagePriceUsd(pkg);
    const volumeLabel = formatVolume(pkg.volume);
    const displayName = sanitizedRetailPlanMarketingName(pkg);
    const perGB = pkg.volume > 0
        ? (priceUsd / (pkg.volume / (1024 * 1024 * 1024)))
        : null;
    const networkNames = planCardNetworkLine(pkg);
    const networksShown = networkNames ?? t('travel_esim_grid.plan_network_generic');

    const validityKey =
        pkg.durationUnit === 'MONTH'
            ? (pkg.duration === 1
                ? 'travel_esim_grid.validity_months_one'
                : 'travel_esim_grid.validity_months_other')
            : (pkg.duration === 1
                ? 'travel_esim_grid.validity_days_one'
                : 'travel_esim_grid.validity_days_other');

    return (
        <button
            type="button"
            onClick={() => onSelect(pkg)}
            className={`text-left bg-white border transition-all rounded-2xl p-5 flex flex-col group hover:shadow-lg
                ${isPremium
                ? 'border-amber-300 ring-2 ring-amber-100 hover:border-amber-400'
                : 'border-slate-200 hover:border-orange-300'}
                ${className}
            `}
        >
            <div className="flex items-start justify-between mb-4 gap-2">
                <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider break-words mb-1">
                        {displayName}
                    </span>
                    <div className="min-h-[26px] flex flex-wrap items-center gap-2 mb-1">
                        {tier != null ? (
                            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md leading-none inline-flex items-center">
                                {t('shop.plan_premium_tier_compact', { tier: tier.labelUpper })}
                            </span>
                        ) : null}
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">
                        {volumeLabel}
                    </div>
                </div>
                <div className="text-right shrink-0">
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
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    {t(validityKey, { count: pkg.duration })}
                </li>
                <li className="flex items-center gap-2">
                    <Zap size={14} className="text-slate-400 shrink-0" />
                    {t('travel_esim_grid.feature_speed')}
                </li>
                <li className="flex items-start gap-2">
                    <Radio size={14} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
                    <span className="leading-snug">
                        {t('travel_esim_grid.plan_network_names', { names: networksShown })}
                    </span>
                </li>
                <li className="flex items-center gap-2">
                    <Wifi size={14} className="text-slate-400 shrink-0" />
                    {t('travel_esim_grid.feature_hotspot')}
                </li>
            </ul>

            <span className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl group-hover:bg-orange-500 transition-colors">
                {t('travel_esim_grid.choose_volume', { volume: volumeLabel })}
                <ArrowRight size={16} />
            </span>
        </button>
    );
};

export default EsimPlanGrid;
